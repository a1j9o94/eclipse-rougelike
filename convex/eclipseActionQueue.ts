import { v } from 'convex/values';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { resolveGuest } from './eclipseIdentity';
import { gameCommandValidator } from './eclipseValidators';
import { commitCommand, getPlayerView } from '../shared/eclipse/protocol';
import { legalCommands } from '../shared/eclipse/legal';
import { processGameCommand } from '../shared/eclipse/engine';
import { profileVersions } from '../shared/eclipse/catalog';
import { upkeepSeatUnfinished } from '../shared/eclipse/upkeep';
import { recordBuiltShipBindings, resolveQueuedCommand, type ActionQueueStep, type ActionQueueView } from '../shared/eclipse/queue';
import type { Action, GameCommand, GameState } from '../shared/eclipse/types';
import { syncLeaderboardResult } from './eclipseLeaderboardStore';
import { reconcileRoomTimerAfterCommand, scheduleAi } from './eclipseMatches';

type ReadContext = Pick<QueryCtx, 'db'>;
type QueueRow = Doc<'eclipseActionQueuesV1'>;
const MAX_STEPS = 40;
const sectorTarget = v.union(v.string(), v.object({ kind: v.literal('sector-coordinate'), position: v.object({ q: v.number(), r: v.number() }) }));
const resource = v.union(v.literal('money'), v.literal('science'), v.literal('materials'));
const buildComponent = v.union(v.literal('interceptor'), v.literal('cruiser'), v.literal('dreadnought'), v.literal('starbase'), v.literal('orbital'), v.literal('monolith'));
const plannedBuild = v.object({ type: v.literal('build'), builds: v.array(v.object({ sectorId: sectorTarget, component: buildComponent })) });
const plannedMove = v.object({ type: v.literal('move'), moves: v.array(v.object({ shipId: v.union(v.string(), v.object({ kind: v.literal('built-ship'), stepId: v.string(), buildIndex: v.number() })), path: v.array(sectorTarget) })) });
const plannedInfluence = v.object({ type: v.literal('influence'), removeSectorIds: v.array(sectorTarget), addSectorIds: v.array(sectorTarget) });
const plannedColonize = v.object({ type: v.literal('colonize'), placements: v.array(v.object({ sectorId: sectorTarget, squareId: v.string(), resource })) });
const plannedShrine = v.object({ type: v.literal('place-shrine'), sectorId: sectorTarget, planetIndex: v.number(), row: resource, column: v.union(v.literal(0), v.literal(1), v.literal(2)) });
const plannedFundedBuild = v.object({ type: v.literal('trade-and-act'), trades: v.array(v.object({ from: resource, to: resource, amount: v.number() })), action: plannedBuild });
const queuedCommandValidator = v.union(gameCommandValidator, plannedBuild, plannedMove, plannedInfluence, plannedColonize, plannedShrine, plannedFundedBuild);
const stepValidator = v.object({ id: v.string(), command: queuedCommandValidator });
const identityArgs = { credential: v.string(), matchId: v.id('eclipseMatchesV1') };

