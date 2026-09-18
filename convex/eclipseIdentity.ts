import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { hashGuestCredential } from '../shared/eclipse/guest';

type ReadContext = Pick<QueryCtx, 'db'>;

/** Both original browser guests and independent recovered sessions resolve to one owner. */
export async function resolveGuest(ctx: ReadContext, credential: string): Promise<Doc<'eclipseGuestsV1'> | null> {
  const credentialHash = await hashGuestCredential(credential);
  if (!credentialHash) return null;
  const original = await ctx.db.query('eclipseGuestsV1').withIndex('by_credential_hash', q => q.eq('credentialHash', credentialHash)).unique();
  if (original) return original;
  const session = await ctx.db.query('eclipsePlayerSessionsV1').withIndex('by_credential_hash', q => q.eq('credentialHash', credentialHash)).unique();
  return session ? ctx.db.get(session.guestId) : null;
}

export async function playerNameForGuest(ctx: ReadContext, guestId: Id<'eclipseGuestsV1'>): Promise<string | null> {
  const profile = await ctx.db.query('eclipsePlayersV1').withIndex('by_guest', q => q.eq('guestId', guestId)).unique();
  return profile?.username ?? null;
}
