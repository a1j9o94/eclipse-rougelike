import { projectHistoryEntry, type PublicHistoryPage } from '../shared/eclipse/history';
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { BASE_FACTIONS, CATALOG_VERSION, RULES_VERSION } from '../shared/eclipse/catalog';
import { resolveGuest as findGuest, playerNameForGuest } from './eclipseIdentity';
import { commitCommand, getPlayerView } from '../shared/eclipse/protocol';
import { createGame } from '../shared/eclipse/setup';
import { processGameCommand } from '../shared/eclipse/engine';
import type { CommandReceipt, GameState, JournalEntry, Phase, PlayerView, ValidationError } from '../shared/eclipse/types';
import { reconcileMultiplayerTimer, timerTargetForState, type MultiplayerTimerPublic, type MultiplayerTurnTimer } from '../shared/eclipse/multiplayer';
import { internal } from './_generated/api';
import { chooseAiCommand } from '../shared/eclipse/ai';
import { AI_DECISION_DELAY_MS } from '../shared/eclipse/pacing';
import { factionValidator, gameCommandValidator } from './eclipseValidators';

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
async function reconcileRoomTimerAfterCommand(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>, state: GameState): Promise<void> {
  if (!match.roomToken) return;
  const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  if (!room || room.status !== 'playing') return;
  const current = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
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
  const previous: MultiplayerTurnTimer | null = current ? {
    token: current.token,
    deadlineAt: current.deadlineAt,
    target: { seatId: current.targetSeatId, decisionId: current.decisionId },
    status: current.status,
    error: current.error,
  } : null;
  const next = reconcileMultiplayerTimer(previous, state, Date.now(), room.timerMs, roomTimerToken);
  if (!next.timer) return;
  if (current) {
    await ctx.db.patch(current._id, { token: next.timer.token, deadlineAt: next.timer.deadlineAt, targetSeatId: next.timer.target.seatId, decisionId: next.timer.target.decisionId, status: next.timer.status, error: next.timer.error, timeoutSteps: next.changed ? 0 : current.timeoutSteps, updatedAt: Date.now() });
  } else {
    await ctx.db.insert('eclipseRoomTimersV1', { roomId: room._id, matchId: match._id, token: next.timer.token, deadlineAt: next.timer.deadlineAt, targetSeatId: next.timer.target.seatId, decisionId: next.timer.target.decisionId, status: next.timer.status, error: next.timer.error, timeoutSteps: 0, updatedAt: Date.now() });
  }
  if (next.changed) await ctx.scheduler.runAfter(Math.max(0, next.timer.deadlineAt - Date.now()), internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: next.timer.token });
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
}
export type MatchSubmission =
  | { ok: true; receipt: CommandReceipt; duplicate: boolean }
  | { ok: false; error: ValidationError };

export interface MatchPlayerView extends PlayerView {
  lastSeenRevision: number | null;
  playerNames?: Record<string, string>;
  aiStatus: { status: 'scheduled' | 'waiting' | 'failed' | 'finished'; error: string | null; attempts: number } | null;
  multiplayer: { roomToken: string; viewerIsHost: boolean; timer: MultiplayerTimerPublic | null } | null;
}

