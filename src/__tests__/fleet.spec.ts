import { describe, it, expect } from 'vitest';
import { makeShip, getFrame, groupFleet } from '../game';
import { PARTS } from '../config/parts';

// React import not required

describe('groupFleet', () => {
  it('stacks identical ships', () => {
    const frame = getFrame('interceptor');
    const parts = [PARTS.sources[0], PARTS.drives[0]];
    const a = makeShip(frame, parts);
    const b = makeShip(frame, parts);
    const groups = groupFleet([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });
});
