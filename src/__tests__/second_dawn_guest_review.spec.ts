import { describe, expect, it } from 'vitest';
import { loadOrCreateGuestCredential } from '../second-dawn-session/guestStorage';

describe('independent guest persistence review', () => {
  it('does not overwrite another tab credential installed while guest creation is awaiting its response', async () => {
    const existingFromOtherTab = `ecl1_${'b'.repeat(64)}`;
    const newlyIssued = `ecl1_${'a'.repeat(64)}`;
    let saved: string | null = null;
    const storage = {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    const result = await loadOrCreateGuestCredential(storage, async () => {
      // A second tab has finished its guest request and may now have a saved match.
      saved = existingFromOtherTab;
      return { credential: newlyIssued };
    });
    expect(result).toBe(existingFromOtherTab);
    expect(saved).toBe(existingFromOtherTab);
  });
});