export const createMatch = mutation({
  args: { credential: v.string(), aiCount: v.optional(v.number()), faction: v.optional(factionValidator), warpPortals: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<{ matchId: Id<'eclipseMatchesV1'>; seatId: string }> => {
    const guest = await findGuest(ctx, args.credential);
    if (!guest) throw new Error('Guest session required.');
    const aiCount = args.aiCount ?? 2;
    if (!Number.isInteger(aiCount) || aiCount < 1 || aiCount > 5) throw new Error('AI count must be an integer between 1 and 5.');
    const humanFaction = args.faction ?? 'terran-directorate';
    const human = BASE_FACTIONS.find(faction => faction.id === humanFaction);
    if (!human) throw new Error('Choose a base-game faction.');
    const opponents = BASE_FACTIONS.filter(faction => faction.species === 'alien' && faction.color !== human.color).slice(0, aiCount);
    if (opponents.length !== aiCount) throw new Error('Not enough distinct faction boards.');
    // Convex provides replay-stable transaction randomness; credentials use independent crypto randomness.
    const seed = Math.floor(Math.random() * 0x100000000);
    const seats = [{ id: 'seat-1', faction: human.id, controller: 'human' as const }, ...opponents.map((faction, i) => ({ id: `seat-${i + 2}`, faction: faction.id, controller: 'ai' as const }))];
    const state = createGame({ seed, seats, warpPortals: args.warpPortals ?? true });
    const now = Date.now();
    const matchId = await ctx.db.insert('eclipseMatchesV1', { snapshotJson: JSON.stringify(state), rulesVersion: state.rulesVersion, catalogVersion: state.catalogVersion, revision: state.revision, round: state.round, phase: state.phase, createdAt: now, updatedAt: now });
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
      results.push({ matchId: match._id, seatId: ownership.seatId, round: match.round, phase: match.phase, revision: match.revision, playerCount: state.seats.length, lastSeenRevision: ownership.lastSeenRevision ?? null, updatedAt: match.updatedAt, ...(match.roomToken ? { roomToken: match.roomToken } : {}) });
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
    const view = getPlayerView(readState(match), ownership.seatId);
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
      lastSeenRevision: ownership.lastSeenRevision ?? null,
      playerNames,
      aiStatus: job ? { status: job.status, error: job.error, attempts: job.attempts } : null,
      multiplayer: room ? { roomToken: room.roomToken, viewerIsHost: room.hostGuestId === ownership.guestId, timer: timer ? { deadlineAt: timer.deadlineAt, targetSeatId: timer.targetSeatId, decisionId: timer.decisionId, status: timer.status, error: timer.error } : null } : null,
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
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1'), beforeRevision: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, {credential, matchId, beforeRevision, limit}): Promise<PublicHistoryPage | null> => {
    if (!await ownedSeat(ctx, credential, matchId)) return null;
    if (beforeRevision !== undefined && (!Number.isSafeInteger(beforeRevision) || beforeRevision < 1)) throw new Error('Invalid history cursor.');
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)) throw new Error('History page size must be between 1 and 100.');
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    const count = limit ?? 40;
    const rows = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => beforeRevision === undefined ? q.eq('matchId',matchId) : q.eq('matchId',matchId).lt('revision',beforeRevision)).order('desc').take(count + 1);
    const historyState = readState(match);
    const seats = historyState.seats;
    const entries = rows.slice(0,count).map(row => projectHistoryEntry({ actor:row.actor, receipt:row.receipt, request:JSON.parse(row.requestJson) as JournalEntry['request'], events:JSON.parse(row.eventsJson) as JournalEntry['events'] },seats,row.round,historyState));
    return { entries, nextBeforeRevision: rows.length > count ? entries[entries.length - 1].revision : null };
  },
});

async function saveAccepted(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, state: GameState, entry: JournalEntry, actionRound: number): Promise<void> {
  await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state), revision: state.revision, round: state.round, phase: state.phase, updatedAt: Date.now() });
  await ctx.db.insert('eclipseJournalV1', { matchId, round: actionRound, commandId: entry.request.commandId, actor: entry.actor, revision: entry.receipt.revision, requestJson: JSON.stringify(entry.request), eventsJson: JSON.stringify(entry.events), receipt: entry.receipt, createdAt: Date.now() });
}

