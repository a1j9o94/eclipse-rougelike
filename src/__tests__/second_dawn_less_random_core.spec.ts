import { describe, expect, it } from 'vitest';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import { processGameCommand } from '../../shared/eclipse/engine';
import { discoveryAt } from '../../shared/eclipse/actions';
import { researchTechnology } from '../../shared/eclipse/actions';
import { DEVELOPMENTS } from '../../shared/eclipse/developments';
import { resolveCombatChoice } from '../../shared/eclipse/battleEngine';
import { presentNextDecision } from '../../shared/eclipse/rulesState';
import { sampleAiWorld } from '../../shared/eclipse/aiWorld';

const seats = [
  { id: 'a', faction: 'planta' as const, controller: 'human' as const },
  { id: 'b', faction: 'draco' as const, controller: 'human' as const },
];

describe('Less Random core setup', () => {
  it('keeps absent mode historical and initializes public fair-play supplies only when selected', () => {
    const standard = createGame({ seed: 44, warpPortals: false, seats });
    const fair = createGame({ seed: 44, warpPortals: true, rulesMode: 'less-random-v1', seats });
    expect(standard.rulesMode).toBeUndefined();
    expect(standard.lessRandom).toBeUndefined();
    expect(fair.rulesMode).toBe('less-random-v1');
    expect(fair.engine?.warpPortals).toBe(false);
    expect(fair.supplies.outer.length).toBeGreaterThan(standard.supplies.outer.length);
    expect(fair.technologyMarket).not.toContain('warp-portal');
    expect(fair.technologyMarket).not.toContain('flux-missile');
    expect(fair.technologyMarket).not.toContain('neutron-absorber');
    expect(fair.lessRandom?.explorationJokers).toEqual({ a: true, b: true });
    expect(fair.lessRandom?.reputationBySeat.a).toEqual([]);
    expect(getPlayerView(fair, 'b')?.lessRandom?.discoverySupply).toEqual(fair.lessRandom?.discoverySupply);
  });
});

