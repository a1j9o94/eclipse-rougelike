import './hostStartingSeed';
import {finishDispatchedAi} from './aiWorkerTestSupport';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import type { GameState } from '../../shared/eclipse/types';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function startSolo(t: ReturnType<typeof convexTest>) {
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, faction: 'hydran', settings: { humanSeatCount: 1, aiCount: 1, timerMs: 30_000, warpPortals: true } });
  await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
  const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
  return { host, matchId };
}

describe('visible time between authoritative AI decisions', () => {
  it('paces chained timeout decisions while keeping the expired seat locked and its original deadline unchanged', async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, faction: 'hydran', settings: { humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: true } });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: 'eridani' });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
    vi.advanceTimersByTime(30_000);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    const after = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    expect(after?.revision).toBe(1);
    expect(after?.multiplayer?.timer).toMatchObject({ status: 'timed-out', targetSeatId: 'seat-1', deadlineAt: 31_000 });
    const scheduled = await t.run(ctx => ctx.db.system.query('_scheduled_functions').collect());
    const pendingTimeouts = scheduled.filter(job => job.name === 'eclipseRooms:runRoomTimeout' && job.state.kind === 'pending');
    expect(pendingTimeouts).toHaveLength(1);
    expect(pendingTimeouts[0].scheduledTime).toBeCloseTo(32_200, 3);
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'during-timeout-pause', expectedRevision: 1, command: { type: 'pass' } })).toMatchObject({ ok: false, error: { code: 'TURN_TIMEOUT' } });
    vi.advanceTimersByTime(1_199);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(1);
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(2);
  });

  it('schedules the first and following AI decisions 1.2 seconds apart, with no early state change', async () => {
    const t = convexTest(schema, modules);
    const { host, matchId } = await startSolo(t);
    await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'start-paced-ai', expectedRevision: 0, command: { type: 'pass' } });
    const scheduled = await t.run(ctx => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled.filter(job => job.name === 'eclipseMatches:runAi').map(job => job.scheduledTime)).toEqual([2_200]);
    vi.advanceTimersByTime(1_199);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(1);
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    const after = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    expect(after?.revision).toBe(2);
    expect(after?.aiStatus?.status).toBe('scheduled');
    const following = await t.run(ctx => ctx.db.system.query('_scheduled_functions').collect());
    expect(following.filter(job => job.name === 'eclipseMatches:runAi' && job.state.kind === 'pending').map(job => job.scheduledTime)).toEqual([3_400]);
    vi.advanceTimersByTime(1_199);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(2);
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(3);
  });

  it('preserves stale-job protection and gives a recovered failed job the same readable delay', async () => {
    const t = convexTest(schema, modules);
    const { host, matchId } = await startSolo(t);
    await t.run(async ctx => {
      const match = await ctx.db.get(matchId);
      const state = JSON.parse(match!.snapshotJson) as GameState;
      state.activeSeatId = 'seat-2';
      state.pendingDecision = { kind: 'free-technology', owner: 'seat-2', id: 'broken-ai-choice', technologyIds: [] };
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    await t.mutation(api.eclipseMatches.retryAi, { ...host, matchId });
    vi.advanceTimersByTime(1_200);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.aiStatus).toMatchObject({ status: 'failed', attempts: 1 });
    await t.run(async ctx => {
      const match = await ctx.db.get(matchId);
      const state = JSON.parse(match!.snapshotJson) as GameState;
      state.pendingDecision = null;
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    await t.mutation(api.eclipseMatches.retryAi, { ...host, matchId });
    const scheduled = await t.run(ctx => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled.filter(job => job.name === 'eclipseMatches:runAi' && job.state.kind === 'pending').map(job => job.scheduledTime)).toEqual([3_400]);
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 10 });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(0);
    vi.advanceTimersByTime(1_199);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(0);
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(1);
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 0 });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(1);
  });
});
