import { describe, it, expect } from 'vitest';
import { canStartCombat } from '../../convex/helpers/ready';

describe('canStartCombat', () => {
  const players = [
    { playerId: 'a', isReady: true },
    { playerId: 'b', isReady: true },
  ];

  it('requires exactly two players', () => {
    expect(canStartCombat([], {})).toBe(false);
    expect(canStartCombat([{ playerId: 'a', isReady: true }], {})).toBe(false);
  });

  it('requires all players ready', () => {
    expect(canStartCombat([{ playerId: 'a', isReady: true }, { playerId: 'b', isReady: false }], {})).toBe(false);
  });

  it('blocks start if any fleet invalid', () => {
    const states = { a: { fleetValid: true }, b: { fleetValid: false } };
    expect(canStartCombat(players, states)).toBe(false);
  });

  it('allows start when both ready and valid or unknown', () => {
    expect(canStartCombat(players, { a: { fleetValid: true }, b: { fleetValid: true } })).toBe(true);
    // If validity is not reported (undefined), assume ok for now
    expect(canStartCombat(players, {})).toBe(true);
  });
});

