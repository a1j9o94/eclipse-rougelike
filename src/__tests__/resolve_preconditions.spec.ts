import { describe, it, expect } from 'vitest';

type PlayerRow = { playerId: string; isReady: boolean };
// Minimal shape used by the precondition helper
type GameStateLike = {
  gamePhase: 'setup' | 'combat' | 'finished';
  roundNum: number;
  playerStates: Record<string, { fleet?: unknown; fleetValid?: boolean }>;
};

describe('Resolve preconditions (server authoritative)', () => {
  it('is false until both ready AND both snapshots exist AND valid', async () => {
    const players: PlayerRow[] = [
      { playerId: 'A', isReady: false },
      { playerId: 'B', isReady: false },
    ];
    const gs: GameStateLike = {
      gamePhase: 'setup',
      roundNum: 1,
      playerStates: { A: {}, B: {} },
    };
    const mod = await import('../../convex/helpers/resolve');
    const check = mod.computeResolvePlan as (p: PlayerRow[], gs: GameStateLike) => { ok: boolean; flags: Record<string, boolean> };

    let res = check(players, gs);
    expect(res.ok).toBe(false);
    expect(res.flags).toMatchObject({ bothReady: false, haveSnapshots: false, allValid: true, inSetup: true });

    // A readies and submits snapshot
    players[0].isReady = true;
    gs.playerStates['A'] = { fleet: [{}], fleetValid: true };
    res = check(players, gs);
    expect(res.ok).toBe(false);
    expect(res.flags).toMatchObject({ bothReady: false, haveSnapshots: false, allValid: true, inSetup: true });

    // B submits snapshot but not ready yet → still false
    gs.playerStates['B'] = { fleet: [{}], fleetValid: true };
    res = check(players, gs);
    expect(res.ok).toBe(false);

    // B readies → now true
    players[1].isReady = true;
    res = check(players, gs);
    expect(res.ok).toBe(true);
    expect(res.flags).toMatchObject({ bothReady: true, haveSnapshots: true, allValid: true, inSetup: true });
  });

  it('does not resolve outside setup phase', async () => {
    const mod = await import('../../convex/helpers/resolve');
    const check = mod.computeResolvePlan as (p: PlayerRow[], gs: GameStateLike) => { ok: boolean; flags: Record<string, boolean> };
    const players: PlayerRow[] = [ { playerId: 'A', isReady: true }, { playerId: 'B', isReady: true } ];
    const gs: GameStateLike = { gamePhase: 'combat', roundNum: 1, playerStates: { A: { fleet: [{}], fleetValid: true }, B: { fleet: [{}], fleetValid: true } } };
    const res = check(players, gs);
    expect(res.ok).toBe(false);
    expect(res.flags.inSetup).toBe(false);
  });

  it('blocks when any fleetValid=false', async () => {
    const mod = await import('../../convex/helpers/resolve');
    const check = mod.computeResolvePlan as (p: PlayerRow[], gs: GameStateLike) => { ok: boolean; flags: Record<string, boolean> };
    const players: PlayerRow[] = [ { playerId: 'A', isReady: true }, { playerId: 'B', isReady: true } ];
    const gs: GameStateLike = { gamePhase: 'setup', roundNum: 1, playerStates: { A: { fleet: [{}], fleetValid: true }, B: { fleet: [{}], fleetValid: false } } };
    const res = check(players, gs);
    expect(res.ok).toBe(false);
    expect(res.flags.allValid).toBe(false);
  });
});

