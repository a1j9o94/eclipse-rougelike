import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('recoverable Second Dawn players', () => {
  it('attaches existing solo ownership and restores the same private seat with fresh independent credentials', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
    const before = await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId });
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: '  Star Pilot  ', pin: '735190' });
    expect(registered.profile).toEqual({ username: 'Star Pilot', pinEnabled: true });
    expect(registered.recoveryCode.replaceAll('-', '')).toMatch(/^[A-F0-9]{32}$/);
    const login = await t.action(api.eclipsePlayers.loginPlayer, { username: 'star pilot', secret: '735190' });
    const recovered = await t.action(api.eclipsePlayers.loginPlayer, { username: 'STAR PILOT', secret: registered.recoveryCode.toLowerCase() });
    expect(new Set([guest.credential, login.credential, recovered.credential]).size).toBe(3);
    for (const credential of [guest.credential, login.credential, recovered.credential]) {
      expect(await t.query(api.eclipseMatches.getMatchView, { credential, matchId })).toEqual({ ...before, playerNames: { 'seat-1': 'Star Pilot' } });
      expect(await t.query(api.eclipseMatches.listMyMatches, { credential })).toHaveLength(1);
      expect(await t.query(api.eclipsePlayerStore.getPlayerProfile, { credential })).toEqual(registered.profile);
      expect(await t.query(api.eclipseGuests.getGuestSession, { credential })).toEqual(await t.query(api.eclipseGuests.getGuestSession, guest));
    }
    const stored = await t.run(async ctx => ({ profiles: await ctx.db.query('eclipsePlayersV1').collect(), sessions: await ctx.db.query('eclipsePlayerSessionsV1').collect() }));
    expect(stored.profiles).toHaveLength(1);
    expect(stored.sessions).toHaveLength(2);
    expect(JSON.stringify(stored)).not.toContain(registered.recoveryCode);
    expect(JSON.stringify(stored)).not.toContain('735190');
    expect(JSON.stringify(stored)).not.toContain(login.credential);
  });

  it('requires a recovery secret when PIN is omitted and never grants access by username alone', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Nebula' });
    expect(registered.profile.pinEnabled).toBe(false);
    for (const secret of ['', 'Nebula', '123456']) await expect(t.action(api.eclipsePlayers.loginPlayer, { username: 'Nebula', secret })).rejects.toThrow('Unable to sign in');
    expect(await t.query(api.eclipsePlayerStore.getPlayerProfile, { credential: 'Nebula' })).toBeNull();
    expect((await t.action(api.eclipsePlayers.loginPlayer, { username: 'Nebula', secret: registered.recoveryCode })).profile).toEqual(registered.profile);
  });

  it('atomically limits guesses including concurrent requests and releases the limit after cooldown', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Protected' });
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => t.action(api.eclipsePlayers.loginPlayer, { username: 'Protected', secret: '999999' })));
    expect(attempts.every(result => result.status === 'rejected')).toBe(true);
    await expect(t.action(api.eclipsePlayers.loginPlayer, { username: 'Protected', secret: registered.recoveryCode })).rejects.toThrow('Unable to sign in');
    expect(await t.run(ctx => ctx.db.query('eclipsePlayerSessionsV1').collect())).toHaveLength(0);
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await t.action(api.eclipsePlayers.loginPlayer, { username: 'Protected', secret: registered.recoveryCode })).profile.username).toBe('Protected');
  });

  it('enforces username uniqueness and a single profile per existing owner during registration races', async () => {
    const t = convexTest(schema, modules);
    const first = await t.action(api.eclipseGuests.createGuestSession, {});
    const second = await t.action(api.eclipseGuests.createGuestSession, {});
    const results = await Promise.allSettled([
      t.action(api.eclipsePlayers.registerPlayer, { ...first, username: 'Nova' }),
      t.action(api.eclipsePlayers.registerPlayer, { ...second, username: ' nova ' }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const owner = results[0].status === 'fulfilled' ? first : second;
    await expect(t.action(api.eclipsePlayers.registerPlayer, { ...owner, username: 'Different' })).rejects.toThrow('already has a player name');
    expect(await t.run(ctx => ctx.db.query('eclipsePlayersV1').collect())).toHaveLength(1);
  });

  it('validates names, PINs, and guest ownership before registering', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    for (const pin of ['1', 'abcdef', '1234567890123']) await expect(t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Valid', pin })).rejects.toThrow('6–12 digits');
    for (const username of ['a', 'a'.repeat(25), '<script>']) await expect(t.action(api.eclipsePlayers.registerPlayer, { ...guest, username })).rejects.toThrow('Player name');
    await expect(t.action(api.eclipsePlayers.registerPlayer, { credential: 'invalid', username: 'Valid' })).rejects.toThrow('Guest session required');
    expect(await t.run(ctx => ctx.db.query('eclipsePlayersV1').collect())).toHaveLength(0);
  });

  it('restores multiplayer seat membership and exposes only the display name to another room guest', async () => {
    const t = convexTest(schema, modules);
    const first = await t.action(api.eclipseGuests.createGuestSession, {});
    const second = await t.action(api.eclipseGuests.createGuestSession, {});
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...first, username: 'Room Pilot' });
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...first, faction: 'eridani', settings: { humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: false } });
    await t.mutation(api.eclipseRooms.joinRoom, { ...second, roomToken: room.roomToken, faction: 'hydran' });
    const login = await t.action(api.eclipsePlayers.loginPlayer, { username: 'room pilot', secret: registered.recoveryCode });
    const oldLobby = await t.query(api.eclipseRooms.getRoom, { ...first, roomToken: room.roomToken });
    const restored = await t.query(api.eclipseRooms.getRoom, { credential: login.credential, roomToken: room.roomToken });
    expect(restored).toEqual(oldLobby);
    expect(await t.query(api.eclipseRooms.listMyRooms, { credential: login.credential })).toHaveLength(1);
    const publicLobby = await t.query(api.eclipseRooms.getRoom, { ...second, roomToken: room.roomToken });
    expect(JSON.stringify(publicLobby)).toContain('Room Pilot');
    expect(JSON.stringify(publicLobby)).not.toContain('pinHash');
    expect(JSON.stringify(publicLobby)).not.toContain('recoveryHash');
    expect(JSON.stringify(publicLobby)).not.toContain(registered.recoveryCode);
    expect(await t.query(api.eclipsePlayerStore.getPlayerProfile, second)).toBeNull();
  });

  it('prevents original guest creation from shadowing a recovered session hash', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Collision Pilot' });
    await t.action(api.eclipsePlayers.loginPlayer, { username: 'Collision Pilot', secret: registered.recoveryCode });
    const session = await t.run(ctx => ctx.db.query('eclipsePlayerSessionsV1').unique());
    await expect(t.mutation(internal.eclipseGuests.storeGuest, { credentialHash: session!.credentialHash })).rejects.toThrow('Credential collision');
    expect(await t.run(ctx => ctx.db.query('eclipseGuestsV1').collect())).toHaveLength(1);
  });

  it('replaces a lost recovery code from an authorized device, revokes the old code, and preserves device sessions', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Recovery Pilot' });
    const second = await t.action(api.eclipsePlayers.loginPlayer, { username: 'Recovery Pilot', secret: registered.recoveryCode });
    const replacement = await t.action(api.eclipsePlayers.rotateRecoveryCode, { credential: second.credential });
    expect(replacement.recoveryCode).not.toBe(registered.recoveryCode);
    await expect(t.action(api.eclipsePlayers.loginPlayer, { username: 'Recovery Pilot', secret: registered.recoveryCode })).rejects.toThrow('Unable to sign in');
    expect((await t.action(api.eclipsePlayers.loginPlayer, { username: 'Recovery Pilot', secret: replacement.recoveryCode })).profile).toEqual(registered.profile);
    expect(await t.query(api.eclipsePlayerStore.getPlayerProfile, guest)).toEqual(registered.profile);
    expect(await t.query(api.eclipsePlayerStore.getPlayerProfile, { credential: second.credential })).toEqual(registered.profile);
    const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
    await expect(t.action(api.eclipsePlayers.rotateRecoveryCode, stranger)).rejects.toThrow('Registered player session required');
    await expect(t.action(api.eclipsePlayers.rotateRecoveryCode, { credential: 'Recovery Pilot' })).rejects.toThrow('Registered player session required');
  });

  it('releases guess reservations after successful authentication so normal device switching does not lock the player out', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const registered = await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Many Devices' });
    for (let index = 0; index < 7; index++) {
      expect((await t.action(api.eclipsePlayers.loginPlayer, { username: 'Many Devices', secret: registered.recoveryCode })).profile).toEqual(registered.profile);
    }
  });

  it('rejects an in-flight login verified against a recovery hash that rotated before session insertion', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    await t.action(api.eclipsePlayers.registerPlayer, { ...guest, username: 'Rotation Race' });
    const oldProfile = await t.run(ctx => ctx.db.query('eclipsePlayersV1').unique());
    await t.action(api.eclipsePlayers.rotateRecoveryCode, guest);
    await expect(t.mutation(internal.eclipsePlayerStore.storeRecoveredSession, {
      playerId: oldProfile!._id, credentialHash: 'b'.repeat(64), verifiedRecoveryHash: oldProfile!.recoveryHash,
    })).rejects.toThrow('Unable to sign in');
    expect(await t.run(ctx => ctx.db.query('eclipsePlayerSessionsV1').collect())).toHaveLength(0);
  });
});
