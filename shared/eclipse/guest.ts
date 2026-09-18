export interface GuestCredential {
  credential: string;
}
export function isGuestCredential(credential: string): boolean {
  return /^ecl1_[a-f0-9]{64}$/.test(credential);
}
const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Deterministic hash usable inside the same transaction as seat authorization. */
export async function hashGuestCredential(
  credential: string,
): Promise<string | null> {
  if (!isGuestCredential(credential)) return null;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(credential),
  );
  return hex(new Uint8Array(digest));
}

/** Invoke only from a server action. Never seed identity credentials from gameplay RNG. */
export async function issueGuestCredential(
  persistHash: (hash: string) => Promise<void>,
): Promise<GuestCredential> {
  const credential = `ecl1_${hex(crypto.getRandomValues(new Uint8Array(32)))}`;
  const hash = await hashGuestCredential(credential);
  if (!hash) throw new Error('Credential generation failed.');
  await persistHash(hash);
  return { credential };
}
