import { v } from 'convex/values';
import { internalMutation, internalQuery, query } from './_generated/server';
import { resolveGuest } from './eclipseIdentity';
import { normalizePlayerName, playerNameForRegistration, type PlayerProfile } from '../shared/eclipse/playerIdentity';

export const profileValidator = v.object({ username: v.string(), pinEnabled: v.boolean() });

export const getPlayerProfile = query({
  args: { credential: v.string() },
  returns: v.union(v.null(), profileValidator),
  handler: async (ctx, { credential }): Promise<PlayerProfile | null> => {
    const guest = await resolveGuest(ctx, credential);
    if (!guest) return null;
    const profile = await ctx.db.query('eclipsePlayersV1').withIndex('by_guest', q => q.eq('guestId', guest._id)).unique();
    return profile ? { username: profile.username, pinEnabled: !!profile.pinHash } : null;
  },
});

export const checkRegistration = internalQuery({
  args: { credential: v.string(), username: v.string() },
  returns: v.null(),
  handler: async (ctx, { credential, username }) => {
    const guest = await resolveGuest(ctx, credential);
    if (!guest) throw new Error('Guest session required.');
    const owned = await ctx.db.query('eclipsePlayersV1').withIndex('by_guest', q => q.eq('guestId', guest._id)).unique();
    if (owned) throw new Error('This identity already has a player name.');
    const existing = await ctx.db.query('eclipsePlayersV1').withIndex('by_username', q => q.eq('normalizedUsername', normalizePlayerName(username))).unique();
    if (existing) throw new Error('That player name is already in use.');
    return null;
  },
});

export const storeRegistration = internalMutation({
  args: { credential: v.string(), username: v.string(), recoveryHash: v.string(), pinSalt: v.optional(v.string()), pinHash: v.optional(v.string()), pinIterations: v.optional(v.number()) },
  returns: profileValidator,
  handler: async (ctx, args): Promise<PlayerProfile> => {
    const username = playerNameForRegistration(args.username);
    const normalizedUsername = normalizePlayerName(username);
    const guest = await resolveGuest(ctx, args.credential);
    if (!guest) throw new Error('Guest session required.');
    const owned = await ctx.db.query('eclipsePlayersV1').withIndex('by_guest', q => q.eq('guestId', guest._id)).unique();
    if (owned) throw new Error('This identity already has a player name.');
    const existing = await ctx.db.query('eclipsePlayersV1').withIndex('by_username', q => q.eq('normalizedUsername', normalizedUsername)).unique();
    if (existing) throw new Error('That player name is already in use.');
    if (!/^[a-f0-9]{64}$/.test(args.recoveryHash) || (args.pinHash && (!/^[a-f0-9]{64}$/.test(args.pinHash) || !/^[a-f0-9]{32}$/.test(args.pinSalt ?? '') || args.pinIterations !== 600_000))) throw new Error('Invalid player secret storage.');
    await ctx.db.insert('eclipsePlayersV1', { guestId: guest._id, username, normalizedUsername, recoveryHash: args.recoveryHash, ...(args.pinHash ? { pinSalt: args.pinSalt, pinHash: args.pinHash, pinIterations: args.pinIterations } : {}), createdAt: Date.now() });
    return { username, pinEnabled: !!args.pinHash };
  },
});

/** Reserve a guess before expensive hashing. Failed actions do not roll this mutation back. */
export const reserveLoginAttempt = internalMutation({
  args: { normalizedUsername: v.string() },
  handler: async (ctx, { normalizedUsername }) => {
    const now = Date.now();
    const limit = await ctx.db.query('eclipsePlayerLoginLimitsV1').withIndex('by_username', q => q.eq('normalizedUsername', normalizedUsername)).unique();
    if (limit && limit.resetAt > now && limit.attempts >= 5) return null;
    const resetAt = limit && limit.resetAt > now ? limit.resetAt : now + 15 * 60_000;
    const attempts = limit && limit.resetAt > now ? limit.attempts + 1 : 1;
    if (limit) await ctx.db.patch(limit._id, { attempts, resetAt });
    else await ctx.db.insert('eclipsePlayerLoginLimitsV1', { normalizedUsername, attempts, resetAt });
    const profile = await ctx.db.query('eclipsePlayersV1').withIndex('by_username', q => q.eq('normalizedUsername', normalizedUsername)).unique();
    return profile;
  },
});

export const storeRecoveredSession = internalMutation({
  args: { playerId: v.id('eclipsePlayersV1'), credentialHash: v.string(), verifiedRecoveryHash: v.optional(v.string()) },
  returns: profileValidator,
  handler: async (ctx, { playerId, credentialHash, verifiedRecoveryHash }): Promise<PlayerProfile> => {
    const profile = await ctx.db.get(playerId);
    if (!profile || !/^[a-f0-9]{64}$/.test(credentialHash)) throw new Error('Unable to sign in. Check your player name and secret, or try again in 15 minutes.');
    if (verifiedRecoveryHash !== undefined && profile.recoveryHash !== verifiedRecoveryHash) throw new Error('Unable to sign in. Check your player name and secret, or try again in 15 minutes.');
    const original = await ctx.db.query('eclipseGuestsV1').withIndex('by_credential_hash', q => q.eq('credentialHash', credentialHash)).unique();
    const session = await ctx.db.query('eclipsePlayerSessionsV1').withIndex('by_credential_hash', q => q.eq('credentialHash', credentialHash)).unique();
    if (original || session) throw new Error('Credential collision. Retry sign in.');
    await ctx.db.insert('eclipsePlayerSessionsV1', { guestId: profile.guestId, credentialHash, createdAt: Date.now() });
    const limit = await ctx.db.query('eclipsePlayerLoginLimitsV1').withIndex('by_username', q => q.eq('normalizedUsername', profile.normalizedUsername)).unique();
    if (limit) await ctx.db.delete(limit._id);
    return { username: profile.username, pinEnabled: !!profile.pinHash };
  },
});

export const replaceRecoveryHash = internalMutation({
  args: { credential: v.string(), recoveryHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { credential, recoveryHash }) => {
    const guest = await resolveGuest(ctx, credential);
    const profile = guest ? await ctx.db.query('eclipsePlayersV1').withIndex('by_guest', q => q.eq('guestId', guest._id)).unique() : null;
    if (!profile) throw new Error('Registered player session required.');
    if (!/^[a-f0-9]{64}$/.test(recoveryHash)) throw new Error('Invalid recovery hash.');
    await ctx.db.patch(profile._id, { recoveryHash });
    return null;
  },
});
