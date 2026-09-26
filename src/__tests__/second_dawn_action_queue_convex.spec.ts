import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import type { GameState } from '../../shared/eclipse/types';
import { legalCommands } from '../../shared/eclipse/legal';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { processGameCommand } from '../../shared/eclipse/engine';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function setup() {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { ...host, aiCount: 1 });
  await t.run(async ctx => {
    const match = (await ctx.db.get(matchId))!;
    const state = JSON.parse(match.snapshotJson) as GameState;
    state.activeSeatId = 'seat-1';
    state.phase = 'action';
    await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state), phase: 'action' });
  });
  return { t, host, stranger, matchId };
}
async function workerToken(t: ReturnType<typeof convexTest>, matchId: Id<'eclipseMatchesV1'>) {
  return t.run(async ctx => (await ctx.db.query('eclipseActionQueuesV1').withIndex('by_match_seat', q => q.eq('matchId', matchId).eq('seatId', 'seat-1')).unique())!.token);
}

import type { Id } from '../../convex/_generated/dataModel';

describe('server-owned action queue', () => {
  it('runs an eligible queued step from the durable scheduler while the browser is absent', async () => {
    const { t, host, matchId } = await setup();
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [{ id: 'automated', command: { type: 'set-auto-pass', enabled: true } }] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    vi.advanceTimersByTime(0);
    await t.finishInProgressScheduledFunctions();
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'finished', currentIndex: 1 });
    expect(await t.run(ctx => ctx.db.query('eclipseJournalV1').collect())).toHaveLength(1);
  });

  it('wakes a waiting queue after a timed-out opponent AI command', async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, faction: 'terran-directorate', settings: { humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: true } });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: 'hydran' });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
    await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.activeSeatId = 'seat-2';
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
      const timer = (await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique())!;
      await ctx.db.patch(timer._id, { targetSeatId: 'seat-2', deadlineAt: 0, status: 'active' });
    });
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [{ id: 'host-pass', command: { type: 'pass' } }] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'running', currentIndex: 0 });
    const timeoutToken = await t.run(async ctx => (await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique())!.token);
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: timeoutToken });
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 0 });
    const job = await t.run(async ctx => (await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique())!);
    expect(job.leaseToken).toBeDefined();
    await t.mutation(internal.eclipseMatches.commitAiWork, { matchId, expectedRevision: 0, leaseToken: job.leaseToken!, command: { type: 'pass' }, elapsedMs: 1 });
    const scheduled = await t.run(ctx => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled.some(item => item.name === 'eclipseActionQueue:runQueue' && item.state.kind === 'pending')).toBe(true);
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'finished', currentIndex: 1 });
  });

  it('keeps planned commands private and journals each scheduled step once', async () => {
    const { t, host, stranger, matchId } = await setup();
    const steps = [{ id: 'first', command: { type: 'pass' as const } }];
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...stranger, matchId })).toBeNull();
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.queueStatus).toMatchObject({ status: 'draft', pendingCount: 1 });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    const lease = await workerToken(t, matchId);
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: lease });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: lease });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'finished', currentIndex: 1 });
    const journal = await t.run(ctx => ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).collect());
    expect(journal).toHaveLength(1);
    expect(journal[0].commandId).toContain('queue:');
    expect((await t.query(api.eclipseMatches.listMyMatches, host))[0].queueStatus).toMatchObject({ status: 'finished', pendingCount: 0 });
  });

  it('pauses on a failed live command and requires explicit review to resume', async () => {
    const { t, host, matchId } = await setup();
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [{ id: 'bad', command: { type: 'research', tileId: 'never-in-market', track: 'nano' } }] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'paused', currentIndex: 0 });
    expect(await t.run(ctx => ctx.db.query('eclipseJournalV1').collect())).toHaveLength(0);
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [{ id: 'good', command: { type: 'pass' } }] });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'paused', currentIndex: 0 });
    await t.mutation(api.eclipseActionQueue.resumeQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'finished', currentIndex: 1 });
  });

  it('pauses running work when its owner manually submits a command', async () => {
    const { t, host, matchId } = await setup();
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [{ id: 'research', command: { type: 'research', tileId: 'not-yet', track: 'nano' } }] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    const lease = await workerToken(t, matchId);
    expect((await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'manual', expectedRevision: 0, command: { type: 'pass' } })).ok).toBe(true);
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'paused', currentIndex: 0 });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: lease });
    expect(await t.run(ctx => ctx.db.query('eclipseJournalV1').collect())).toHaveLength(1);
  });

  it('waits through upkeep for a later action after a queued pass', async () => {
    const { t, host, matchId } = await setup();
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [
      { id: 'pass', command: { type: 'pass' } },
      { id: 'next-round', command: { type: 'research', tileId: 'unavailable', track: 'nano' } },
    ] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'running', currentIndex: 1 });
    await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.phase = 'upkeep'; state.activeSeatId = 'seat-1';
      await ctx.db.patch(matchId, { phase: 'upkeep', snapshotJson: JSON.stringify(state) });
    });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'paused', currentIndex: 1, pauseReason: expect.stringContaining('Complete upkeep') });
    expect(await t.run(ctx => ctx.db.query('eclipseJournalV1').collect())).toHaveLength(1);
  });

  it('preserves completed steps when editing and pauses a final choice until acknowledged', async () => {
    const { t, host, matchId } = await setup();
    const view = (await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!;
    const explore = legalCommands(view).find(candidate => candidate.command.type === 'explore')?.command;
    expect(explore).toBeDefined();
    const first = { id: 'toggle', command: { type: 'set-auto-pass' as const, enabled: false } };
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [first, { id: 'pass', command: { type: 'pass' } }] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'running', currentIndex: 1 });
    await expect(t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [{ id: 'different', command: { type: 'pass' } }] })).rejects.toThrow('Completed actions');
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [first, { id: 'explore', command: explore! }] });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'paused', currentIndex: 1 });
    await t.mutation(api.eclipseActionQueue.resumeQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'paused', currentIndex: 2 });
    const pending = (await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!;
    expect(pending.pendingDecision?.owner).toBe('seat-1');
    await expect(t.mutation(api.eclipseActionQueue.resumeQueue, { ...host, matchId })).rejects.toThrow('Resolve your outstanding choice');
    const choice = legalCommands(pending).find(candidate => candidate.command.type === 'resolve')!.command;
    expect((await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'choose', expectedRevision: pending.revision, command: choice })).ok).toBe(true);
    expect((await t.mutation(api.eclipseActionQueue.resumeQueue, { ...host, matchId })).status).toBe('finished');
  });

  it('executes research before an upgrade that uses the newly acquired part', async () => {
    const { t, host, matchId } = await setup();
    const technologyId = 'gauss-shield';
    const blueprint = await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.technologyMarket.push(technologyId);
      const seat = state.seats.find(item => item.id === 'seat-1')!;
      seat.resources.science = 50;
      seat.resources.money = 50;
      seat.influenceOnTrack = 7;
      const current = seat.blueprints.find(item => item.shipType === 'interceptor')!;
      const upgraded = { ...current, parts: [...current.parts] };
      upgraded.parts[upgraded.parts.length - 1] = technologyId;
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
      return upgraded;
    });
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [
      { id: 'tech', command: { type: 'research', tileId: technologyId, track: 'grid' } },
      { id: 'upgrade', command: { type: 'upgrade', blueprints: [blueprint] } },
    ] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'running', currentIndex: 1 });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    const afterEnd = (await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!;
    expect(afterEnd.actionProgress).toBeNull();
    await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.activeSeatId = 'seat-1';
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    expect(await t.query(api.eclipseActionQueue.getQueue, { ...host, matchId })).toMatchObject({ status: 'finished', currentIndex: 2 });
    const state = await t.run(async ctx => JSON.parse((await ctx.db.get(matchId))!.snapshotJson) as GameState);
    const seat = state.seats.find(item => item.id === 'seat-1')!;
    expect(seat.technologies.grid).toContain(technologyId);
    expect(seat.blueprints.find(item => item.shipType === 'interceptor')!.parts).toContain(technologyId);
  });

  it('resolves a future ship reference when a queued build is followed by a move', async () => {
    const { t, host, matchId } = await setup();
    const plan = await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      const seat = state.seats.find(item => item.id === 'seat-1')!;
      seat.resources.materials = 50;
      seat.resources.money = 50;
      seat.influenceOnTrack = 7;
      const home = state.sectors.find(sector => sector.owner === seat.id)!;
      const center = state.sectors.find(sector => sector.id === '001')!;
      state.sectors.push({ ...structuredClone(center), id: 'test-link', position: { q: home.position.q, r: home.position.r + 1 }, owner: null });
      const build = legalCommands(getPlayerView(state, seat.id)!).find(item => item.command.type === 'build' && item.command.builds.some(build => build.component === 'interceptor'))?.command;
      if (!build || build.type !== 'build') throw new Error('No legal interceptor build in setup.');
      const built = processGameCommand(state, seat.id, build);
      if (!built.ok) throw new Error('Build simulation failed.');
      const newShip = built.state.ships.find(ship => !state.ships.some(previous => previous.id === ship.id));
      if (!newShip) throw new Error('Build did not create a ship.');
      const ended = processGameCommand(built.state, seat.id, { type: 'end-action' });
      if (!ended.ok) throw new Error('End-action simulation failed.');
      ended.state.activeSeatId = seat.id;
      const move = legalCommands(getPlayerView(ended.state, seat.id)!, { perFamilyLimit: 200 }).find(item => item.command.type === 'move' && item.command.moves.some(route => route.shipId === newShip.id))?.command;
      if (!move || move.type !== 'move') throw new Error('No legal route for the new ship.');
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
      return { build, move, shipId: newShip.id };
    });
    await t.mutation(api.eclipseActionQueue.saveQueue, { ...host, matchId, steps: [
      { id: 'build', command: plan.build },
      { id: 'move', command: { type: 'move', moves: plan.move.moves.map(route => ({ ...route, shipId: route.shipId === plan.shipId ? { kind: 'built-ship' as const, stepId: 'build', buildIndex: 0 } : route.shipId })) } },
    ] });
    await t.mutation(api.eclipseActionQueue.startQueue, { ...host, matchId });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.activeSeatId = 'seat-1';
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    await t.mutation(internal.eclipseActionQueue.runQueue, { matchId, seatId: 'seat-1', token: await workerToken(t, matchId) });
    const journal = await t.run(ctx => ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).collect());
    const final = JSON.parse(journal[journal.length - 1].requestJson) as { command: { type: string; moves?: { shipId: string }[] } };
    expect(final.command.type).toBe('move');
    expect(final.command.moves?.[0].shipId).toBe(plan.shipId);
  });
});
