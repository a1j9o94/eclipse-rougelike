import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { advanceRound, finishUpkeep, resolveAftermathChoice } from '../../shared/eclipse/rounds';
import { randomInt, randomSeed } from '../../shared/eclipse/random';
import type { GameEvent, GameState } from '../../shared/eclipse/types';
function game(): GameState { return createGame({ seed: 9, warpPortals: false, seats: [{ id: 'a', faction: 'hydran', controller: 'human' }, { id: 'b', faction: 'planta', controller: 'ai' }] }); }
describe('Second Dawn round progression', () => {
  it('repairs surviving ships after all battles and waits for human upkeep commitment', () => {
    const state = game(); state.phase = 'combat'; state.ships[0].damage = 1;
    const money = state.seats[0].resources.money;
    advanceRound(state, []);
    expect(state.phase).toBe('upkeep'); expect(state.ships[0].damage).toBe(0);
    expect(state.seats[0].resources.money).toBe(money);
    expect(state.engine?.upkeepDone).toEqual([]);
  });
  it('collects production exactly once and resets actions after every living seat commits', () => {
    const state = game(); state.phase = 'upkeep'; state.activeSeatId = 'a';
    const events: GameEvent[] = [];
    state.seats[0].actionDiscs.build = 2; state.seats[0].influenceOnTrack -= 2;
    state.firstPasser = 'b';
    finishUpkeep(state, 'a', events);
    expect(state.seats[0].resources).toEqual({ money: 4, science: 9, materials: 4 });
    expect(() => finishUpkeep(state, 'a', events)).toThrow();
    finishUpkeep(state, 'b', events);
    expect(state.round).toBe(2); expect(state.phase).toBe('action');
    expect(state.activeSeatId).toBe('b'); expect(state.seats[0].actionDiscs.build).toBe(0);
    expect(state.seats[0].influenceOnTrack).toBe(12);
  });
  it('persists bankruptcy and recomputes income when a sector is abandoned', () => {
    const state = game(); state.phase = 'upkeep'; state.activeSeatId = 'a';
    state.seats[0].resources = { money: 0, materials: 0, science: 0 };
    state.seats[0].influenceOnTrack = 7;
    finishUpkeep(state, 'a', []);
    const decision = state.pendingDecision;
    expect(decision?.kind).toBe('bankruptcy');
    if (!decision || decision.kind !== 'bankruptcy') throw new Error('Expected bankruptcy');
    state.pendingDecision = null;
    resolveAftermathChoice(state, 'a', decision, { kind: 'bankruptcy', abandonSectorId: state.sectors.find(s => s.owner === 'a')!.id }, []);
    advanceRound(state, []);
    expect(state.seats[0].eliminated).toBe(true);
    expect(state.engine?.scores?.find(s => s.playerId === 'a')).toBeDefined();
  });
  it('never rolls combat dice twice when resuming a persisted bombardment', () => {
    const state = game(); state.phase = 'combat';
    const home = state.sectors.find(s => s.owner === 'a')!;
    state.ships = state.ships.filter(s => s.owner !== 'a');
    state.ships.find(s => s.owner === 'b')!.sectorId = home.id;
    let seed = 0;
    while (randomInt(randomSeed(seed), 6).value !== 5) seed++;
    state.random = randomSeed(seed);
    advanceRound(state, []);
    const drawCount = state.random.draws;
    expect(state.pendingDecision?.kind).toBe('bombardment');
    advanceRound(state, []);
    expect(state.random.draws).toBe(drawCount);
  });
  it('offers Neutron Bombs as automatic hits against every population cube without rolling', () => {
    const state = game(); state.phase = 'combat';
    const home = state.sectors.find(s => s.owner === 'a')!;
    state.seats.find(s => s.id === 'b')!.technologies.military.push('neutron-bombs');
    state.ships = state.ships.filter(s => s.owner !== 'a');
    state.ships.find(s => s.owner === 'b')!.sectorId = home.id;
    const draws = state.random.draws;
    advanceRound(state, []);
    expect(state.pendingDecision).toMatchObject({ kind: 'bombardment', owner: 'b', sectorId: home.id, hits: home.population.length });
    expect(state.random.draws).toBe(draws);
    const decision = state.pendingDecision!;
    if (decision.kind !== 'bombardment') throw new Error('Expected bombardment');
    state.pendingDecision = null;
    resolveAftermathChoice(state, 'b', decision, { kind: 'bombardment', squareIds: decision.squareIds }, []);
    expect(home.population).toEqual([]);
  });
  it('eliminates a civilization with neither ships nor sectors after combat', () => {
    const state = game(); state.phase = 'combat';
    state.ships = state.ships.filter(s => s.owner !== 'a');
    state.sectors.filter(s => s.owner === 'a').forEach(s => { s.owner = null; s.population = []; });
    advanceRound(state, []);
    expect(state.seats[0].eliminated).toBe(true);
    expect(state.activeSeatId).toBe('b');
  });
  it('refills the regular technology quota without counting rare technologies', () => {
    const state = game(); state.phase = 'cleanup';
    state.supplies.technology = ['conifold-field', 'gauss-shield', 'fusion-drive', 'plasma-cannon', 'starbase', 'fusion-source', 'improved-hull'];
    const before = state.technologyMarket.length;
    advanceRound(state, []);
    expect(state.technologyMarket.length - before).toBe(6);
    expect(state.supplies.technology).toEqual(['improved-hull']);
  });
  it('pauses cleanup for a full population-track return and does not draw technology twice', () => {
    const state = game(); state.phase = 'cleanup';
    state.seats[0].populationTracks.money = -1;
    state.seats[0].graveyard = { money: 1, science: 0, materials: 0 };
    advanceRound(state, []);
    expect(state.phase).toBe('cleanup'); expect(state.pendingDecision?.kind).toBe('population-return');
    const market = [...state.technologyMarket];
    advanceRound(state, []);
    expect(state.technologyMarket).toEqual(market);
    state.pendingDecision = null; state.seats[0].populationTracks.science--;
    advanceRound(state, []);
    expect(state.round).toBe(2); expect(state.technologyMarket).toEqual(market);
  });
  it('claims undefended discovery for occupying ships ahead of a surviving enemy controller', () => {
    const state = game(); state.phase = 'combat';
    state.engine!.aftermath = 'discovery';
    const home = state.sectors.find(s => s.owner === 'a')!;
    state.ships = state.ships.filter(s => s.owner !== 'a');
    state.ships.find(s => s.owner === 'b')!.sectorId = home.id;
    home.discovery = true;
    state.engine!.sectorDiscoveries.push({ sectorId: home.id, discoveryId: 'materials' });
    advanceRound(state, []);
    expect(state.pendingDecision).toMatchObject({ kind: 'discovery', owner: 'b', sectorId: home.id });
    expect(home.discovery).toBe(false);
    expect(state.engine!.sectorDiscoveries.some(d => d.sectorId === home.id)).toBe(false);
  });
  it('rejects duplicate bombardment targets before removing any population', () => {
    const state = game(); state.phase = 'combat';
    const home = state.sectors.find(s => s.owner === 'a')!;
    const id = home.population[0].squareId;
    const before = JSON.stringify(home.population);
    expect(() => resolveAftermathChoice(state, 'b', { id: 'bombard', owner: 'b', kind: 'bombardment', sectorId: home.id, hits: 2, squareIds: [id] }, { kind: 'bombardment', squareIds: [id, id] }, [])).toThrow();
    expect(JSON.stringify(home.population)).toBe(before);
  });
  it('finishes after eighth upkeep with explicit component scoring', () => {
    const state = game(); state.round = 8; state.phase = 'upkeep'; state.activeSeatId = 'a';
    state.privateSeats[0].discoveriesKept = ['ancient-cruiser:1'];
    state.privateSeats[0].reputation = [4, 3];
    finishUpkeep(state, 'a', []); finishUpkeep(state, 'b', []);
    expect(state.phase).toBe('finished'); expect(state.round).toBe(8);
    expect(state.engine?.scores?.find(s => s.playerId === 'a')).toMatchObject({ discoveries: 2, reputation: 7, sectors: 3 });
    expect(state.pendingDecision).toBeNull();
  });
});
