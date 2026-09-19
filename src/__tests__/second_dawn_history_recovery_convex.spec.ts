import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import type { GameState } from '../../shared/eclipse/types';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function historicGame(count = 3, retainedCheckpoint?: number) {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { ...host, aiCount: 1 });
  const initial = await t.run(async ctx => (await ctx.db.get(matchId))!.snapshotJson);
  for (let index = 0; index < count; index++) {
    expect(await t.mutation(api.eclipseMatches.submitCommand, {
      ...host, matchId, commandId: `historical-${index}`, expectedRevision: index,
      command: { type: 'set-auto-pass', enabled: index % 2 === 0 },
    })).toMatchObject({ ok: true });
  }
  await t.run(async ctx => {
    const rows = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).collect();
    for (const row of rows) if (row.revision !== retainedCheckpoint) await ctx.db.patch(row._id, { preSnapshotJson: undefined });
  });
  return { t, host, matchId, initial };
}

describe('private verified historical checkpoint recovery', () => {
  it('recovers an old checkpoint, leaves the live game unchanged, then uses normal rollback', async () => {
    const { t, host, matchId, initial } = await historicGame();
    const before = await t.run(ctx => ctx.db.get(matchId));
    const args = { ...host, matchId, targetRevision: 1 };
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, args)).toEqual({ ok: true });
    expect(await t.run(ctx => ctx.db.get(matchId))).toEqual(before);
    const checkpoint = await t.run(async ctx => (await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId).eq('revision', 1)).unique())!.preSnapshotJson);
    expect(JSON.parse(checkpoint!)).toEqual(JSON.parse(initial));
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, args)).toEqual({ ok: true });
    expect((await t.mutation(api.eclipseRollback.requestRollback, { ...args, expectedRevision: 3 })).lastResolution?.status).toBe('applied');
    const restored = await t.run(async ctx => JSON.parse((await ctx.db.get(matchId))!.snapshotJson) as GameState);
    expect(restored).toEqual({ ...JSON.parse(initial), revision: restored.revision });
  });
  it('pages through more than 100 commands and uses the earliest retained anchor', async () => {
    const { t, host, matchId } = await historicGame(105, 101);
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, { ...host, matchId, targetRevision: 1 })).toEqual({ ok: true });
    const checkpoints = await t.run(async ctx => (await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).collect()).filter(row => row.preSnapshotJson));
    expect(checkpoints.map(row => row.revision)).toEqual([1, 101]);
  });
  it('rejects strangers and leaves missing checkpoints untouched', async () => {
    const { t, matchId } = await historicGame();
    const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, { ...stranger, matchId, targetRevision: 1 })).toMatchObject({ ok: false });
    const rows = await t.run(ctx => ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).collect());
    expect(rows.every(row => !row.preSnapshotJson)).toBe(true);
  });
  it('does not persist a reconstruction when full hidden state differs', async () => {
    const { t, host, matchId } = await historicGame();
    await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.privateSeats[0].reputation.push(4);
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    const result = await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, { ...host, matchId, targetRevision: 1 });
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toMatch(/preSnapshot|privateSeats|reputation|credential|supplies/);
    expect(await t.run(async ctx => (await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId).eq('revision', 1)).unique())!.preSnapshotJson ?? null)).toBeNull();
  });
  it('rejects a resignation boundary', async () => {
    const { t, host, matchId } = await historicGame();
    await t.mutation(api.eclipseMatches.resignMatch, { ...host, matchId, commandId: 'quit', expectedRevision: 3 });
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, { ...host, matchId, targetRevision: 1 })).toMatchObject({ ok: false });
  });
  it('revalidates an immutable anchor when commands advance during proof', async () => {
    const { t, host, matchId, initial } = await historicGame();
    const prepared = await t.query(internal.eclipseHistoryRecovery.prepareRecovery, { ...host, matchId, targetRevision: 1, afterRevision: 0 });
    if (prepared.kind !== 'ready') throw new Error('Expected a current snapshot anchor');
    await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'advanced', expectedRevision: 3, command: { type: 'set-auto-pass', enabled: false } });
    expect(await t.mutation(internal.eclipseHistoryRecovery.storeRecoveredCheckpoint, {
      ...host, matchId, targetRevision: 1, proof: prepared.proof, checkpointJson: initial,
    })).toEqual({ ok: true });
    expect((await t.run(ctx => ctx.db.get(matchId)))!.revision).toBe(4);
  });
  it('rejects another human participant who is not the room host', async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const { roomToken } = await t.mutation(api.eclipseRooms.createRoom, { ...host, faction: 'terran-directorate', settings: { humanSeatCount: 2, aiCount: 0, timerMs: 30000, warpPortals: true } });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken, faction: 'hydran' });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken, ready: true });
    const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken });
    await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'one', expectedRevision: 0, command: { type: 'set-auto-pass', enabled: true } });
    await t.run(async ctx => {
      const row = (await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).first())!;
      await ctx.db.patch(row._id, { preSnapshotJson: undefined });
    });
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, { ...guest, matchId, targetRevision: 1 })).toEqual({ ok: false, reason: 'Only the active room host can recover an older action.' });
  });
  it('does not store when the trusted anchor changed after replay', async () => {
    const { t, host, matchId, initial } = await historicGame();
    const prepared = await t.query(internal.eclipseHistoryRecovery.prepareRecovery, { ...host, matchId, targetRevision: 1, afterRevision: 0 });
    if (prepared.kind !== 'ready') throw new Error('Expected current snapshot anchor');
    await t.run(async ctx => {
      const match = (await ctx.db.get(matchId))!;
      const state = JSON.parse(match.snapshotJson) as GameState;
      state.seats[0].resources.money++;
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    expect(await t.mutation(internal.eclipseHistoryRecovery.storeRecoveredCheckpoint, {
      ...host, matchId, targetRevision: 1, proof: prepared.proof, checkpointJson: initial,
    })).toEqual({ ok: false, reason: 'The verification position changed. Try again.' });
    expect(await t.run(async ctx => (await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId).eq('revision', 1)).unique())!.preSnapshotJson ?? null)).toBeNull();
  });
  it('never recovers an action discarded by an undo, including an in-flight proof', async () => {
    const { t, host, matchId, initial } = await historicGame();
    const args = { ...host, matchId, targetRevision: 1 };
    const prepared = await t.query(internal.eclipseHistoryRecovery.prepareRecovery, { ...args, afterRevision: 0 });
    if (prepared.kind !== 'ready') throw new Error('Expected current snapshot anchor');
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, args)).toEqual({ ok: true });
    await t.mutation(api.eclipseRollback.requestRollback, { ...args, expectedRevision: 3 });
    const failure = { ok: false, reason: 'This action was removed by an undo and is no longer part of this game.' };
    expect(await t.action(api.eclipseHistoryRecovery.recoverCheckpoint, args)).toEqual(failure);
    expect(await t.mutation(internal.eclipseHistoryRecovery.storeRecoveredCheckpoint, { ...args, proof: prepared.proof, checkpointJson: initial })).toEqual(failure);
  });
});
