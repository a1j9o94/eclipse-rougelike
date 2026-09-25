import { allowsRiftCannons, factionRulesMode, validRuleOptions, type GameRuleOptions } from '../shared/eclipse/gameRules';
import {syncLeaderboardResult} from './eclipseLeaderboardStore';
import {synchronizeUpkeepTimer,workerActor} from './eclipseUpkeepTimer';
import type { PublicHistoryPage } from '../shared/eclipse/history';
import {readPublicMatchHistory} from './eclipsePublicHistory';
import { v } from 'convex/values';
import { internalAction, internalQuery, internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { getFaction, factionAllowedForProfile, profileVersions, seatPieceColor } from '../shared/eclipse/catalog';
import { resolveGuest as findGuest, playerNameForGuest } from './eclipseIdentity';
import { commitCommand, getPlayerView } from '../shared/eclipse/protocol';
import { createGame } from '../shared/eclipse/setup';
import { processGameCommand } from '../shared/eclipse/engine';
import type { CommandReceipt, GameState, JournalEntry, Phase, PlayerView, ValidationError } from '../shared/eclipse/types';
import { roomAiSelections, reconcileMultiplayerTimer, timerTargetForState, type MultiplayerTimerPublic, type MultiplayerTurnTimer } from '../shared/eclipse/multiplayer';
import { internal } from './_generated/api';
import { chooseStrategicAiCommand } from '../shared/eclipse/aiSearch';
import { AI_BUDGETS, AI_VERSION, type AiDifficulty } from '../shared/eclipse/aiConfig';
import { finishTimeoutAiCommand, validateTimeoutAi, retryFailedRoomTimeout } from './eclipseRooms';
import { AI_DECISION_DELAY_MS } from '../shared/eclipse/pacing';
import { factionValidator, factionProfileValidator, pieceColorValidator, gameCommandValidator, rulesModeValidator, gameRuleOptionsValidator } from './eclipseValidators';

type ReadContext = Pick<QueryCtx, 'db'>;
async function ownedSeat(ctx: ReadContext, credential: string, matchId: Id<'eclipseMatchesV1'>): Promise<Doc<'eclipseOwnershipV1'> | null> {
  const guest = await findGuest(ctx, credential);
  if (!guest) return null;
  return ctx.db.query('eclipseOwnershipV1').withIndex('by_match_guest', q => q.eq('matchId', matchId).eq('guestId', guest._id)).unique();
}
/** Snapshot JSON is only ever produced from createGame/commitCommand inside server mutations. */
function readState(match: Doc<'eclipseMatchesV1'>): GameState {
  const state = JSON.parse(match.snapshotJson) as GameState;
  if (state.revision !== match.revision || state.rulesVersion !== match.rulesVersion || state.catalogVersion !== match.catalogVersion) throw new Error('Match snapshot metadata mismatch.');
  return state;
}

function roomTimerToken(): string {
  return Array.from({ length: 36 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

/**
 * Commit the ownership transition and its clock in one mutation. A queued
 * sync remains a harmless recovery path, but it cannot leave a new owner
 * looking at the previous owner's deadline between commands.
 */
export async function reconcileRoomTimerAfterCommand(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>, state: GameState): Promise<void> {
  if (!match.roomToken || match.rollbackPendingId) return;
  const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  if (!room || room.status !== 'playing') return;
  const current = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  if(await synchronizeUpkeepTimer(ctx,room,match,state,current,roomTimerToken))return;
  const target = timerTargetForState(state);
  if (!target) {
    if (current) await ctx.db.patch(current._id, { status: 'finished', error: null, updatedAt: Date.now() });
    await ctx.db.patch(room._id, { status: 'finished', updatedAt: Date.now() });
    return;
  }
  const targetSeat = state.seats.find(seat => seat.id === target.seatId);
  if (!targetSeat) throw new Error('Timer target has no match seat.');
  if (targetSeat.controller === 'ai') {
    if (current && room.humanSeatCount === 1) await ctx.db.delete(current._id);
    else if (current) await ctx.db.patch(current._id, { status: 'finished', targetSeatId: target.seatId, decisionId: target.decisionId, error: null, updatedAt: Date.now() });
    return;
  }
  if (room.humanSeatCount === 1) {
    if (current) await ctx.db.delete(current._id);
    return;
  }
  const actionTurnSerial = state.actionTurnSerial ?? 0;
  const previous: MultiplayerTurnTimer | null = current && current.upkeepRound===undefined && (current.actionTurnSerial ?? 0) === actionTurnSerial ? {
    token: current.token,
    deadlineAt: current.deadlineAt,
    target: { seatId: current.targetSeatId, decisionId: current.decisionId },
    status: current.status,
    error: current.error,
  } : null;
  const next = reconcileMultiplayerTimer(previous, state, Date.now(), room.timerMs, roomTimerToken);
  if (!next.timer) return;
  if (current) {
    await ctx.db.patch(current._id, { upkeepRound:undefined,upkeepSeatIds:undefined,token: next.timer.token, deadlineAt: next.timer.deadlineAt, actionTurnSerial, targetSeatId: next.timer.target.seatId, decisionId: next.timer.target.decisionId, status: next.timer.status, error: next.timer.error, timeoutSteps: next.changed ? 0 : current.timeoutSteps, updatedAt: Date.now() });
  } else {
    await ctx.db.insert('eclipseRoomTimersV1', { roomId: room._id, matchId: match._id, token: next.timer.token, deadlineAt: next.timer.deadlineAt, actionTurnSerial, targetSeatId: next.timer.target.seatId, decisionId: next.timer.target.decisionId, status: next.timer.status, error: next.timer.error, timeoutSteps: 0, updatedAt: Date.now() });
  }
  if (next.changed) await ctx.scheduler.runAfter(Math.max(0, next.timer.deadlineAt - Date.now()), internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: next.timer.token });
}
export type MatchParticipation = 'active' | 'resigned' | 'abandoned';
export type ResignationOutcome = 'resigned' | 'abandoned';
export type ResignMatchResult =
  | { ok: true; revision: number; outcome: ResignationOutcome; duplicate: boolean }
  | { ok: false; error: ValidationError };

function participation(match: Doc<'eclipseMatchesV1'>, ownership: Doc<'eclipseOwnershipV1'>): MatchParticipation {
  return ownership.resignationOutcome ?? (match.lifecycle === 'abandoned' ? 'abandoned' : 'active');
}

export interface MatchSummary {
  matchId: Id<'eclipseMatchesV1'>;
  seatId: string;
  round: number;
  phase: Phase;
  revision: number;
  playerCount: number;
  lastSeenRevision: number | null;
  updatedAt: number;
  roomToken?: string;
  rulesMode?: 'standard' | 'less-random-v1';
  ruleOptions?: GameRuleOptions;
  participation?: MatchParticipation;
}
export type MatchSubmission =
  | { ok: true; receipt: CommandReceipt; duplicate: boolean }
  | { ok: false; error: ValidationError };

export interface MatchPlayerView extends PlayerView {
  showCombatOdds?:boolean;
  participation?: MatchParticipation;
  matchLifecycle?: 'active' | 'abandoned';
  canResign?: boolean;
  resignOutcome?: ResignationOutcome;
  lastSeenRevision: number | null;
  playerNames?: Record<string, string>;
  aiDifficulty?: AiDifficulty;
  aiStatus: { status: 'thinking' | 'scheduled' | 'waiting' | 'failed' | 'finished'; error: string | null; attempts: number } | null;
  multiplayer: { roomToken: string; viewerIsHost: boolean; timer: MultiplayerTimerPublic | null } | null;
}

export const createMatch = mutation({
  args: { credential: v.string(), showCombatOdds:v.optional(v.boolean()), minorSpecies:v.optional(v.boolean()), aiCount: v.optional(v.number()), factionProfile: v.optional(factionProfileValidator), pieceColor: v.optional(pieceColorValidator), faction: v.optional(factionValidator), bannedFaction:v.optional(factionValidator), warpPortals: v.optional(v.boolean()), rulesMode:v.optional(rulesModeValidator), ruleOptions:v.optional(gameRuleOptionsValidator), riftCannons:v.optional(v.boolean()), aiDifficulty: v.optional(v.union(v.literal('normal'), v.literal('hard'), v.literal('expert'))) },
  handler: async (ctx, args): Promise<{ matchId: Id<'eclipseMatchesV1'>; seatId: string }> => {
    const guest = await findGuest(ctx, args.credential);
    if (!guest) throw new Error('Guest session required.');
    if (!validRuleOptions(args.ruleOptions)) throw new Error('Choose a whole number of rounds from 1 through 20.');
    if (args.riftCannons && !allowsRiftCannons(args)) throw new Error('Rift Cannons cannot be combined with combat jokers or variant technology.');
    const factionMode = factionRulesMode(args);
    const aiCount = args.aiCount ?? 2;
    if (!Number.isInteger(aiCount) || aiCount < 1 || aiCount > 5) throw new Error('AI count must be an integer between 1 and 5.');
    const humanFaction = args.faction ?? 'terran-directorate';
    const factionProfile = args.factionProfile ?? 'base';
    if (!factionAllowedForProfile(humanFaction, factionProfile)) throw new Error('Choose a faction available in this profile.');
    if (factionMode === 'less-random-v1') {
      if (getFaction(humanFaction).species === 'terran') {
        if (!args.bannedFaction || !factionAllowedForProfile(args.bannedFaction,factionProfile) || getFaction(args.bannedFaction).species !== 'alien') throw new Error('A Terran civilization must ban one available alien species.');
      } else if (args.bannedFaction) throw new Error('Only a Terran civilization bans an alien species.');
    }
    const human = { id: 'seat-1', faction: humanFaction, ...(factionMode==='less-random-v1'&&args.bannedFaction?{bannedFaction:args.bannedFaction}:{}), pieceColor: seatPieceColor({ faction: humanFaction, ...(factionProfile === 'base' ? {} : { pieceColor: args.pieceColor }) }), controller: 'human' as const };
    const opponents = roomAiSelections([human], aiCount, factionProfile, Math.random,factionMode);
    // Convex provides replay-stable transaction randomness; credentials use independent crypto randomness.
    const seed = Math.floor(Math.random() * 0x100000000);
    const seats = [human, ...opponents.map((opponent, i) => ({ id: `seat-${i + 2}`, ...opponent, controller: 'ai' as const }))];
    const state = createGame({ seed, seats, factionProfile, ...(args.rulesMode ? {rulesMode:args.rulesMode} : {}), ...(args.ruleOptions ? {ruleOptions:args.ruleOptions} : {}), warpPortals: args.warpPortals ?? args.rulesMode !== 'less-random-v1', riftCannons: args.riftCannons ?? (args.rulesMode !== 'less-random-v1' && allowsRiftCannons(args)), minorSpecies: args.minorSpecies??false, randomizeStartingPlayer: true });
    const now = Date.now();
    const matchId = await ctx.db.insert('eclipseMatchesV1', { snapshotJson: JSON.stringify(state), rulesVersion: state.rulesVersion, catalogVersion: state.catalogVersion, revision: state.revision, round: state.round, phase: state.phase, ...(args.rulesMode?{rulesMode:args.rulesMode}:{}), ...(args.ruleOptions?{ruleOptions:args.ruleOptions}:{}), showCombatOdds:args.showCombatOdds??false, aiDifficulty: args.aiDifficulty ?? 'normal', aiVersion: AI_VERSION, createdAt: now, updatedAt: now });
    await ctx.db.insert('eclipseOwnershipV1', { matchId, guestId: guest._id, seatId: 'seat-1' });
    await scheduleAi(ctx, matchId, state);
    return { matchId, seatId: 'seat-1' };
  },
});

export const listMyMatches = query({
  args: { credential: v.string() },
  handler: async (ctx, { credential }): Promise<MatchSummary[]> => {
    const guest = await findGuest(ctx, credential);
    if (!guest) return [];
    const ownerships = await ctx.db.query('eclipseOwnershipV1').withIndex('by_guest', q => q.eq('guestId', guest._id)).collect();
    const results: MatchSummary[] = [];
    for (const ownership of ownerships) {
      const match = await ctx.db.get(ownership.matchId);
      if (!match) continue;
      const state = readState(match);
      results.push({ participation: participation(match, ownership), matchId: match._id, seatId: ownership.seatId, round: match.round, phase: match.phase, revision: match.revision, playerCount: state.seats.length, lastSeenRevision: ownership.lastSeenRevision ?? null, updatedAt: match.updatedAt, ...(match.roomToken ? { roomToken: match.roomToken } : {}), ...(state.rulesMode?{rulesMode:state.rulesMode}:{}), ...(state.ruleOptions?{ruleOptions:state.ruleOptions}:{}) });
    }
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getMatchView = query({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1') },
  handler: async (ctx, { credential, matchId }): Promise<MatchPlayerView | null> => {
    const ownership = await ownedSeat(ctx, credential, matchId);
    if (!ownership) return null;
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    const state = readState(match);
    const view = getPlayerView(state, ownership.seatId);
    const owners = await ctx.db.query('eclipseOwnershipV1').withIndex('by_match_guest', q => q.eq('matchId', matchId)).collect();
    const playerNames: Record<string, string> = {};
    for (const owner of owners) {
      const name = await playerNameForGuest(ctx, owner.guestId);
      if (name) playerNames[owner.seatId] = name;
    }
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    const room = match.roomToken ? await ctx.db.query('eclipseRoomsV1').withIndex('by_token', q => q.eq('roomToken', match.roomToken!)).unique() : null;
    const timer = room && room.humanSeatCount > 1 ? await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
    return view ? {
      ...view,
      showCombatOdds:match.showCombatOdds??false,
      participation: participation(match, ownership),
      matchLifecycle: match.lifecycle ?? 'active',
      canResign: ownership.resignedAt === undefined && match.lifecycle !== 'abandoned' && state.phase !== 'finished',
      resignOutcome: state.seats.some(seat => seat.id !== ownership.seatId && seat.controller === 'human') ? 'resigned' : 'abandoned',
      lastSeenRevision: ownership.lastSeenRevision ?? null,
      playerNames,
      aiDifficulty: match.aiDifficulty ?? 'normal',
      aiStatus: job ? { status: job.status, error: job.error, attempts: job.attempts } : null,
      multiplayer: room ? { roomToken: room.roomToken, viewerIsHost: room.hostGuestId === ownership.guestId, timer: timer ? { deadlineAt: timer.deadlineAt, targetSeatId: timer.upkeepSeatIds?.includes(ownership.seatId)?ownership.seatId:timer.targetSeatId, decisionId: timer.upkeepSeatIds?.includes(ownership.seatId)?view.pendingDecision?.id??null:timer.decisionId, status: timer.status, error: timer.error, ...(timer.upkeepRound!==undefined?{upkeepRound:timer.upkeepRound,upkeepSeatIds:timer.upkeepSeatIds??[]}: {}) } : null } : null,
    } : null;
  },
});

/** Explicit acknowledgement only: subscriptions and AI jobs never mark activity read. */
export const markMatchSeen = mutation({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1'), revision: v.number() },
  handler: async (ctx, { credential, matchId, revision }): Promise<number> => {
    const ownership = await ownedSeat(ctx, credential, matchId);
    if (!ownership) throw new Error('This identity does not own a seat in this match.');
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error('Match unavailable.');
    if (!Number.isSafeInteger(revision) || revision < 0 || revision > match.revision) throw new Error('Invalid seen revision.');
    const next = Math.max(ownership.lastSeenRevision ?? 0, revision);
    if (ownership.lastSeenRevision !== next) await ctx.db.patch(ownership._id, { lastSeenRevision: next });
    return next;
  },
});

/** Cursor is the oldest returned revision; new AI actions do not shift older pages. */
export const getMatchHistory = query({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1'), beforeRevision: v.optional(v.number()), fromStart:v.optional(v.boolean()), limit: v.optional(v.number()) },
  handler: async (ctx, {credential, matchId, beforeRevision, fromStart, limit}): Promise<PublicHistoryPage | null> => {
    if (!await ownedSeat(ctx, credential, matchId)) return null;
    return readPublicMatchHistory(ctx, matchId, {beforeRevision,fromStart,limit});
  },
});

async function saveAccepted(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, state: GameState, entry: JournalEntry, actionRound: number): Promise<void> {
  const previous = await ctx.db.get(matchId);
  await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state), revision: state.revision, round: state.round, phase: state.phase, updatedAt: Date.now() });
  await syncLeaderboardResult(ctx,matchId,state);
  await ctx.db.insert('eclipseJournalV1', { matchId, round: actionRound, commandId: entry.request.commandId, actor: entry.actor, revision: entry.receipt.revision, requestJson: JSON.stringify(entry.request), preSnapshotJson: previous?.snapshotJson, eventsJson: JSON.stringify(entry.events), receipt: entry.receipt, createdAt: Date.now() });
}

/** Leave permanently without changing the game's scoring rules or discarding pending choices. */
export const resignMatch = mutation({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1'), commandId: v.string(), expectedRevision: v.number() },
  handler: async (ctx, args): Promise<ResignMatchResult> => {
    const ownership = await ownedSeat(ctx, args.credential, args.matchId);
    const match = await ctx.db.get(args.matchId);
    if (!ownership || !match) return { ok: false, error: { code: 'NOT_A_SEAT', message: 'This identity does not own a seat in this match.', field: null } };
    if (!args.commandId.trim() || args.commandId.length > 200 || /^(ai|timeout):/.test(args.commandId) || !Number.isSafeInteger(args.expectedRevision) || args.expectedRevision < 0) {
      return { ok: false, error: { code: 'INVALID_COMMAND', message: 'Provide a unique command ID and valid revision.', field: null } };
    }
    const original = await ctx.db.query('eclipseMatchLifecycleV1').withIndex('by_match_command', q => q.eq('matchId', args.matchId).eq('commandId', args.commandId)).unique();
    const ruleCommand = await ctx.db.query('eclipseJournalV1').withIndex('by_match_command', q => q.eq('matchId', args.matchId).eq('commandId', args.commandId)).unique();
    if (ruleCommand || (original && (original.actor !== ownership.seatId || original.expectedRevision !== args.expectedRevision))) {
      return { ok: false, error: { code: 'COMMAND_ID_REUSED', message: 'This command ID already belongs to another request.', field: 'commandId' } };
    }
    if (original) return { ok: true, revision: original.revision, outcome: original.outcome, duplicate: true };
    if (match.rollbackPendingId) return { ok: false, error: { code: 'ILLEGAL_ACTION', message: 'Resolve the shared undo request before resigning.', field: null } };
    if (match.revision !== args.expectedRevision) return { ok: false, error: { code: 'STALE_REVISION', message: 'The game changed. Review the current position before leaving.', field: 'expectedRevision' } };
    const state = readState(match);
    if (match.lifecycle === 'abandoned' || match.rollbackPendingId || state.phase === 'finished' || ownership.resignedAt !== undefined) {
      return { ok: false, error: { code: 'GAME_FINISHED', message: 'Your participation in this game has already ended.', field: null } };
    }
    const seat = state.seats.find(candidate => candidate.id === ownership.seatId);
    if (!seat || seat.controller !== 'human') return { ok: false, error: { code: 'NOT_A_SEAT', message: 'This identity no longer controls a human seat.', field: null } };
    const outcome: ResignationOutcome = state.seats.some(candidate => candidate.id !== seat.id && candidate.controller === 'human') ? 'resigned' : 'abandoned';
    if (outcome === 'resigned') seat.controller = 'ai';
    state.revision += 1;
    const now = Date.now();
    await ctx.db.patch(match._id, { snapshotJson: JSON.stringify(state), revision: state.revision, updatedAt: now, ...(outcome === 'abandoned' ? { lifecycle: 'abandoned' as const } : {}) });
    await ctx.db.patch(ownership._id, { resignedAt: now, resignationOutcome: outcome });
    await ctx.db.insert('eclipseMatchLifecycleV1', { matchId: match._id, actor: seat.id, commandId: args.commandId, expectedRevision: args.expectedRevision, revision: state.revision, outcome, createdAt: now });
    if (outcome === 'abandoned') {
      const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
      if (room) await ctx.db.patch(room._id, { status: 'closed', updatedAt: now });
      const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
      if (timer) await ctx.db.patch(timer._id, { status: 'finished', error: null, updatedAt: now });
    } else {
      const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
      if (room?.hostGuestId === ownership.guestId) {
        const owners = await ctx.db.query('eclipseOwnershipV1').withIndex('by_match_guest', q => q.eq('matchId', match._id)).collect();
        const successor = owners.find(owner => owner.resignedAt === undefined && state.seats.some(candidate => candidate.id === owner.seatId && candidate.controller === 'human'));
        if (successor) {
          await ctx.db.patch(room._id, { hostGuestId: successor.guestId, updatedAt: now });
          const roomSeats = await ctx.db.query('eclipseRoomSeatsV1').withIndex('by_room', q => q.eq('roomId', room._id)).collect();
          for (const roomSeat of roomSeats) await ctx.db.patch(roomSeat._id, { isHost: roomSeat.guestId === successor.guestId });
        }
      }
      await reconcileRoomTimerAfterCommand(ctx, match, state);
    }
    await scheduleAi(ctx, match._id, state);
    return { ok: true, revision: state.revision, outcome, duplicate: false };
  },
});

export const submitCommand = mutation({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1'), commandId: v.string(), expectedRevision: v.number(), command: gameCommandValidator },
  handler: async (ctx, { credential, matchId, ...request }): Promise<MatchSubmission> => {
    const ownership = await ownedSeat(ctx, credential, matchId);
    const unauthorized: MatchSubmission = { ok: false, error: { code: 'NOT_A_SEAT', message: 'This identity does not own a seat in this match.', field: null } };
    if (!ownership) return unauthorized;
    const match = await ctx.db.get(matchId);
    if (!match) return unauthorized;
    if (match.lifecycle === 'abandoned') return { ok: false, error: { code: 'GAME_FINISHED', message: 'This run has ended.', field: null } };
    if (ownership.resignedAt !== undefined) return { ok: false, error: { code: 'NOT_A_SEAT', message: 'You resigned from this game. AI now controls your seat.', field: null } };
    const lifecycleCommand = await ctx.db.query('eclipseMatchLifecycleV1').withIndex('by_match_command', q => q.eq('matchId', matchId).eq('commandId', request.commandId)).unique();
    if (lifecycleCommand) return { ok: false, error: { code: 'COMMAND_ID_REUSED', message: 'This command ID already belongs to a resignation.', field: 'commandId' } };
    const state = readState(match);
    // Duplicate delivery returns its original receipt even if the current turn has since timed out.
    const original = await ctx.db.query('eclipseJournalV1').withIndex('by_match_command', q => q.eq('matchId', matchId).eq('commandId', request.commandId)).unique();
    if (!original && match.rollbackPendingId) return { ok: false, error: { code: 'ILLEGAL_ACTION', message: 'The game is paused for a shared undo request.', field: null } };
    if (!original && /^(ai|timeout):/.test(request.commandId)) return {ok:false, error:{code:'INVALID_COMMAND', message:'This command ID prefix is reserved for server actions.', field:'commandId'}};
    const room = match.roomToken ? await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
    const timer = room && room.humanSeatCount > 1 ? await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
    if (!original && timer && (timer.upkeepSeatIds?timer.upkeepSeatIds.includes(ownership.seatId):timer.targetSeatId === ownership.seatId) && (timer.status !== 'active' || timer.deadlineAt <= Date.now())) {
      return { ok: false, error: { code: 'TURN_TIMEOUT', message: 'This turn has timed out and is being completed by Normal AI.', field: null } };
    }
    // Read the unique command key in the same transaction as insertion, so concurrent retries conflict safely.
    const journal: JournalEntry[] = original ? [{ actor: original.actor, request: JSON.parse(original.requestJson) as JournalEntry['request'], receipt: original.receipt, events: JSON.parse(original.eventsJson) as JournalEntry['events'] }] : [];
    const result = commitCommand({ state, journal }, ownership.seatId, request, profileVersions(state.factionProfile ?? 'base', state.engine?.riftCannons, Boolean(state.minorSpecies)), processGameCommand);
    if (!result.ok) return { ok: false, error: result.error };
    if (!result.duplicate) {
      const entry = result.aggregate.journal[result.aggregate.journal.length - 1];
      await saveAccepted(ctx, matchId, result.aggregate.state, entry, state.round);
      await ctx.db.patch(ownership._id, { lastSeenRevision: Math.max(ownership.lastSeenRevision ?? 0, result.receipt.revision) });
      await reconcileRoomTimerAfterCommand(ctx, match, result.aggregate.state);
      await scheduleAi(ctx, matchId, result.aggregate.state);
    }
    return { ok: true, receipt: result.receipt, duplicate: result.duplicate };
  },
});


export async function scheduleAi(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, state: GameState): Promise<void> {
  const existing = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();

  const match = await ctx.db.get(matchId);
  if (match?.rollbackPendingId) return;
  if (match?.lifecycle === 'abandoned') {
    if (existing) await ctx.db.patch(existing._id, { status: 'finished', expectedRevision: state.revision, error: null, leaseToken: undefined, leaseExpiresAt: undefined, timeoutToken: undefined, remainingBudgetMs: 0, updatedAt: Date.now() });
    return;
  }
  const timer = match?.roomToken ? await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
  const actor = workerActor(state,timer?.status==='timed-out'||timer?.status==='failed'?timer.targetSeatId:undefined);
  const ai = state.phase !== 'finished' && state.seats.some(seat => seat.id === actor && seat.controller === 'ai' && !seat.eliminated);
  const timeout = timer?.status === 'timed-out' && actor === timer.targetSeatId && !!match && await validateTimeoutAi(ctx, match, timer.token, actor);
  const failedTimeout = timer?.status === 'failed' && actor === timer.targetSeatId && existing?.timeoutToken === timer.token;
  const status = state.phase === 'finished' ? 'finished' as const : failedTimeout ? 'failed' as const : ai || timeout ? 'scheduled' as const : 'waiting' as const;
  // A diplomacy/other-player choice may temporarily own an unfinished action.
  const budgetActor = state.phase==='upkeep'?actor:state.engine?.action?.owner ?? state.activeSeatId ?? actor;
  const actionTurnSerial = state.actionTurnSerial ?? 0;
  const sameActionTurn = (existing?.budgetActionTurnSerial ?? 0) === actionTurnSerial;
  const preserveBudget = sameActionTurn && (timeout || failedTimeout ? existing?.timeoutToken === timer?.token : existing?.budgetActor === budgetActor && existing?.budgetRound === state.round);
  const interruptedSearch = preserveBudget && existing?.status === 'thinking' && existing.expectedRevision !== state.revision;
  const patch = { status, expectedRevision: state.revision, attempts: failedTimeout ? existing.attempts : 0, error: failedTimeout ? timer.error : null, leaseToken: undefined, leaseExpiresAt: undefined, timeoutToken: timeout || failedTimeout ? timer!.token : undefined,
    budgetActor: budgetActor ?? undefined, budgetRound: state.round, budgetActionTurnSerial: actionTurnSerial,
    remainingBudgetMs: interruptedSearch ? 0 : preserveBudget ? existing?.remainingBudgetMs ?? 0 : AI_BUDGETS[timeout ? 'normal' : match?.aiDifficulty ?? 'normal'].budgetMs,
    updatedAt: Date.now() };
  if (existing) await ctx.db.patch(existing._id, patch);
  else await ctx.db.insert('eclipseAiJobsV1', { matchId, ...patch });
  if (ai || timeout) await ctx.scheduler.runAfter(AI_DECISION_DELAY_MS, internal.eclipseMatches.runAi, { matchId, expectedRevision: state.revision });
}

/** Claim before scheduling expensive work. Duplicate invocations cannot start another search. */
export const runAi = internalMutation({
  args: { matchId: v.id('eclipseMatchesV1'), expectedRevision: v.number() },
  returns: v.null(),
  handler: async (ctx, { matchId, expectedRevision }): Promise<null> => {
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    const match = await ctx.db.get(matchId);
    if (!job || !match || match.lifecycle === 'abandoned' || match.rollbackPendingId || match.revision !== expectedRevision || job.expectedRevision !== expectedRevision || job.status !== 'scheduled') return null;
    const leaseToken = roomTimerToken();
    const leaseExpiresAt = Date.now() + AI_BUDGETS[match.aiDifficulty ?? 'normal'].budgetMs + 15_000;
    await ctx.db.patch(job._id, { status: 'thinking', leaseToken, leaseExpiresAt, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.eclipseMatches.thinkAi, { matchId, expectedRevision, leaseToken });
    await ctx.scheduler.runAfter(leaseExpiresAt - Date.now(), internal.eclipseMatches.expireAiLease, { matchId, expectedRevision, leaseToken });
    return null;
  },
});
const aiWorkArgs = { matchId: v.id('eclipseMatchesV1'), expectedRevision: v.number(), leaseToken: v.string() };
interface AiWork { view: PlayerView; seed: number; difficulty: AiDifficulty; budgetMs: number; maxNodes: number }
export const getAiWork = internalQuery({
  args: aiWorkArgs,
  handler: async (ctx, {matchId, expectedRevision, leaseToken}): Promise<AiWork | null> => {
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    const match = await ctx.db.get(matchId);
    if (!job || !match || match.lifecycle === 'abandoned' || match.rollbackPendingId || job.status !== 'thinking' || job.leaseToken !== leaseToken || job.expectedRevision !== expectedRevision || match.revision !== expectedRevision || (job.leaseExpiresAt ?? 0) <= Date.now()) return null;
    if (match.aiVersion && match.aiVersion !== AI_VERSION) throw new Error('This match requires an unavailable AI version.');
    const state = readState(match);
    const actor = workerActor(state,job.timeoutToken?job.budgetActor:undefined);
    if (!actor || (job.timeoutToken ? !await validateTimeoutAi(ctx, match, job.timeoutToken, actor) : state.seats.find(seat => seat.id === actor)?.controller !== 'ai')) return null;
    const view = getPlayerView(state, actor);
    if (!view) return null;
    let seed = expectedRevision >>> 0;
    for (const character of matchId) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
    const difficulty = job.timeoutToken ? 'normal' : match.aiDifficulty ?? 'normal';
    return { view, seed, difficulty, budgetMs: Math.max(0, job.remainingBudgetMs ?? AI_BUDGETS[difficulty].budgetMs), maxNodes: AI_BUDGETS[difficulty].maxNodes };
  },
});
interface AiDiagnostics {
  revision: number; difficulty: AiDifficulty; version: string;
  status: Doc<'eclipseAiJobsV1'>['status'] | null; attempts: number; error: string | null;
  remainingBudgetMs: number | null; lastComputeMs: number | null;
  lastPlanComputeMs: number | null; lastPlanNodes: number | null; lastPlanDepth: number | null; lastPlanCutoff: boolean | null;
  lastSearchNodes: number | null; lastSearchDepth: number | null; lastSearchCutoff: boolean | null;
}
/** Admin-only, one-match operational projection; never includes snapshots or credentials. */
export const getAiDiagnostics = internalQuery({
  args: {matchId:v.id('eclipseMatchesV1')},
  handler: async (ctx, {matchId}): Promise<AiDiagnostics | null> => {
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    return {revision:match.revision, difficulty:match.aiDifficulty ?? 'normal', version:match.aiVersion ?? AI_VERSION,
      status:job?.status ?? null, attempts:job?.attempts ?? 0, error:job?.error ?? null,
      remainingBudgetMs:job?.remainingBudgetMs ?? null, lastComputeMs:job?.lastComputeMs ?? null,
      lastPlanComputeMs:job?.lastPlanComputeMs ?? null, lastPlanNodes:job?.lastPlanNodes ?? null, lastPlanDepth:job?.lastPlanDepth ?? null, lastPlanCutoff:job?.lastPlanCutoff ?? null,
      lastSearchNodes:job?.lastSearchNodes ?? null, lastSearchDepth:job?.lastSearchDepth ?? null, lastSearchCutoff:job?.lastSearchCutoff ?? null};
  },
});
export const thinkAi = internalAction({
  args: aiWorkArgs,
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      const work: AiWork | null = await ctx.runQuery(internal.eclipseMatches.getAiWork, args);
      if (!work) return null;
      const started = performance.now();
      const candidate = chooseStrategicAiCommand(work.view, work.seed, { difficulty: work.difficulty, budgetMs: work.budgetMs, maxNodes: work.budgetMs > 0 ? work.maxNodes : 0, now: () => performance.now() });
      if (!candidate) throw new Error('No legal AI candidate is available.');
      await ctx.runMutation(internal.eclipseMatches.commitAiWork, { ...args, command: candidate.command, elapsedMs: Math.max(0, performance.now() - started), searchNodes: candidate.search.nodes, searchDepth: candidate.search.completedDepth, searchCutoff: candidate.search.cutoff });
    } catch (error) {
      await ctx.runMutation(internal.eclipseMatches.failAiWork, { ...args, error: error instanceof Error ? error.message : 'Unexpected AI search failure.' });
    }
    return null;
  },
});
export const commitAiWork = internalMutation({
  args: { ...aiWorkArgs, command: gameCommandValidator, elapsedMs: v.number(), searchNodes: v.optional(v.number()), searchDepth: v.optional(v.number()), searchCutoff: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, {matchId, expectedRevision, leaseToken, command, elapsedMs, searchNodes, searchDepth, searchCutoff}): Promise<null> => {
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    const match = await ctx.db.get(matchId);
    if (!job || !match || match.lifecycle === 'abandoned' || match.rollbackPendingId || job.status !== 'thinking' || job.leaseToken !== leaseToken || job.expectedRevision !== expectedRevision || match.revision !== expectedRevision || (job.leaseExpiresAt ?? 0) <= Date.now()) return null;
    const state = readState(match);
    const actor = workerActor(state,job.timeoutToken?job.budgetActor:undefined);
    if (!actor || (job.timeoutToken ? !await validateTimeoutAi(ctx, match, job.timeoutToken, actor) : state.seats.find(seat => seat.id === actor)?.controller !== 'ai')) return null;
    const request = { commandId: `${job.timeoutToken ? 'timeout' : 'ai'}:${actor}:${expectedRevision}`, expectedRevision, command };
    const original = await ctx.db.query('eclipseJournalV1').withIndex('by_match_command', q => q.eq('matchId', matchId).eq('commandId', request.commandId)).unique();
    if (original) throw new Error('COMMAND_ID_REUSED: A stored command already uses this server action ID.');
    const result = commitCommand({ state, journal: [] }, actor, request, profileVersions(state.factionProfile ?? 'base', state.engine?.riftCannons, Boolean(state.minorSpecies)), processGameCommand);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    const remainingBudgetMs = Math.max(0, (job.remainingBudgetMs ?? 0) - Math.max(0, elapsedMs));
    await ctx.db.patch(job._id, { status:'waiting', remainingBudgetMs, lastComputeMs: elapsedMs, lastSearchNodes: searchNodes, lastSearchDepth: searchDepth, lastSearchCutoff: searchCutoff,
      ...((searchNodes ?? 0) > 0 ? {lastPlanComputeMs:elapsedMs, lastPlanNodes:searchNodes, lastPlanDepth:searchDepth, lastPlanCutoff:searchCutoff} : {}),
    });
    if (job.timeoutToken) {
      await finishTimeoutAiCommand(ctx, match, job.timeoutToken, actor, result.aggregate.state, result.aggregate.journal[0], state.round);
    } else {
      await saveAccepted(ctx, matchId, result.aggregate.state, result.aggregate.journal[0], state.round);
      await reconcileRoomTimerAfterCommand(ctx, match, result.aggregate.state);
      await scheduleAi(ctx, matchId, result.aggregate.state);
    }
    return null;
  },
});
export const failAiWork = internalMutation({
  args: { ...aiWorkArgs, error: v.string() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', args.matchId)).unique();
    if (job?.status === 'thinking' && job.leaseToken === args.leaseToken && job.expectedRevision === args.expectedRevision) {
      await ctx.db.patch(job._id, {status:'failed', error:args.error.slice(0,500), attempts:job.attempts+1, remainingBudgetMs:0, updatedAt:Date.now()});
      if (job.timeoutToken) {
        const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', args.matchId)).unique();
        if (timer?.token === job.timeoutToken) await ctx.db.patch(timer._id, {status:'failed', error:args.error.slice(0,500), updatedAt:Date.now()});
      }
    }
    return null;
  },
});
export const expireAiLease = internalMutation({
  args: aiWorkArgs, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', args.matchId)).unique();
    if (job?.status === 'thinking' && job.leaseToken === args.leaseToken && job.expectedRevision === args.expectedRevision && (job.leaseExpiresAt ?? 0) <= Date.now()) {
      await ctx.db.patch(job._id, {status:'failed', error:'AI search was interrupted. Retry to continue.', attempts:job.attempts+1, remainingBudgetMs:0, updatedAt:Date.now()});
      if (job.timeoutToken) {
        const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', args.matchId)).unique();
        if (timer?.token === job.timeoutToken) await ctx.db.patch(timer._id, {status:'failed', error:'AI search was interrupted. Retry to continue.', updatedAt:Date.now()});
      }
    }
    return null;
  },
});

export const retryAi = mutation({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1') },
  returns: v.null(),
  handler: async (ctx, { credential, matchId }): Promise<null> => {
    const owner = await ownedSeat(ctx, credential, matchId);
    if (!owner) throw new Error('This identity does not own a seat in this match.');
    if (owner.resignedAt !== undefined) return null;
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error('Match unavailable.');
    if (match.lifecycle === 'abandoned' || match.rollbackPendingId) return null;
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    if (job?.status === 'thinking' && (job.leaseExpiresAt ?? 0) > Date.now()) return null;
    if (job?.timeoutToken) {
      await retryFailedRoomTimeout(ctx, matchId, job.timeoutToken);
      return null;
    }
    await scheduleAi(ctx, matchId, readState(match));
    return null;
  },
});
