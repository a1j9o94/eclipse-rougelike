import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import { finishDispatchedAi } from './aiWorkerTestSupport';
import type { GameState } from '../../shared/eclipse/types';
import { profileVersions } from '../../shared/eclipse/catalog';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
const settings = { humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: true, factionProfile: 'expanded-v1' as const };
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('persists independently colored expanded factions and accepts commands with their pinned versions', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: 'midas', pieceColor: 'blue' });
  await expect(t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: 'ragnarok', pieceColor: 'blue' })).rejects.toThrow('color');
  await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: 'ragnarok', pieceColor: 'red' });
  await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
  await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
  const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
  const view = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
  expect(view).toMatchObject({ riftCannons: true, ...profileVersions('expanded-v1', true), factionProfile: 'expanded-v1', seats: [{ faction: 'midas', pieceColor: 'blue' }, { faction: 'ragnarok', pieceColor: 'red' }] });
  const command = { ...host, matchId, commandId: 'expanded-pass', expectedRevision: 0, command: { type: 'pass' as const } };
  expect(await t.mutation(api.eclipseMatches.submitCommand, command)).toMatchObject({ ok: true, duplicate: false });
  expect(await t.mutation(api.eclipseMatches.submitCommand, command)).toMatchObject({ ok: true, duplicate: true });
});

it('keeps omitted profiles base and clears incompatible choices before readying a changed room', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const base = { humanSeatCount: 1, aiCount: 1, timerMs: 30_000, warpPortals: true };
  await expect(t.mutation(api.eclipseRooms.createRoom, { ...host, settings: base, faction: 'midas' })).rejects.toThrow('profile');
  const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings: { ...base, factionProfile: 'expanded-v1' }, faction: 'midas', pieceColor: 'green' });
  await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
  const changed = await t.mutation(api.eclipseRooms.updateRoomSettings, { ...host, roomToken: room.roomToken, settings: { ...base, factionProfile: 'base' } });
  expect(changed.seats[0]).toMatchObject({ faction: null, ready: false });
  await expect(t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true })).rejects.toThrow('faction');
  await expect(t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken })).rejects.toThrow('ready');
});

it('creates every supported solo size with unique colors and preserves the expanded profile through commands', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  for (const aiCount of [1, 2, 3, 4, 5]) {
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { ...host, aiCount, factionProfile: 'expanded-v1', faction: 'rho-indi', pieceColor: 'white' });
    const view = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    expect(view?.riftCannons).toBe(true);
    expect(view?.seats).toHaveLength(aiCount + 1);
    expect(new Set(view?.seats.map(seat => seat.faction)).size).toBe(aiCount + 1);
    expect(new Set(view?.seats.map(seat => seat.pieceColor)).size).toBe(aiCount + 1);
    expect(view?.seats[0]).toMatchObject({ faction: 'rho-indi', pieceColor: 'white' });
    expect(view).not.toHaveProperty('random');
    expect(view).not.toHaveProperty('supplies');
  }
});

it('preserves an expanded room profile through old-client settings updates and clears base board collisions', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: 'eridani', pieceColor: 'red' });
  await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: 'terran-directorate', pieceColor: 'blue' });
  const oldSettings = { humanSeatCount: 2, aiCount: 0, timerMs: 60_000, warpPortals: false };
  expect((await t.mutation(api.eclipseRooms.updateRoomSettings, { ...host, roomToken: room.roomToken, settings: oldSettings })).settings.factionProfile).toBe('expanded-v1');
  const changed = await t.mutation(api.eclipseRooms.updateRoomSettings, { ...host, roomToken: room.roomToken, settings: { ...oldSettings, factionProfile: 'base' } });
  expect(changed.seats).toMatchObject([{ faction: 'eridani', pieceColor: 'red', ready: false }, { faction: null, ready: false }]);
});


it('commits an expanded AI decision under the saved version pin and rejects stale worker retries', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { ...host, aiCount: 1, factionProfile: 'expanded-v1', faction: 'midas', pieceColor: 'blue' });
  await t.run(async ctx => {
    const row = await ctx.db.get(matchId);
    const state = JSON.parse(row!.snapshotJson) as GameState;
    state.activeSeatId = 'seat-2';
    await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
    if (job) await ctx.db.patch(job._id, { status: 'scheduled', expectedRevision: 0 });
    else await ctx.db.insert('eclipseAiJobsV1', { matchId, status: 'scheduled', expectedRevision: 0, attempts: 0, error: null, updatedAt: Date.now() });
  });
  await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 0 });
  await finishDispatchedAi(t);
  expect(await t.query(api.eclipseMatches.getMatchView, { ...host, matchId })).toMatchObject({ revision: 1, factionProfile: 'expanded-v1', ...profileVersions('expanded-v1', true) });
  await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 0 });
  await finishDispatchedAi(t);
  expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))?.revision).toBe(1);
});

it('accepts the Magellan resource conversion through the same owned command boundary', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { ...host, aiCount: 1, factionProfile: 'expanded-v1', faction: 'magellan' });
  const before = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
  const request = { ...host, matchId, commandId: 'colony-resource', expectedRevision: 0, command: { type: 'convert-colony-ship' as const, resource: 'science' as const } };
  expect(await t.mutation(api.eclipseMatches.submitCommand, { ...request, ...stranger })).toMatchObject({ ok: false, error: { code: 'NOT_A_SEAT' } });
  expect(await t.mutation(api.eclipseMatches.submitCommand, request)).toMatchObject({ ok: true });
  const after = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
  expect(after!.seats[0].resources.science).toBe(before!.seats[0].resources.science + 1);
  expect(after!.seats[0].colonyShipsAvailable).toBe(before!.seats[0].colonyShipsAvailable - 1);
  expect(await t.mutation(api.eclipseMatches.submitCommand, { ...request, commandId: 'stale-conversion' })).toMatchObject({ ok: false, error: { code: 'STALE_REVISION' } });
});

it('continues a pre-expansion snapshot with no profile or piece-color fields', async () => {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { ...host, aiCount: 1 });
  await t.run(async ctx => {
    const row = await ctx.db.get(matchId);
    const state = JSON.parse(row!.snapshotJson) as GameState;
    delete state.factionProfile;
    delete state.engine!.riftCannons;
    Object.assign(state, profileVersions('base'));
    state.technologyMarket=state.technologyMarket.filter(id=>id!=='rift-cannon');
    state.supplies.technology=state.supplies.technology.filter(id=>id!=='rift-cannon');
    state.supplies.discovery=state.supplies.discovery.filter(id=>!id.startsWith('rift-conductor'));
    for (const seat of state.seats) delete seat.pieceColor;
    await ctx.db.patch(matchId, { ...profileVersions('base'), snapshotJson: JSON.stringify(state) });
  });
  expect(await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'old-save-pass', expectedRevision: 0, command: { type: 'pass' } })).toMatchObject({ ok: true });
  expect(await t.query(api.eclipseMatches.getMatchView, { ...host, matchId })).toMatchObject({ revision: 1, ...profileVersions('base') });
});