export const submitCommand = mutation({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1'), commandId: v.string(), expectedRevision: v.number(), command: gameCommandValidator },
  handler: async (ctx, { credential, matchId, ...request }): Promise<MatchSubmission> => {
    const ownership = await ownedSeat(ctx, credential, matchId);
    const unauthorized: MatchSubmission = { ok: false, error: { code: 'NOT_A_SEAT', message: 'This identity does not own a seat in this match.', field: null } };
    if (!ownership) return unauthorized;
    const match = await ctx.db.get(matchId);
    if (!match) return unauthorized;
    const state = readState(match);
    // Duplicate delivery returns its original receipt even if the current turn has since timed out.
    const original = await ctx.db.query('eclipseJournalV1').withIndex('by_match_command', q => q.eq('matchId', matchId).eq('commandId', request.commandId)).unique();
    const room = match.roomToken ? await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
    const timer = room && room.humanSeatCount > 1 ? await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
    if (!original && timer && timer.targetSeatId === ownership.seatId && (timer.status !== 'active' || timer.deadlineAt <= Date.now())) {
      return { ok: false, error: { code: 'TURN_TIMEOUT', message: 'This turn has timed out and is being completed by Normal AI.', field: null } };
    }
    // Read the unique command key in the same transaction as insertion, so concurrent retries conflict safely.
    const journal: JournalEntry[] = original ? [{ actor: original.actor, request: JSON.parse(original.requestJson) as JournalEntry['request'], receipt: original.receipt, events: JSON.parse(original.eventsJson) as JournalEntry['events'] }] : [];
    const result = commitCommand({ state, journal }, ownership.seatId, request, { rulesVersion: RULES_VERSION, catalogVersion: CATALOG_VERSION }, processGameCommand);
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
  const actor = state.pendingDecision?.owner ?? state.activeSeatId;
  const ai = state.phase !== 'finished' && state.seats.some(seat => seat.id === actor && seat.controller === 'ai' && !seat.eliminated);
  const status = state.phase === 'finished' ? 'finished' as const : ai ? 'scheduled' as const : 'waiting' as const;
  const patch = { status, expectedRevision: state.revision, attempts: 0, error: null, updatedAt: Date.now() };
  if (existing) await ctx.db.patch(existing._id, patch);
  else await ctx.db.insert('eclipseAiJobsV1', { matchId, ...patch });
  if (ai) await ctx.scheduler.runAfter(AI_DECISION_DELAY_MS, internal.eclipseMatches.runAi, { matchId, expectedRevision: state.revision });
}

/** One bounded AI decision per durable job. Stale schedules are harmless and errors remain visible. */
export const runAi = internalMutation({
  args: { matchId: v.id('eclipseMatchesV1'), expectedRevision: v.number() },
  returns: v.null(),
  handler: async (ctx, { matchId, expectedRevision }): Promise<null> => {
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    const match = await ctx.db.get(matchId);
    if (!job || !match || match.revision !== expectedRevision || job.expectedRevision !== expectedRevision || job.status !== 'scheduled') return null;
    try {
      const state = readState(match);
      const actor = state.pendingDecision?.owner ?? state.activeSeatId;
      if (!actor || state.seats.find(seat => seat.id === actor)?.controller !== 'ai') { await scheduleAi(ctx, matchId, state); return null; }
      const view = getPlayerView(state, actor);
      if (!view) throw new Error('AI seat has no public view.');
      let seed = expectedRevision >>> 0;
      for (const character of matchId) seed = (Math.imul(seed ^ character.charCodeAt(0), 16777619)) >>> 0;
      const candidate = chooseAiCommand(view, seed);
      if (!candidate) throw new Error('No legal AI candidate is available.');
      const request = { commandId: `ai:${actor}:${expectedRevision}`, expectedRevision, command: candidate.command };
      const result = commitCommand({ state, journal: [] }, actor, request, { rulesVersion: RULES_VERSION, catalogVersion: CATALOG_VERSION }, processGameCommand);
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      await saveAccepted(ctx, matchId, result.aggregate.state, result.aggregate.journal[0], state.round);
      await reconcileRoomTimerAfterCommand(ctx, match, result.aggregate.state);
      await scheduleAi(ctx, matchId, result.aggregate.state);
    } catch (error) {
      await ctx.db.patch(job._id, { status: 'failed', attempts: job.attempts + 1, error: error instanceof Error ? error.message : 'Unexpected AI job failure.', updatedAt: Date.now() });
    }
    return null;
  },
});

export const retryAi = mutation({
  args: { credential: v.string(), matchId: v.id('eclipseMatchesV1') },
  returns: v.null(),
  handler: async (ctx, { credential, matchId }): Promise<null> => {
    if (!await ownedSeat(ctx, credential, matchId)) throw new Error('This identity does not own a seat in this match.');
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error('Match unavailable.');
    await scheduleAi(ctx, matchId, readState(match));
    return null;
  },
});