describe('Less Random core regression boundaries', () => {
  it('never queues an empty discovery choice after the public supply is exhausted', () => {
    const state = createGame({ seed: 17, warpPortals: false, rulesMode: 'less-random-v1', seats });
    state.pendingDecision = null;
    state.engine!.decisions = [];
    state.lessRandom!.discoverySupply = [];
    state.supplies.discovery = [];
    const sector = state.sectors.find(candidate => candidate.owner === 'a')!;
    sector.discovery = true;
    discoveryAt(state, state.seats[0], sector);
    expect(sector.discovery).toBe(false);
    expect(state.pendingDecision).toBeNull();
    expect(state.engine!.decisions).toEqual([]);
  });

  it('rejects a removed technology without mutating the variant state or RNG', () => {
    const state = createGame({ seed: 21, warpPortals: false, rulesMode: 'less-random-v1', seats });
    state.pendingDecision = null;
    state.engine!.decisions = [];
    const before = structuredClone(state);
    const result = processGameCommand(state, 'a', { type: 'research', tileId: 'warp-portal', track: 'grid' });
    expect(result.ok).toBe(false);
    expect(state).toEqual(before);
    expect(state.random.draws).toBe(before.random.draws);
  });

  it('keeps Standard reputation private while Less Random public tracks stay synchronized through a return', () => {
    const standard = createGame({ seed: 27, warpPortals: false, seats });
    standard.privateSeats.find(privateSeat => privateSeat.seatId === 'a')!.reputation = [1];
    const standardView = getPlayerView(standard, 'b')!;
    expect(standardView.lessRandom).toBeUndefined();
    expect(standardView.private.reputation).not.toContain(1);

    const fair = createGame({ seed: 27, warpPortals: false, rulesMode: 'less-random-v1', seats });
    fair.pendingDecision = null;
    fair.engine!.decisions = [];
    fair.privateSeats.find(privateSeat => privateSeat.seatId === 'a')!.reputation = [1];
    fair.lessRandom!.reputationBySeat.a = [1];
    fair.lessRandom!.reputationSupply.splice(fair.lessRandom!.reputationSupply.indexOf(1), 1);
    fair.supplies.reputation = [...fair.lessRandom!.reputationSupply];
    resolveCombatChoice(fair, 'a', { id: 'rep', owner: 'a', kind: 'less-random-reputation', draws: 1, capacity: 4 }, { kind: 'less-random-reputation', actions: [{ type: 'add' }] }, []);
    expect(fair.lessRandom!.reputationBySeat.a).toEqual([1, 1]);
    expect(fair.supplies.reputation).toEqual(fair.lessRandom!.reputationSupply);
    const result = processGameCommand(fair, 'a', { type: 'discard-reputation', values: [1] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.lessRandom!.reputationBySeat.a).toEqual([1]);
    expect(result.state.lessRandom!.reputationSupply).toContain(1);
    expect(getPlayerView(result.state, 'b')!.lessRandom!.reputationBySeat.a).toEqual([1]);
  });

  it('replays deterministic setup-time public reputation choices', () => {
    const config = { seed: 31, warpPortals: false, rulesMode: 'less-random-v1' as const, seats: [
      { id: 'a', faction: 'eridani' as const, controller: 'human' as const },
      { id: 'b', faction: 'hydran' as const, controller: 'human' as const },
    ] };
    const first = createGame(config);
    const second = createGame(config);
    expect(first.pendingDecision).toMatchObject({ kind: 'less-random-reputation', owner: 'a', draws: 2 });
    const command = { type: 'resolve' as const, decisionId: first.pendingDecision!.id, choice: { kind: 'less-random-reputation' as const, actions: [{ type: 'add' as const }, { type: 'add' as const }] } };
    const a = processGameCommand(first, 'a', command);
    const b = processGameCommand(second, 'a', { ...command, decisionId: second.pendingDecision!.id });
    expect(a.ok).toBe(true); expect(b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.state).toEqual(b.state);
  });

  it('keeps exactly the forty selectable discoveries and 124 research tiles plus two developments', () => {
    const fair = createGame({ seed: 37, warpPortals: false, rulesMode: 'less-random-v1', seats });
    expect(fair.lessRandom!.discoverySupply).toHaveLength(40);
    expect(fair.engine!.sectorDiscoveries).toEqual([]);
    expect(fair.technologyMarket).toHaveLength(124);
    expect(fair.supplies.technology).toEqual([]);
    expect(DEVELOPMENTS).toHaveLength(2);
  });

  it('clears Magellan’s public reservation when its fourth technology redeems it', () => {
    let state = createGame({ seed: 48, warpPortals: false, rulesMode: 'less-random-v1', factionProfile: 'expanded-v1', seats: [
      { id: 'magellan', faction: 'magellan', pieceColor: 'blue', controller: 'human' },
      { id: 'hydran', faction: 'hydran', pieceColor: 'green', controller: 'human' },
    ] });
    const reserve = state.pendingDecision!;
    expect(reserve).toMatchObject({ kind: 'discovery', reserveForFourthTechnology: true });
    const reservedId = reserve.availableTileIds![0];
    const reserved = processGameCommand(state, 'magellan', { type: 'resolve', decisionId: reserve.id, choice: { kind: 'discovery', option: 'use', discoveryId: reservedId } });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    state = reserved.state;
    const magellan = state.seats.find(seat => seat.id === 'magellan')!;
    magellan.resources.science = 50;
    for (const id of ['improved-hull', 'positron-computer', 'advanced-economy']) researchTechnology(state, magellan, id, 'grid');
    expect(state.privateSeats.find(seat => seat.seatId === 'magellan')?.storedDiscoveryResolved).toBe(true);
    expect(state.lessRandom!.reservedDiscoveries.magellan).toBeNull();
    expect(state.engine!.decisions).toContainEqual(expect.objectContaining({ kind: 'discovery', tileId: reservedId }));
  });

  it('reconstructs Magellan’s public reservation for every fair AI world, including its owner view', () => {
    let state = createGame({ seed: 52, warpPortals: false, rulesMode: 'less-random-v1', factionProfile: 'expanded-v1', seats: [
      { id: 'magellan', faction: 'magellan', pieceColor: 'blue', controller: 'human' },
      { id: 'hydran', faction: 'hydran', pieceColor: 'green', controller: 'human' },
    ] });
    const reserve = state.pendingDecision!;
    const reservedId = reserve.availableTileIds![0];
    const result = processGameCommand(state, 'magellan', { type: 'resolve', decisionId: reserve.id, choice: { kind: 'discovery', option: 'use', discoveryId: reservedId } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = result.state;
    for (const viewer of ['magellan', 'hydran']) {
      const world = sampleAiWorld(getPlayerView(state, viewer)!, 90);
      const privateMagellan = world.privateSeats.find(seat => seat.seatId === 'magellan')!;
      expect(privateMagellan.storedDiscovery).toBe(reservedId);
      expect(privateMagellan.storedDiscoveryResolved).toBe(false);
    }
  });

  it('drops stale queued public discovery choices when their supply is exhausted', () => {
    const state = createGame({ seed: 57, warpPortals: false, rulesMode: 'less-random-v1', seats });
    state.pendingDecision = null;
    state.lessRandom!.discoverySupply = [];
    state.supplies.discovery = [];
    state.engine!.decisions = [{ id: 'stale', owner: 'a', kind: 'discovery', tileId: '', availableTileIds: ['money'], options: ['keep', 'use'] }];
    expect(presentNextDecision(state)).toBe(false);
    expect(state.pendingDecision).toBeNull();
    expect(state.engine!.decisions).toEqual([]);
  });
});
