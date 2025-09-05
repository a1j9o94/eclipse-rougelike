import { describe, it, expect } from 'vitest';

type ShipSnap = {
  frame: { id: string; name: string };
  weapons: Array<{ name: string; dmgPerHit?: number; dice?: number; faces?: Array<{ dmg?: number; roll?: number; self?: number }>; initLoss?: number }>;
  riftDice: number;
  stats: { init: number; hullCap: number; valid: boolean; aim: number; shieldTier: number; regen: number };
  hull: number;
  alive: boolean;
};

// Construct minimal snapshots for deterministic testing
function makeShip(name: string, opts?: Partial<ShipSnap>): ShipSnap {
  const base: ShipSnap = {
    frame: { id: 'interceptor', name },
    weapons: [],
    riftDice: 0,
    stats: { init: 1, hullCap: 3, valid: true, aim: 1, shieldTier: 0, regen: 0 },
    hull: 3,
    alive: true,
  };
  const ship = { ...base, ...opts };
  if (!ship.hull) ship.hull = ship.stats.hullCap;
  return ship;
}

describe('Server combat engine (deterministic)', () => {
  it('produces identical results for the same seed', async () => {
    const seed = 'room:1:seed';
    const A: ShipSnap[] = [
      makeShip('A1', { weapons: [{ name: 'Disruptor', faces: [{ dmg: 1 }], dice: 1, dmgPerHit: 1 }] }),
    ];
    const B: ShipSnap[] = [
      makeShip('B1', { weapons: [{ name: 'Plasma', faces: [{ roll: 6 }], dice: 1, dmgPerHit: 1 }] }),
    ];

    const { simulateCombat } = await import('../../convex/engine/combat');
    const r1 = simulateCombat({ seed, playerAId: 'A', playerBId: 'B', fleetA: A, fleetB: B });
    const r2 = simulateCombat({ seed, playerAId: 'A', playerBId: 'B', fleetA: A, fleetB: B });
    expect(r1.winnerPlayerId).toEqual(r2.winnerPlayerId);
    expect(r1.roundLog).toEqual(r2.roundLog);
    expect(r1.roundLog.length).toBeGreaterThan(0);
  });

  it('resolves an obvious mismatch in favor of the stronger fleet', async () => {
    const seed = 'room:1:another';
    const strong: ShipSnap[] = [
      makeShip('A1', { stats: { init: 2, hullCap: 4, valid: true, aim: 2, shieldTier: 0, regen: 0 }, weapons: [{ name: 'Auto', faces: [{ dmg: 2 }], dice: 1, dmgPerHit: 2 }] }),
    ];
    const weak: ShipSnap[] = [
      makeShip('B1', { stats: { init: 1, hullCap: 2, valid: true, aim: 0, shieldTier: 0, regen: 0 }, weapons: [{ name: 'Plasma', faces: [{ roll: 6 }], dice: 1, dmgPerHit: 1 }] }),
    ];

    const { simulateCombat } = await import('../../convex/engine/combat');
    const r = simulateCombat({ seed, playerAId: 'A', playerBId: 'B', fleetA: strong, fleetB: weak });
    expect(r.winnerPlayerId).toEqual('A');
    expect(r.roundLog.join('\n')).toContain('destroyed');
  });
});
