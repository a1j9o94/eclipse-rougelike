import { describe, it, expect } from 'vitest';

// We will import the hook once implemented
describe('usePublicRooms hook', () => {
  it('exposes rooms and loading state', async () => {
    const mod = await import('../hooks/usePublicRooms').catch(() => null);
    expect(mod).toBeTruthy(); // fail first until hook exists
    if (!mod) return;
    expect(typeof mod.usePublicRooms).toBe('function');
  });
});
