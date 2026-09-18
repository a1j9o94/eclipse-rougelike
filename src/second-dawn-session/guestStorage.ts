import {
  isGuestCredential,
  type GuestCredential,
} from '../../shared/eclipse/guest';

export interface CredentialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const KEY = 'eclipse.second-dawn.guest.v1';
const pending = new WeakMap<CredentialStorage, Promise<string>>();

/** Storage errors propagate: the UI must not promise resume without durable local identity. */
export async function loadOrCreateGuestCredential(
  storage: CredentialStorage,
  create: () => Promise<GuestCredential>,
): Promise<string> {
  const existing = storage.getItem(KEY);
  if (existing && isGuestCredential(existing)) return existing;
  const active = pending.get(storage);
  if (active) return active;
  const initialize = async () => {
    // Another tab may have initialized identity while this tab waited for the lock.
    const saved = storage.getItem(KEY);
    if (saved && isGuestCredential(saved)) return saved;
    const { credential } = await create();
    if (!isGuestCredential(credential))
      throw new Error('Server returned an invalid guest credential.');
    // Fallback for browsers without Web Locks, and cooperating older clients.
    const concurrent = storage.getItem(KEY);
    if (concurrent && isGuestCredential(concurrent)) return concurrent;
    storage.setItem(KEY, credential);
    return credential;
  };
  const work =
    typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(KEY, initialize)
      : initialize();
  pending.set(storage, work);
  try {
    return await work;
  } finally {
    pending.delete(storage);
  }
}
