import { v } from 'convex/values';
import { action, internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import {
  issueGuestCredential,
  type GuestCredential,
} from '../shared/eclipse/guest';
import { resolveGuest } from './eclipseIdentity';

export const createGuestSession = action({
  args: {},
  returns: v.object({ credential: v.string() }),
  handler: async (ctx): Promise<GuestCredential> =>
    issueGuestCredential(async (credentialHash) => {
      await ctx.runMutation(internal.eclipseGuests.storeGuest, {
        credentialHash,
      });
    }),
});

export const storeGuest = internalMutation({
  args: { credentialHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { credentialHash }) => {
    if (!/^[a-f0-9]{64}$/.test(credentialHash))
      throw new Error('Invalid credential hash.');
    const existing = await ctx.db
      .query('eclipseGuestsV1')
      .withIndex('by_credential_hash', (q) =>
        q.eq('credentialHash', credentialHash),
      )
      .unique();
    const recovered = await ctx.db.query('eclipsePlayerSessionsV1')
      .withIndex('by_credential_hash', q => q.eq('credentialHash', credentialHash))
      .unique();
    if (existing || recovered)
      throw new Error('Credential collision. Retry guest creation.');
    await ctx.db.insert('eclipseGuestsV1', {
      credentialHash,
      createdAt: Date.now(),
    });
    return null;
  },
});

/** A resume check exposes no account enumeration, seat claims, or stored hashes. */
export const getGuestSession = query({
  args: { credential: v.string() },
  returns: v.union(v.null(), v.object({ guestId: v.id('eclipseGuestsV1') })),
  handler: async (ctx, { credential }) => {
    const guest = await resolveGuest(ctx, credential);
    return guest ? { guestId: guest._id } : null;
  },
});