function readState(match: Doc<'eclipseMatchesV1'>): GameState {
  const state = JSON.parse(match.snapshotJson) as GameState;
  if (state.revision !== match.revision || state.rulesVersion !== match.rulesVersion || state.catalogVersion !== match.catalogVersion) throw new Error('Match snapshot metadata mismatch.');
  return state;
}
function steps(row: QueueRow): ActionQueueStep[] { return JSON.parse(row.stepsJson) as ActionQueueStep[]; }
function bindings(row: QueueRow): Record<string, string> { return JSON.parse(row.bindingsJson) as Record<string, string>; }
function queueView(row: QueueRow): ActionQueueView {
  return { steps: steps(row), status: row.status, currentIndex: row.currentIndex, ...(row.pauseReason ? { pauseReason: row.pauseReason } : {}) };
}
function token(): string { return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join(''); }
function requiresActionPhase(type: ActionQueueStep['command']['type']): boolean {
  return ['explore', 'influence', 'research', 'upgrade', 'build', 'move', 'trade-and-act', 'pass', 'end-action', 'research-development', 'quantum-research', 'place-shrine', 'offer-diplomacy', 'buy-minor-species', 'buy-activation'].includes(type);
}
async function owner(ctx: ReadContext, credential: string, matchId: Id<'eclipseMatchesV1'>) {
  const guest = await resolveGuest(ctx, credential);
  return guest ? ctx.db.query('eclipseOwnershipV1').withIndex('by_match_guest', q => q.eq('matchId', matchId).eq('guestId', guest._id)).unique() : null;
}
async function rowForSeat(ctx: ReadContext, matchId: Id<'eclipseMatchesV1'>, seatId: string) {
  return ctx.db.query('eclipseActionQueuesV1').withIndex('by_match_seat', q => q.eq('matchId', matchId).eq('seatId', seatId)).unique();
}
export function queueSummary(row: QueueRow | null): { status: QueueRow['status']; pendingCount: number; pauseReason?: string } | undefined {
  return row ? { status: row.status, pendingCount: Math.max(0, steps(row).length - row.currentIndex), ...(row.pauseReason ? { pauseReason: row.pauseReason } : {}) } : undefined;
}
export async function queueSummaryForSeat(ctx: ReadContext, matchId: Id<'eclipseMatchesV1'>, seatId: string) {
  return queueSummary(await rowForSeat(ctx, matchId, seatId));
}
export const getQueue = query({
  args: identityArgs,
  handler: async (ctx, args): Promise<ActionQueueView | null> => {
    const ownership = await owner(ctx, args.credential, args.matchId);
    if (!ownership) return null;
    const row = await rowForSeat(ctx, args.matchId, ownership.seatId);
    return row ? queueView(row) : null;
  },
});
function assertEditable(match: Doc<'eclipseMatchesV1'>, ownership: Doc<'eclipseOwnershipV1'>): void {
  if (ownership.resignedAt !== undefined || match.lifecycle === 'abandoned' || match.phase === 'finished') throw new Error('This seat can no longer queue actions.');
  if (match.rollbackPendingId) throw new Error('Resolve the shared undo request before editing the queue.');
}
function validateSteps(items: ActionQueueStep[]): void {
  if (items.length > MAX_STEPS) throw new Error(`Queue at most ${MAX_STEPS} actions.`);
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || item.id.length > 80 || !/^[A-Za-z0-9_-]+$/.test(item.id) || ids.has(item.id)) throw new Error('Queue steps need unique, short IDs.');
    if ((item.command as GameCommand).type === 'resolve') throw new Error('Choices must be made by the player.');
    ids.add(item.id);
  }
  if (JSON.stringify(items).length > 80_000) throw new Error('Queue is too large.');
}
export const saveQueue = mutation({
  args: { ...identityArgs, steps: v.array(stepValidator) },
  handler: async (ctx, args): Promise<ActionQueueView> => {
    const ownership = await owner(ctx, args.credential, args.matchId);
    const match = await ctx.db.get(args.matchId);
    if (!ownership || !match) throw new Error('This identity does not own a seat in this match.');
    assertEditable(match, ownership);
    const items = args.steps as ActionQueueStep[];
    validateSteps(items);
    const current = await rowForSeat(ctx, args.matchId, ownership.seatId);
    const preserve = current && current.status !== 'finished' && current.currentIndex > 0;
    if (preserve && JSON.stringify(items.slice(0, current.currentIndex)) !== JSON.stringify(steps(current).slice(0, current.currentIndex))) throw new Error('Completed actions cannot be edited or removed.');
    const patch = { status: preserve || current?.status === 'running' || current?.status === 'paused' ? 'paused' as const : 'draft' as const, stepsJson: JSON.stringify(items), currentIndex: preserve ? current!.currentIndex : 0, bindingsJson: preserve ? current!.bindingsJson : '{}', pauseReason: preserve || current?.status === 'running' || current?.status === 'paused' ? 'Queue edited. Review it before resuming.' : undefined, reviewedUpkeepRound: undefined, token: token(), updatedAt: Date.now() };
    if (current) await ctx.db.patch(current._id, patch);
    else await ctx.db.insert('eclipseActionQueuesV1', { matchId: args.matchId, seatId: ownership.seatId, ...patch });
    return { steps: items, status: patch.status, currentIndex: patch.currentIndex, ...(patch.pauseReason ? { pauseReason: patch.pauseReason } : {}) };
  },
});
export const startQueue = mutation({
  args: identityArgs,
  handler: async (ctx, args): Promise<ActionQueueView> => {
    const ownership = await owner(ctx, args.credential, args.matchId);
    const match = await ctx.db.get(args.matchId);
    if (!ownership || !match) throw new Error('This identity does not own a seat in this match.');
    assertEditable(match, ownership);
    const row = await rowForSeat(ctx, args.matchId, ownership.seatId);
    if (!row || !steps(row).length) throw new Error('Add actions before starting the queue.');
    if (row.status !== 'draft') throw new Error('This queue is already started.');
    const nextToken = token();
    await ctx.db.patch(row._id, { status: 'running', token: nextToken, pauseReason: undefined, updatedAt: Date.now() });
    await scheduleQueue(ctx, args.matchId, readState(match));
    return { ...queueView(row), status: 'running' };
  },
});
export const pauseQueue = mutation({
  args: identityArgs,
  handler: async (ctx, args): Promise<ActionQueueView> => {
    const ownership = await owner(ctx, args.credential, args.matchId);
    if (!ownership) throw new Error('This identity does not own a seat in this match.');
    const row = await rowForSeat(ctx, args.matchId, ownership.seatId);
    if (!row) throw new Error('There is no queue to pause.');
    if (row.status === 'running') await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'Paused by player.', token: token(), updatedAt: Date.now() });
    return { ...queueView(row), status: row.status === 'running' ? 'paused' : row.status, ...(row.status === 'running' ? { pauseReason: 'Paused by player.' } : {}) };
  },
});
export const resumeQueue = mutation({
  args: identityArgs,
  handler: async (ctx, args): Promise<ActionQueueView> => {
    const ownership = await owner(ctx, args.credential, args.matchId);
    const match = await ctx.db.get(args.matchId);
    if (!ownership || !match) throw new Error('This identity does not own a seat in this match.');
    const row = await rowForSeat(ctx, args.matchId, ownership.seatId);
    if (!row || row.status !== 'paused') throw new Error('This queue is not paused.');
    if (row.pauseReason?.startsWith('Undo restored')) throw new Error('Rebuild this queue after the undo before starting it.');
    const state = readState(match);
    if (row.currentIndex >= steps(row).length) {
      if (state.pendingDecision?.owner === row.seatId) throw new Error('Resolve your outstanding choice before completing the queue.');
      await ctx.db.patch(row._id, { status: 'finished', pauseReason: undefined, token: token(), updatedAt: Date.now() });
      return { ...queueView(row), status: 'finished', pauseReason: undefined };
    }
    assertEditable(match, ownership);
    await ctx.db.patch(row._id, { status: 'running', pauseReason: undefined, reviewedUpkeepRound: row.pauseReason?.startsWith('You can still colonize') ? readState(match).round : row.reviewedUpkeepRound, token: token(), updatedAt: Date.now() });
    await scheduleQueue(ctx, args.matchId, readState(match));
    return { ...queueView(row), status: 'running', pauseReason: undefined };
  },
});

