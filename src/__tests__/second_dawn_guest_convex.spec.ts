import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

describe('Convex Second Dawn guest storage adapter', () => {
  it('creates and resumes a guest using a hash-only isolated table', async () => {
    const t = convexTest(schema, modules);
    const result = await t.action(api.eclipseGuests.createGuestSession, {});
    const first = await t.query(api.eclipseGuests.getGuestSession, result);
    const resumed = await t.query(api.eclipseGuests.getGuestSession, result);
    expect(first).not.toBeNull();
    expect(resumed).toEqual(first);
    const rows = await t.run((ctx) =>
      ctx.db.query('eclipseGuestsV1').collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].credentialHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(result.credential);
    expect(await t.run((ctx) => ctx.db.query('rooms').collect())).toEqual([]);
  });
  it('rejects altered, absent and malformed credentials without exposing a hash', async () => {
    const t = convexTest(schema, modules);
    const { credential } = await t.action(
      api.eclipseGuests.createGuestSession,
      {},
    );
    const altered =
      credential.slice(0, -1) + (credential.endsWith('0') ? '1' : '0');
    for (const invalid of [altered, '', 'ecl1_bad']) {
      expect(
        await t.query(api.eclipseGuests.getGuestSession, {
          credential: invalid,
        }),
      ).toBeNull();
    }
  });
  it('rejects a hash collision atomically and keeps the original session', async () => {
    const t = convexTest(schema, modules);
    const credentialHash = 'a'.repeat(64);
    await t.mutation(internal.eclipseGuests.storeGuest, { credentialHash });
    await expect(
      t.mutation(internal.eclipseGuests.storeGuest, { credentialHash }),
    ).rejects.toThrow('Credential collision');
    expect(
      await t.run((ctx) => ctx.db.query('eclipseGuestsV1').collect()),
    ).toHaveLength(1);
  });
});
