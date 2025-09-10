import { describe, it, expect } from 'vitest';

describe('Convex: getPublicRoomsDetailed', () => {
  it('is exported with a handler function', async () => {
    const rooms = await import('../../convex/rooms');
    // The query should be present (Convex query wrapper value)
    expect(rooms).toHaveProperty('getPublicRoomsDetailed');
    // Runtime shape is an object returned by Convex's query() wrapper
    // @ts-expect-error runtime assertion only
    expect(rooms.getPublicRoomsDetailed).toBeTruthy();
  });
});