/** Invoked after every authoritative state transition. A stale scheduled worker does nothing. */
export async function scheduleQueue(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, state: GameState): Promise<void> {
  const match = await ctx.db.get(matchId);
  if (!match) return;
  const rows = await ctx.db.query('eclipseActionQueuesV1').withIndex('by_match', q => q.eq('matchId', matchId)).collect();
  for (const row of rows) {
    if (row.status !== 'running') continue;
    if (match.lifecycle === 'abandoned' || state.phase === 'finished') {
      await ctx.db.patch(row._id, { status: 'finished', token: token(), updatedAt: Date.now() });
      continue;
    }
    if (match.rollbackPendingId) continue;
    const seat = state.seats.find(item => item.id === row.seatId);
    if (!seat || seat.controller !== 'human' || seat.eliminated) {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'This seat can no longer execute the queue.', token: token(), updatedAt: Date.now() });
      continue;
    }
    if (row.currentIndex >= steps(row).length) {
      await ctx.db.patch(row._id, { status: 'finished', token: token(), updatedAt: Date.now() });
      continue;
    }
    if (state.pendingDecision) {
      if (state.pendingDecision.owner === row.seatId) await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'A choice needs your response. Review the queue before resuming.', token: token(), updatedAt: Date.now() });
      continue;
    }
    if (state.phase === 'upkeep' && upkeepSeatUnfinished(state, row.seatId) && requiresActionPhase(steps(row)[row.currentIndex].command.type)) {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'Complete upkeep, then review the queue before resuming.', token: token(), updatedAt: Date.now() });
      continue;
    }
    if (state.activeSeatId !== row.seatId && !upkeepSeatUnfinished(state, row.seatId)) continue;
    await ctx.scheduler.runAfter(0, internal.eclipseActionQueue.runQueue, { matchId, seatId: row.seatId, token: row.token });
  }
}

