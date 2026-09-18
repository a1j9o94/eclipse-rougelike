"use node";

import { webcrypto, timingSafeEqual } from 'node:crypto';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { normalizePlayerName, normalizeRecoveryCode, playerNameForRegistration, validatePlayerPin, type PlayerLogin, type PlayerRegistration } from '../shared/eclipse/playerIdentity';

const profileValidator = v.object({ username: v.string(), pinEnabled: v.boolean() });
const PIN_ITERATIONS = 600_000;
const LOGIN_FAILURE = 'Unable to sign in. Check your player name and secret, or try again in 15 minutes.';
const randomHex = (bytes: number): string => Buffer.from(webcrypto.getRandomValues(new Uint8Array(bytes))).toString('hex');
async function sha256(value: string): Promise<string> {
  return Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex');
}
async function pinHash(pin: string, salt: string, iterations: number): Promise<string> {
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return Buffer.from(await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(salt, 'hex'), iterations }, key, 256)).toString('hex');
}
function matchesHash(actual: string, expected: string): boolean {
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export const registerPlayer = action({
  args: { credential: v.string(), username: v.string(), pin: v.optional(v.string()) },
  returns: v.object({ profile: profileValidator, recoveryCode: v.string() }),
  handler: async (ctx, args): Promise<PlayerRegistration> => {
    const username = playerNameForRegistration(args.username);
    if (args.pin !== undefined) validatePlayerPin(args.pin);
    await ctx.runQuery(internal.eclipsePlayerStore.checkRegistration, { credential: args.credential, username });
    const rawRecovery = randomHex(16);
    const salt = args.pin !== undefined ? randomHex(16) : undefined;
    const profile = await ctx.runMutation(internal.eclipsePlayerStore.storeRegistration, {
      credential: args.credential, username, recoveryHash: await sha256(`eclipse-recovery-v1:${rawRecovery}`),
      ...(args.pin !== undefined && salt ? { pinSalt: salt, pinHash: await pinHash(args.pin, salt, PIN_ITERATIONS), pinIterations: PIN_ITERATIONS } : {}),
    });
    return { profile, recoveryCode: rawRecovery.toUpperCase().match(/.{4}/g)!.join('-') };
  },
});

export const loginPlayer = action({
  args: { username: v.string(), secret: v.string() },
  returns: v.object({ credential: v.string(), profile: profileValidator }),
  handler: async (ctx, { username, secret }): Promise<PlayerLogin> => {
    const normalizedUsername = normalizePlayerName(username);
    if (normalizedUsername.length < 3 || normalizedUsername.length > 24 || secret.length > 100) throw new Error(LOGIN_FAILURE);
    const profile = await ctx.runMutation(internal.eclipsePlayerStore.reserveLoginAttempt, { normalizedUsername });
    if (!profile) throw new Error(LOGIN_FAILURE);
    const recovery = normalizeRecoveryCode(secret);
    let valid = false;
    if (recovery) valid = matchesHash(await sha256(`eclipse-recovery-v1:${recovery}`), profile.recoveryHash);
    else if (/^\d{6,12}$/.test(secret) && profile.pinHash && profile.pinSalt && profile.pinIterations) valid = matchesHash(await pinHash(secret, profile.pinSalt, profile.pinIterations), profile.pinHash);
    if (!valid) throw new Error(LOGIN_FAILURE);
    const credential = `ecl1_${randomHex(32)}`;
    const publicProfile = await ctx.runMutation(internal.eclipsePlayerStore.storeRecoveredSession, { playerId: profile._id, credentialHash: await sha256(credential), ...(recovery ? { verifiedRecoveryHash: profile.recoveryHash } : {}) });
    return { credential, profile: publicProfile };
  },
});

/** A still-authorized browser can replace a code whose registration response was lost. */
export const rotateRecoveryCode = action({
  args: { credential: v.string() },
  returns: v.object({ recoveryCode: v.string() }),
  handler: async (ctx, { credential }): Promise<{ recoveryCode: string }> => {
    const rawRecovery = randomHex(16);
    await ctx.runMutation(internal.eclipsePlayerStore.replaceRecoveryHash, { credential, recoveryHash: await sha256(`eclipse-recovery-v1:${rawRecovery}`) });
    return { recoveryCode: rawRecovery.toUpperCase().match(/.{4}/g)!.join('-') };
  },
});
