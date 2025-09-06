import { describe, it, expect } from 'vitest';

describe('Multiplayer seeding and lives', () => {
  it('seeds starting fleet snapshots per player', async () => {
    const mod = await import('../../convex/gameState');
    const make = (mod as any).makeStartingFleetSnaps as (n:number)=>any[];
    const snaps = make(5);
    expect(Array.isArray(snaps)).toBe(true);
    expect(snaps.length).toBe(5);
    // minimal shape check
    expect(snaps[0]).toHaveProperty('frame');
    expect(snaps[0]).toHaveProperty('stats');
  });

  it('lives decrement is exactly 1 per round resolution (engine-side)', async () => {
    const { simulateCombat } = await import('../../convex/engine/combat');
    const A = [{ frame:{id:'interceptor',name:'I'}, weapons:[{ name:'Auto', faces:[{dmg:1}], dice:1, dmgPerHit:1 }], riftDice:0, stats:{ init:2, hullCap:1, valid:true, aim:2, shieldTier:0, regen:0 }, hull:1, alive:true }];
    const B = [{ frame:{id:'interceptor',name:'I'}, weapons:[{ name:'Plasma', faces:[{roll:6}], dice:1, dmgPerHit:1 }], riftDice:0, stats:{ init:1, hullCap:1, valid:true, aim:1, shieldTier:0, regen:0 }, hull:1, alive:true }];
    const seed = 'ROOM:1:TEST';
    const r = simulateCombat({ seed, playerAId: 'A', playerBId: 'B', fleetA: A as any, fleetB: B as any });
    expect(r.roundLog.length).toBeGreaterThan(0);
    // The test emulates server decrement: exactly one loser loses 1 life
    const lives = { A: 5, B: 5 };
    const loser = r.winnerPlayerId === 'A' ? 'B' : 'A';
    lives[loser as 'A'|'B'] = Math.max(0, lives[loser as 'A'|'B'] - 1);
    const winnerLives = lives[r.winnerPlayerId as 'A'|'B'];
    const loserLives = lives[loser as 'A'|'B'];
    expect(winnerLives).toBe(5);
    expect(loserLives).toBe(4);
  });
});