export async function pauseQueueForManualCommand(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, seatId: string): Promise<void> {
  const row = await rowForSeat(ctx, matchId, seatId);
  if (row?.status === 'running') await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'You made a manual action. Review the remaining queue before resuming.', token: token(), updatedAt: Date.now() });
}
export async function pauseQueuesForUndo(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>): Promise<void> {
  const rows = await ctx.db.query('eclipseActionQueuesV1').withIndex('by_match', q => q.eq('matchId', matchId)).collect();
  for (const row of rows) if (row.status === 'running') await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'An undo request changed the match. Review the queue before resuming.', token: token(), updatedAt: Date.now() });
}
export async function invalidateQueuesAfterAppliedUndo(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>): Promise<void> {
  const rows = await ctx.db.query('eclipseActionQueuesV1').withIndex('by_match', q => q.eq('matchId', matchId)).collect();
  for (const row of rows) if (row.status === 'paused') await ctx.db.patch(row._id, { currentIndex: 0, bindingsJson: '{}', pauseReason: 'Undo restored an earlier position. Rebuild this queue before resuming.', token: token(), updatedAt: Date.now() });
}
function family(command: GameCommand): Action | null {
  if (command.type === 'trade-and-act') return command.action.type;
  if (['explore', 'influence', 'research', 'upgrade', 'build', 'move'].includes(command.type)) return command.type as Action;
  return null;
}
async function persistCommand(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>, actor: string, state: GameState, command: GameCommand, commandId: string) {
  const request = { commandId, expectedRevision: state.revision, command };
  const result = commitCommand({ state, journal: [] }, actor, request, profileVersions(state.factionProfile ?? 'base', state.engine?.riftCannons, Boolean(state.minorSpecies)), processGameCommand);
  if (!result.ok) return { ok: false as const, reason: result.error.message };
  const after = result.aggregate.state;
  const entry = result.aggregate.journal[0];
  await ctx.db.patch(match._id, { snapshotJson: JSON.stringify(after), revision: after.revision, round: after.round, phase: after.phase, updatedAt: Date.now() });
  await syncLeaderboardResult(ctx, match._id, after);
  await ctx.db.insert('eclipseJournalV1', { matchId: match._id, round: state.round, commandId, actor, revision: entry.receipt.revision, requestJson: JSON.stringify(entry.request), preSnapshotJson: match.snapshotJson, eventsJson: JSON.stringify(entry.events), receipt: entry.receipt, createdAt: Date.now() });
  await reconcileRoomTimerAfterCommand(ctx, match, after);
  await scheduleAi(ctx, match._id, after);
  return { ok: true as const, state: after };
}
export const runQueue = internalMutation({
  args: { matchId: v.id('eclipseMatchesV1'), seatId: v.string(), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const row = await rowForSeat(ctx, args.matchId, args.seatId);
    const match = await ctx.db.get(args.matchId);
    if (!row || !match || row.status !== 'running' || row.token !== args.token || match.rollbackPendingId || match.lifecycle === 'abandoned') return null;
    const state = readState(match);
    const seat = state.seats.find(item => item.id === row.seatId);
    if (state.phase === 'finished' || !seat || seat.controller !== 'human' || seat.eliminated) {
      await ctx.db.patch(row._id, { status: 'finished', token: token(), updatedAt: Date.now() });
      return null;
    }
    const item = steps(row)[row.currentIndex];
    if (!item) {
      await ctx.db.patch(row._id, { status: 'finished', token: token(), updatedAt: Date.now() });
      return null;
    }
    if (state.pendingDecision) {
      if (state.pendingDecision.owner === row.seatId) await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'A choice needs your response. Review the queue before resuming.', token: token(), updatedAt: Date.now() });
      return null;
    }
    if (state.activeSeatId !== row.seatId && !upkeepSeatUnfinished(state, row.seatId)) return null;
    if (state.phase === 'upkeep' && requiresActionPhase(item.command.type)) {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'Complete upkeep, then review the queue before resuming.', token: token(), updatedAt: Date.now() });
      return null;
    }
    if ((state.phase !== 'action' && state.phase !== 'upkeep') || (state.phase === 'action' && item.command.type === 'finish-upkeep')) return null;
    const timer = match.roomToken ? await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique() : null;
    if (timer && (timer.upkeepSeatIds ? timer.upkeepSeatIds.includes(row.seatId) : timer.targetSeatId === row.seatId) && (timer.status !== 'active' || timer.deadlineAt <= Date.now())) {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'Your turn timed out. Review the queue before resuming.', token: token(), updatedAt: Date.now() });
      return null;
    }
    const resolved = resolveQueuedCommand(item, bindings(row), state);
    if (!resolved.ok) {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: resolved.reason, token: token(), updatedAt: Date.now() });
      return null;
    }
    if (resolved.command.type === 'resolve') {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'Choices must be made by the player.', token: token(), updatedAt: Date.now() });
      return null;
    }
    const queuedFamily = family(resolved.command);
    const progress = state.engine?.action;
    const nextFamily = queuedFamily;
    if (resolved.command.type === 'finish-upkeep') {
      const view = getPlayerView(state, row.seatId);
      if (row.reviewedUpkeepRound !== state.round && view && legalCommands(view).some(candidate => candidate.command.type === 'colonize' && candidate.command.placements.length > 0)) {
        await ctx.db.patch(row._id, { status: 'paused', pauseReason: 'You can still colonize before finishing upkeep. Review your colony ships, then resume the queue.', token: token(), updatedAt: Date.now() });
        return null;
      }
    }
    if (state.phase === 'action' && progress?.owner === row.seatId && (resolved.command.type === 'pass' || (nextFamily && (progress.action !== nextFamily || (progress.budgets ? (progress.budgets[nextFamily] ?? 0) <= 0 : progress.remaining <= 0))))) {
      const ended = await persistCommand(ctx, match, row.seatId, state, { type: 'end-action' }, `queue:${row._id}:${row.currentIndex}:end:${state.revision}`);
      if (!ended.ok) await ctx.db.patch(row._id, { status: 'paused', pauseReason: ended.reason, token: token(), updatedAt: Date.now() });
      else await scheduleQueue(ctx, match._id, ended.state);
      return null;
    }
    const accepted = await persistCommand(ctx, match, row.seatId, state, resolved.command, `queue:${row._id}:${row.currentIndex}:${row.token}`);
    if (!accepted.ok) {
      await ctx.db.patch(row._id, { status: 'paused', pauseReason: accepted.reason, token: token(), updatedAt: Date.now() });
      return null;
    }
    const nextBindings = recordBuiltShipBindings(item, state, accepted.state, row.seatId, bindings(row));
    const nextIndex = row.currentIndex + 1;
    const done = nextIndex >= steps(row).length;
    const decision = accepted.state.pendingDecision;
    const pauseReason = decision ? 'A choice opened. Make it, then review the queue before resuming.' : undefined;
    await ctx.db.patch(row._id, { currentIndex: nextIndex, bindingsJson: JSON.stringify(nextBindings), status: decision ? 'paused' : done ? 'finished' : 'running', pauseReason, token: token(), updatedAt: Date.now() });
    if (!done && !decision) await scheduleQueue(ctx, match._id, accepted.state);
    return null;
  },
});
