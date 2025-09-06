import { describe, it, expect } from 'vitest';

type ShipSnap = { frame:{id:string;name:string}; weapons:unknown[]; riftDice:number; stats:{ init:number; hullCap:number; valid:boolean; aim:number; shieldTier:number; regen:number }; hull:number; alive:boolean };

// This test encodes the desired behavior: players may not ready up without a snapshot
// Another agent should implement validateReadyToggle in convex/helpers/resolve.ts
// so these tests pass without relying on Convex runtime.

describe('Outpost Ready Guard (snapshot-before-ready)', () => {
  it('blocks setReady(true) if player has no snapshot', async () => {
    const mod = await import('../../convex/helpers/resolve');
    const { validateReadyToggle } = mod as unknown as {
      validateReadyToggle: (args: {
        playerId: string;
        wantReady: boolean;
        playerStates: Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean } | undefined>;
      }) => { ok: boolean; reason?: 'missingSnapshot' | 'invalidFleet' | 'notAllowed' };
    };

    const playerStates = {
      A: { /* no fleet */ },
      B: { fleet: [{ frame: { id:'interceptor', name:'I' }, weapons:[], riftDice:0, stats:{ init:1, hullCap:3, valid:true, aim:1, shieldTier:0, regen:0 }, hull:3, alive:true }], fleetValid: true },
    } satisfies Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean }>;

    const res = validateReadyToggle({ playerId: 'A', wantReady: true, playerStates });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('missingSnapshot');
  });

  it('allows setReady(true) when snapshot exists and is valid', async () => {
    const mod = await import('../../convex/helpers/resolve');
    const { validateReadyToggle } = mod as unknown as {
      validateReadyToggle: (args: {
        playerId: string;
        wantReady: boolean;
        playerStates: Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean } | undefined>;
      }) => { ok: boolean; reason?: 'missingSnapshot' | 'invalidFleet' | 'notAllowed' };
    };

    const playerStates = {
      A: { fleet: [{ frame: { id:'interceptor', name:'I' }, weapons:[], riftDice:0, stats:{ init:1, hullCap:3, valid:true, aim:1, shieldTier:0, regen:0 }, hull:3, alive:true }], fleetValid: true },
    } satisfies Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean }>;

    const res = validateReadyToggle({ playerId: 'A', wantReady: true, playerStates });
    expect(res.ok).toBe(true);
    expect(res.reason).toBeUndefined();
  });
});

