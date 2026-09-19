import { v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { resolveGuest } from './eclipseIdentity';
import { reconcileRoomTimerAfterCommand, scheduleAi } from './eclipseMatches';
import { projectHistoryEntry } from '../shared/eclipse/history';
import type { GameState, JournalEntry } from '../shared/eclipse/types';
import type { RollbackStatus } from '../shared/eclipse/rollback';

type ReadContext = Pick<QueryCtx, 'db'>;
/** Superseded ranges are lightweight audit records; never scan every private checkpoint to rewind. */
export function supersededRevision(revision: number, rollbacks: readonly Doc<'eclipseRollbacksV1'>[]): number | undefined {
  return rollbacks.find(row => row.status === 'applied' && row.appliedRevision !== undefined && revision >= row.targetRevision && revision <= row.expectedRevision)?.appliedRevision;
}
interface Access { match: Doc<'eclipseMatchesV1'>; ownership: Doc<'eclipseOwnershipV1'>; isHost: boolean }
async function access(ctx: ReadContext, credential: string, matchId: Id<'eclipseMatchesV1'>): Promise<Access | null> {
  const guest = await resolveGuest(ctx, credential);
  if (!guest) return null;
  const ownership = await ctx.db.query('eclipseOwnershipV1').withIndex('by_match_guest', q => q.eq('matchId', matchId).eq('guestId', guest._id)).unique();
  const match = await ctx.db.get(matchId);
  if (!ownership || !match) return null;
  const room = match.roomToken ? await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
  return { match, ownership, isHost: room ? room.hostGuestId === guest._id : true };
}
function stateFrom(match: Doc<'eclipseMatchesV1'>): GameState {
  const state = JSON.parse(match.snapshotJson) as GameState;
  if (state.revision !== match.revision || state.rulesVersion !== match.rulesVersion || state.catalogVersion !== match.catalogVersion) throw new Error('Match snapshot metadata mismatch.');
  return state;
}
async function status(ctx: ReadContext, viewer: Access): Promise<RollbackStatus> {
  const match = (await ctx.db.get(viewer.match._id))!;
  const pending = match.rollbackPendingId ? await ctx.db.get(match.rollbackPendingId) : null;
  const latest = await ctx.db.query('eclipseRollbacksV1').withIndex('by_match_created', q => q.eq('matchId', match._id)).order('desc').take(2);
  const resolved = latest.find(row => row.status !== 'pending');
  return {
    isHost: viewer.isHost && viewer.ownership.resignedAt === undefined && match.lifecycle !== 'abandoned', revision: match.revision,
    pending: pending?.status === 'pending' ? { id: pending._id, targetRevision: pending.targetRevision, targetSummary: pending.targetSummary, requestedBySeatId: pending.requestedBySeatId, requiredSeatIds: pending.requiredSeatIds, approvedSeatIds: pending.approvedSeatIds, createdAt: pending.createdAt } : null,
    lastResolution: resolved && resolved.status !== 'pending' ? { status: resolved.status, targetRevision: resolved.targetRevision, resolvedAt: resolved.resolvedAt!, appliedRevision: resolved.appliedRevision ?? null } : null,
  };
}
function token(): string { return Array.from({ length: 36 }, () => Math.floor(Math.random() * 36).toString(36)).join(''); }

/** A control transition advances revision as well, so disconnected tabs cannot commit old drafts after a vote. */
async function advanceControlRevision(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>): Promise<void> {
  const state = stateFrom(match);
  state.revision = match.revision + 1;
  await ctx.db.patch(match._id, { revision: state.revision, snapshotJson: JSON.stringify(state), updatedAt: Date.now() });
}
async function pause(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>): Promise<string | undefined> {
  const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  if (job) await ctx.db.patch(job._id, { status: 'waiting', leaseToken: undefined, leaseExpiresAt: undefined, timeoutToken: undefined, updatedAt: Date.now() });
  const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  if (timer) await ctx.db.patch(timer._id, { status: 'finished', token: token(), error: null, updatedAt: Date.now() });
  return timer ? JSON.stringify(timer) : undefined;
}
async function resume(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, row: Doc<'eclipseRollbacksV1'>, restored: boolean): Promise<void> {
  const match = (await ctx.db.get(matchId))!;
  const state = stateFrom(match);
  const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
  if (timer) await ctx.db.delete(timer._id);
  if (!restored && row.pausedTimerJson) {
    const original = JSON.parse(row.pausedTimerJson) as Doc<'eclipseRoomTimersV1'>;
    const newToken = token();
    const deadlineAt = Date.now() + Math.max(0, original.deadlineAt - row.createdAt);
    await ctx.db.insert('eclipseRoomTimersV1', { roomId: original.roomId, matchId, token: newToken, deadlineAt, targetSeatId: original.targetSeatId, actionTurnSerial: original.actionTurnSerial, decisionId: original.decisionId, status: original.status, error: original.error, timeoutSteps: original.timeoutSteps, updatedAt: Date.now() });
    const room = await ctx.db.get(original.roomId);
    if (room && (original.status === 'active' || original.status === 'timed-out')) await ctx.scheduler.runAfter(Math.max(0, deadlineAt - Date.now()), internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: newToken });
    if (original.status === 'failed') {
      const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
      if (job) await ctx.db.patch(job._id, { status: 'failed', timeoutToken: newToken, error: original.error });
    }
  } else {
    const room = match.roomToken ? await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique() : null;
    if (room && state.phase !== 'finished') await ctx.db.patch(room._id, { status: 'playing', updatedAt: Date.now() });
    await reconcileRoomTimerAfterCommand(ctx, match, state);
  }
  await scheduleAi(ctx, matchId, state);
}
async function finish(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>, row: Doc<'eclipseRollbacksV1'>, outcome: 'applied' | 'rejected' | 'cancelled'): Promise<void> {
  let appliedRevision: number | undefined;
  if (outcome === 'applied') {
    const target = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).eq('revision', row.targetRevision)).unique();
    if (!target?.preSnapshotJson || target.supersededAtRevision !== undefined) throw new Error('This history checkpoint is no longer available.');
    const restored = JSON.parse(target.preSnapshotJson) as GameState;
    if (restored.rulesVersion !== match.rulesVersion || restored.catalogVersion !== match.catalogVersion) throw new Error('Checkpoint rules do not match this game.');
    appliedRevision = match.revision + 1;
    restored.revision = appliedRevision;
    await ctx.db.patch(match._id, { snapshotJson: JSON.stringify(restored), revision: appliedRevision, round: restored.round, phase: restored.phase, updatedAt: Date.now() });
  }
  await ctx.db.patch(row._id, { status: outcome, resolvedAt: Date.now(), appliedRevision });
  await ctx.db.patch(match._id, { rollbackPendingId: undefined });
  await resume(ctx, match._id, row, outcome === 'applied');
}
const identityArgs = { credential: v.string(), matchId: v.id('eclipseMatchesV1') };
export const getRollbackStatus = query({
  args: identityArgs,
  handler: async (ctx, args): Promise<RollbackStatus | null> => {
    const viewer = await access(ctx, args.credential, args.matchId);
    return viewer ? status(ctx, viewer) : null;
  },
});
export const requestRollback = mutation({
  args: { ...identityArgs, targetRevision: v.number(), expectedRevision: v.number() },
  handler: async (ctx, args): Promise<RollbackStatus> => {
    const viewer = await access(ctx, args.credential, args.matchId);
    if (!viewer) throw new Error('This identity does not own a seat in this match.');
    if (!viewer.isHost || viewer.ownership.resignedAt !== undefined) throw new Error('Only the active room host can request an undo.');
    const { match } = viewer;
    if (match.lifecycle === 'abandoned') throw new Error('This game has ended by resignation.');
    const previous = await ctx.db.query('eclipseRollbacksV1').withIndex('by_match_created', q => q.eq('matchId', match._id)).order('desc').first();
    if (previous?.requestedBySeatId === viewer.ownership.seatId && previous.targetRevision === args.targetRevision && previous.expectedRevision === args.expectedRevision) return status(ctx, viewer);
    if (match.rollbackPendingId) throw new Error('An undo request is already awaiting agreement.');
    if (args.expectedRevision !== match.revision) throw new Error('The game changed. Refresh history before requesting an undo.');
    if (!Number.isSafeInteger(args.targetRevision) || args.targetRevision < 1 || args.targetRevision > match.revision) throw new Error('Choose an accepted action in history.');
    const target = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).eq('revision', args.targetRevision)).unique();
    if (!target?.preSnapshotJson) throw new Error('This older action has no saved checkpoint. Only actions saved after the undo update can be restored.');
    const rollbackAudit = await ctx.db.query('eclipseRollbacksV1').withIndex('by_match_created', q => q.eq('matchId', match._id)).collect();
    if (target.supersededAtRevision !== undefined || supersededRevision(target.revision, rollbackAudit) !== undefined) throw new Error('This action belongs to an earlier, superseded timeline.');
    const lifecycle = await ctx.db.query('eclipseMatchLifecycleV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).gte('revision', args.targetRevision)).first();
    if (lifecycle) throw new Error('Undo cannot cross a player resignation. Choose a more recent action.');
    const state = stateFrom(match);
    const requiredSeatIds = state.seats.filter(seat => seat.controller === 'human' && !seat.eliminated && seat.id !== viewer.ownership.seatId).map(seat => seat.id);
    const targetSummary = projectHistoryEntry({ actor: target.actor, receipt: target.receipt, request: JSON.parse(target.requestJson) as JournalEntry['request'], events: JSON.parse(target.eventsJson) as JournalEntry['events'] }, state.seats, target.round, state).summary;
    const pausedTimerJson = await pause(ctx, match);
    const id = await ctx.db.insert('eclipseRollbacksV1', { matchId: match._id, requestedBySeatId: viewer.ownership.seatId, targetRevision: args.targetRevision, targetSummary, expectedRevision: args.expectedRevision, requiredSeatIds, approvedSeatIds: [], status: 'pending', createdAt: Date.now(), pausedTimerJson });
    await advanceControlRevision(ctx, match);
    await ctx.db.patch(match._id, { rollbackPendingId: id });
    if (!requiredSeatIds.length) await finish(ctx, (await ctx.db.get(match._id))!, (await ctx.db.get(id))!, 'applied');
    return status(ctx, viewer);
  },
});
export const respondRollback = mutation({
  args: { ...identityArgs, rollbackId: v.id('eclipseRollbacksV1'), approve: v.boolean() },
  handler: async (ctx, args): Promise<RollbackStatus> => {
    const viewer = await access(ctx, args.credential, args.matchId);
    if (!viewer || viewer.ownership.resignedAt !== undefined) throw new Error('This identity does not own an active seat in this match.');
    const row = await ctx.db.get(args.rollbackId);
    if (!row || row.matchId !== args.matchId || !row.requiredSeatIds.includes(viewer.ownership.seatId)) throw new Error('This seat is not a voter for that undo request.');
    if (row.status !== 'pending') return status(ctx, viewer);
    if (viewer.match.rollbackPendingId !== row._id) throw new Error('This undo request is no longer current.');
    if (!args.approve) await finish(ctx, viewer.match, row, 'rejected');
    else {
      const approvedSeatIds = [...new Set([...row.approvedSeatIds, viewer.ownership.seatId])];
      await ctx.db.patch(row._id, { approvedSeatIds });
      if (row.requiredSeatIds.every(seatId => approvedSeatIds.includes(seatId))) await finish(ctx, viewer.match, { ...row, approvedSeatIds }, 'applied');
    }
    return status(ctx, viewer);
  },
});
export const cancelRollback = mutation({
  args: { ...identityArgs, rollbackId: v.id('eclipseRollbacksV1') },
  handler: async (ctx, args): Promise<RollbackStatus> => {
    const viewer = await access(ctx, args.credential, args.matchId);
    if (!viewer || !viewer.isHost || viewer.ownership.resignedAt !== undefined) throw new Error('Only the requesting room host can cancel an undo.');
    const row = await ctx.db.get(args.rollbackId);
    if (!row || row.matchId !== args.matchId || row.requestedBySeatId !== viewer.ownership.seatId) throw new Error('Only the requesting room host can cancel an undo.');
    if (row.status === 'pending') await finish(ctx, viewer.match, row, 'cancelled');
    return status(ctx, viewer);
  },
});
