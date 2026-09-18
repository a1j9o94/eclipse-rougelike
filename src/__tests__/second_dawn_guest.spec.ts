import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  issueGuestCredential,
  hashGuestCredential,
} from '../../shared/eclipse/guest';
import { loadOrCreateGuestCredential } from '../second-dawn-session/guestStorage';

afterEach(() => vi.unstubAllGlobals());
describe('Second Dawn guest credentials', () => {
  it('generates separate 256-bit credentials and persists only their hashes', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const saved: string[] = [];
    const persist = async (hash: string) => {
      saved.push(hash);
    };
    const a = await issueGuestCredential(persist);
    const b = await issueGuestCredential(persist);
    expect(a.credential).toMatch(/^ecl1_[a-f0-9]{64}$/);
    expect(a.credential).not.toBe(b.credential);
    expect(saved).toEqual([
      await hashGuestCredential(a.credential),
      await hashGuestCredential(b.credential),
    ]);
    expect(JSON.stringify(saved)).not.toContain(a.credential);
  });
  it('does not return a credential when authoritative storage fails', async () => {
    vi.stubGlobal('crypto', webcrypto);
    await expect(
      issueGuestCredential(async () => {
        throw Error('offline');
      }),
    ).rejects.toThrow('offline');
  });
  it('rejects malformed credentials before hashing', async () => {
    vi.stubGlobal('crypto', webcrypto);
    for (const value of [
      '',
      'ecl1_abc',
      'x'.repeat(5000),
      `ecl1_${'A'.repeat(64)}`,
    ]) {
      expect(await hashGuestCredential(value)).toBeNull();
    }
  });
  it('retains the same server credential across browser restarts without touching legacy saves', async () => {
    localStorage.clear();
    localStorage.setItem('legacy-save', 'unchanged');
    const create = vi.fn(async () => ({
      credential: `ecl1_${'a'.repeat(64)}`,
    }));
    const first = await loadOrCreateGuestCredential(localStorage, create);
    const reopened = await loadOrCreateGuestCredential(localStorage, create);
    expect(first).toBe(reopened);
    expect(create).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('legacy-save')).toBe('unchanged');
  });
  it('coalesces concurrent creation requests for the same storage', async () => {
    localStorage.clear();
    const create = vi.fn(async () => ({
      credential: `ecl1_${'b'.repeat(64)}`,
    }));
    const credentials = await Promise.all([
      loadOrCreateGuestCredential(localStorage, create),
      loadOrCreateGuestCredential(localStorage, create),
    ]);
    expect(credentials[0]).toBe(credentials[1]);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('surfaces unavailable storage rather than claiming resumable saves', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw Error('Storage disabled');
      },
    };
    await expect(
      loadOrCreateGuestCredential(storage, async () => ({
        credential: `ecl1_${'c'.repeat(64)}`,
      })),
    ).rejects.toThrow('Storage disabled');
  });
});

it('uses an origin-wide browser lock to serialize guest creation across tabs', async () => {
  localStorage.clear();
  const request = vi.fn(
    async (_name: string, operation: () => Promise<string>) => operation(),
  );
  vi.stubGlobal('navigator', { locks: { request } });
  const result = await loadOrCreateGuestCredential(localStorage, async () => ({
    credential: `ecl1_${'d'.repeat(64)}`,
  }));
  expect(result).toBe(`ecl1_${'d'.repeat(64)}`);
  expect(request).toHaveBeenCalledWith(
    'eclipse.second-dawn.guest.v1',
    expect.any(Function),
  );
});
