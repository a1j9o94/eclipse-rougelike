import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import type { GameState } from '../../shared/eclipse/types';
import { finishDispatchedAi } from './aiWorkerTestSupport';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function room(t: ReturnType<typeof convexTest>, humanSeatCount = 2) {
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const visitor = await t.action(api.eclipseGuests.createGuestSession, {});
  const created = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings: { humanSeatCount, aiCount: humanSeatCount === 1 ? 1 : 0, timerMs: 30_000, warpPortals: true }, faction: 'hydran' });
  if (humanSeatCount === 2) {
    await t.mutation(api.eclipseRooms.joinRoom, { ...visitor, roomToken: created.roomToken, faction: 'eridani' });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...visitor, roomToken: created.roomToken, ready: true });
  }
  await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: created.roomToken, ready: true });
  const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: created.roomToken });
  return { host, visitor, matchId, roomToken: created.roomToken };
}

describe('Persistent resignation and quitting', () => {
  it('abandons a solo run without scoring, persists an idempotent receipt, and locks commands', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
    const before = await t.run(ctx => ctx.db.get(matchId));
    const request = { ...guest, matchId, commandId: 'quit-solo', expectedRevision: 0 };
    expect(await t.mutation(api.eclipseMatches.resignMatch, request)).toEqual({ ok: true, revision: 1, outcome: 'abandoned', duplicate: false });
    expect(await t.mutation(api.eclipseMatches.resignMatch, request)).toEqual({ ok: true, revision: 1, outcome: 'abandoned', duplicate: true });
    const after = await t.run(ctx => ctx.db.get(matchId));
    expect(after?.phase).toBe(before?.phase);
    expect(after?.lifecycle).toBe('abandoned');
    const state = JSON.parse(after!.snapshotJson) as GameState;
    expect(state).toEqual({ ...JSON.parse(before!.snapshotJson), revision: 1 });
    const view = await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId });
    expect(view).toMatchObject({ participation: 'abandoned', canResign: false, aiStatus: { status: 'finished' } });
    expect((await t.query(api.eclipseMatches.listMyMatches, guest))[0]).toMatchObject({ participation: 'abandoned' });
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...guest, matchId, commandId: 'post-quit', expectedRevision: 1, command: { type: 'pass' } })).toMatchObject({ ok: false, error: { code: 'GAME_FINISHED' } });
    await t.mutation(api.eclipseMatches.retryAi, { ...guest, matchId });
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 1 });
    expect((await t.run(ctx => ctx.db.get(matchId)))?.revision).toBe(1);
  });

  it('rejects stolen, stale, malformed and reused requests without changing a match', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
    const request = { ...guest, matchId, commandId: 'quit', expectedRevision: 0 };
    expect(await t.mutation(api.eclipseMatches.resignMatch, { ...request, ...stranger })).toMatchObject({ ok: false, error: { code: 'NOT_A_SEAT' } });
    expect(await t.mutation(api.eclipseMatches.resignMatch, { ...request, expectedRevision: 2 })).toMatchObject({ ok: false, error: { code: 'STALE_REVISION' } });
    expect(await t.mutation(api.eclipseMatches.resignMatch, { ...request, commandId: '' })).toMatchObject({ ok: false, error: { code: 'INVALID_COMMAND' } });
    expect((await t.run(ctx => ctx.db.get(matchId)))?.revision).toBe(0);
    await t.mutation(api.eclipseMatches.submitCommand, { ...guest, matchId, commandId: 'used-pass', expectedRevision: 0, command: { type: 'pass' } });
    expect(await t.mutation(api.eclipseMatches.resignMatch, { ...request, commandId: 'used-pass', expectedRevision: 1 })).toMatchObject({ ok: false, error: { code: 'COMMAND_ID_REUSED' } });
    expect((await t.run(ctx => ctx.db.get(matchId)))?.revision).toBe(1);
  });

  it('transfers a multiplayer pending choice to AI while preserving private information and other players', async () => {
    const t = convexTest(schema, modules);
    const { host, visitor, matchId, roomToken } = await room(t);
    const pending = { id: 'private-choice', owner: 'seat-1', kind: 'reputation' as const, drawn: [2, 4], capacity: 4 };
    await t.run(async ctx => {
      const row = await ctx.db.get(matchId);
      const state = JSON.parse(row!.snapshotJson) as GameState;
      state.pendingDecision = pending;
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    expect(await t.mutation(api.eclipseMatches.resignMatch, { ...host, matchId, commandId: 'resign', expectedRevision: 0 })).toMatchObject({ ok: true, outcome: 'resigned', revision: 1 });
    const own = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    const other = await t.query(api.eclipseMatches.getMatchView, { ...visitor, matchId });
    expect(own).toMatchObject({ participation: 'resigned', pendingDecision: pending, aiStatus: { status: 'scheduled' } });
    expect(other).toMatchObject({ participation: 'active', canResign: true, resignOutcome: 'abandoned' });
    expect(other?.pendingDecision).toBeNull();
    expect(other?.seats.find(seat => seat.id === 'seat-1')?.controller).toBe('ai');
    expect(other).not.toHaveProperty('random');
    expect(other).not.toHaveProperty('privateSeats');
    expect((await t.query(api.eclipseRooms.getRoom, { ...visitor, roomToken }))?.status).toBe('playing');
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'resigned-command', expectedRevision: 1, command: { type: 'pass' } })).toMatchObject({ ok: false, error: { code: 'NOT_A_SEAT' } });
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 1 });
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...visitor, matchId }))?.revision).toBeGreaterThan(1);
  });

  it('allows resignation while another human acts without extending their deadline', async () => {
    const t = convexTest(schema, modules);
    const { host, visitor, matchId } = await room(t);
    const before = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    await t.mutation(api.eclipseMatches.resignMatch, { ...visitor, matchId, commandId: 'leave-other-turn', expectedRevision: 0 });
    const after = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    expect(after?.multiplayer?.timer?.deadlineAt).toBe(before?.multiplayer?.timer?.deadlineAt);
    expect(after?.activeSeatId).toBe(before?.activeSeatId);
    expect(after?.seats.find(seat => seat.id === 'seat-2')?.controller).toBe('ai');
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'resign-id-reused', expectedRevision: 1, command: { type: 'pass' } })).toMatchObject({ ok: true });
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'leave-other-turn', expectedRevision: 2, command: { type: 'pass' } })).toMatchObject({ ok: false, error: { code: 'COMMAND_ID_REUSED' } });
  });

  it.each([1, 2])('stops old AI leases and timers when the final human leaves a %i-human room', async humanSeatCount => {
    const t = convexTest(schema, modules);
    const { host, visitor, matchId, roomToken } = await room(t, humanSeatCount);
    if (humanSeatCount === 2) await t.mutation(api.eclipseMatches.resignMatch, { ...visitor, matchId, commandId: 'first-leave', expectedRevision: 0 });
    const revision = humanSeatCount === 2 ? 1 : 0;
    const job = await t.run(async ctx => {
      const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
      await ctx.db.patch(job!._id, { status: 'thinking', leaseToken: 'old-lease', leaseExpiresAt: 100_000, expectedRevision: revision });
      return job!;
    });
    expect(await t.mutation(api.eclipseMatches.resignMatch, { ...host, matchId, commandId: 'last-leave', expectedRevision: revision })).toMatchObject({ ok: true, outcome: 'abandoned' });
    await t.mutation(internal.eclipseMatches.commitAiWork, { matchId, expectedRevision: revision, leaseToken: 'old-lease', command: { type: 'pass' }, elapsedMs: 1 });
    await t.mutation(internal.eclipseMatches.failAiWork, { matchId, expectedRevision: revision, leaseToken: 'old-lease', error: 'old error' });
    await t.mutation(internal.eclipseRooms.syncRoomTimer, { matchId });
    expect((await t.run(ctx => ctx.db.get(job._id)))?.status).toBe('finished');
    expect((await t.run(ctx => ctx.db.get(matchId)))?.revision).toBe(revision + 1);
    expect((await t.query(api.eclipseRooms.getRoom, { ...host, roomToken }))?.status).toBe('finished');
  });
});
