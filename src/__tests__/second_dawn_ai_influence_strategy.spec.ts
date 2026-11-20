import { describe, expect, it } from 'vitest';
import { chooseAiCommand, evaluateAiCommand } from '../../shared/eclipse/ai';
import { chooseStrategicAiCommand } from '../../shared/eclipse/aiSearch';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import type { GameCommand, GameState, Sector } from '../../shared/eclipse/types';

const pass = { type: 'pass' } as const;
const endAction = { type: 'end-action' } as const;
const refresh: GameCommand = { type: 'influence', addSectorIds: [], removeSectorIds: [] };
const claim = (sectorId: string): GameCommand => ({ type: 'influence', addSectorIds: [sectorId], removeSectorIds: [] });

function sector(tileId: string, owner: string | null, q: number): Sector {
  return { id: tileId, tileId, owner, position: { q, r: 0 }, rotation: 0,
    population: [], discovery: false, monolith: false, orbital: false };
}

function lastRound(faction: 'lyra' | 'midas' | 'magellan' = 'lyra', publicDiscoveries = false) {
  const state = createGame({ seed: 337, factionProfile: faction === 'lyra' ? 'official-v1' : 'expanded-v2', ruleOptions: { roundLimit: 8, publicDiscoveries }, seats: [
    { id: 'a', faction, controller: 'ai' }, { id: 'b', faction: 'eridani', controller: 'ai' },
  ] });
  state.round = 8;
  state.activeSeatId = 'a';
  state.technologyMarket = [];
  state.supplies.inner = [];
  state.supplies.middle = [];
  state.supplies.outer = [];
  state.sectors = [sector('101', 'a', 0), sector('106', 'b', 8)];
  state.ships = [];
  const seat = state.seats[0];
  seat.resources = { money: 4, science: 0, materials: 0 };
  seat.populationTracks = { money: 3, science: 1, materials: 1 };
  seat.influenceOnTrack = 9;
  seat.colonyShipsAvailable = 0;
  return state;
}

function apply(state: GameState, seatId: string, command: GameCommand) {
  const result = processGameCommand(state, seatId, command);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function scoreAfterUpkeep(state: GameState) {
  const paid = apply(apply(state, 'a', { type: 'finish-upkeep' }), 'b', { type: 'finish-upkeep' });
  expect(paid.phase).toBe('finished');
  return paid.engine!.scores!.find(score => score.playerId === 'a')!;
}

function fleetOverShrines() {
  const state = lastRound();
  const shrines = sector('302', null, 4);
  state.sectors.push(shrines);
  state.seats[0].shrines = [{ row: 'money', column: 0, planetIndex: 0, sectorId: shrines.id }];
  state.seats[0].colonyShipsAvailable = 3;
  state.sectors[0].population = [{ squareId: 'p0', resource: 'money' }, { squareId: 'p2', resource: 'materials' }];
  state.ships.push({ id: 'fleet', owner: 'a', type: 'interceptor', sectorId: shrines.id, damage: 0, arrival: 1 });
  return state;
}

describe('strategic final-round Influence', () => {
  it('keeps the pass bonus and saves an action disc when the same fleet can claim the shrine sector after combat', () => {
    const state = fleetOverShrines();
    const passed = apply(apply(state, 'a', pass), 'b', pass);
    expect(passed.pendingDecision).toMatchObject({ owner: 'a', kind: 'control', sectorId: '302' });
    const cleanupChoice = chooseAiCommand(getPlayerView(passed, 'a'), 337)!;
    expect(cleanupChoice.command).toMatchObject({ type: 'resolve', choice: { kind: 'control', accept: true } });
    const free = scoreAfterUpkeep(apply(passed, 'a', cleanupChoice.command));
    let bought = apply(state, 'a', claim('302'));
    bought = apply(bought, 'a', endAction);
    bought = apply(apply(bought, 'b', pass), 'a', pass);
    const paid = scoreAfterUpkeep(bought);
    expect(free.total).toBe(paid.total);
    expect(free.resourceTotal).toBeGreaterThan(paid.resourceTotal);
    const view = getPlayerView(state, 'a');
    expect(evaluateAiCommand(view, claim('302'))).toBeLessThan(evaluateAiCommand(view, pass));
    expect(chooseStrategicAiCommand(view, 337, { difficulty: 'expert', maxNodes: 2, now: () => 0 })?.command).not.toEqual(claim('302'));
  });

  it('declines a colony-ship refresh when all available planets are already settled', () => {
    const state = lastRound();
    state.sectors[0].population = [{ squareId: 'p0', resource: 'money' }, { squareId: 'p2', resource: 'materials' }];
    const action = apply(state, 'a', refresh);
    expect(action.seats[0].colonyShipsAvailable).toBe(2);
    const view = getPlayerView(state, 'a');
    expect(evaluateAiCommand(view, refresh)).toBeLessThan(evaluateAiCommand(view, pass));
    expect(chooseAiCommand(view, 337)?.command).not.toEqual(refresh);
  });

  it('spends the disc to claim an unoccupied, connected monolith sector', () => {
    const state = lastRound();
    state.sectors[0].population = [{ squareId: 'p0', resource: 'money' }, { squareId: 'p2', resource: 'materials' }];
    state.sectors.push({ ...sector('1', null, 1), monolith: true });
    const before = scoreAfterUpkeep(apply(apply(state, 'a', pass), 'b', pass));
    let after = apply(apply(state, 'a', claim('1')), 'a', endAction);
    after = apply(apply(after, 'b', pass), 'a', pass);
    expect(scoreAfterUpkeep(after).total - before.total).toBe(7);
    const view = getPlayerView(state, 'a');
    expect(chooseAiCommand(view, 337)?.command).toEqual(claim('1'));
    const timedOut = chooseStrategicAiCommand(view, 337, { difficulty: 'expert', budgetMs: 0 });
    expect(timedOut?.command).toEqual(claim('1'));
  });

  it('uses both activations of one action to reach a monolith through a zero-VP sector', () => {
    let state = lastRound();
    state.sectors.push(sector('236', null, 1), { ...sector('1', null, 2), monolith: true },
      { ...sector('302', null, -1), rotation: 3 });
    const plan: GameCommand = { type: 'influence', removeSectorIds: [], addSectorIds: ['236', '1'] };
    expect(apply(state, 'a', plan).sectors.find(s => s.id === '1')?.owner).toBe('a');
    const baseline = scoreAfterUpkeep(apply(apply(state, 'a', pass), 'b', pass));
    for (let step = 0; step < 6 && state.activeSeatId === 'a'; step++) {
      const choice = chooseAiCommand(getPlayerView(state, 'a'), 337 + step);
      expect(choice).not.toBeNull();
      state = apply(state, 'a', choice!.command);
    }
    expect(state.seats[0].actionDiscs.influence).toBe(1);
    expect(state.sectors.find(s => s.id === '1')?.owner).toBe('a');
    const result = scoreAfterUpkeep(apply(apply(state, 'b', pass), 'a', pass));
    expect(result.total - baseline.total).toBe(7);
  });

  it('refreshes when the two colony ships preserve scoring sectors through final upkeep', () => {
    const state = lastRound();
    state.firstPasser = 'b';
    state.seats[1].passed = true;
    state.seats[0].resources.money = 3;
    state.seats[0].influenceOnTrack = 5;
    state.sectors.push({ ...sector('1', 'a', 1), monolith: true });
    const passed = apply(apply(state, 'a', pass), 'a', { type: 'finish-upkeep' });
    expect(passed.pendingDecision).toMatchObject({ kind: 'bankruptcy', shortfall: 1 });
    const surrendered = apply(passed, 'a', { type: 'resolve', decisionId: passed.pendingDecision!.id,
      choice: { kind: 'bankruptcy', abandonSectorId: '101' } });
    const baseline = apply(surrendered, 'b', { type: 'finish-upkeep' }).engine!.scores!.find(score => score.playerId === 'a')!;
    let refreshed = apply(state, 'a', refresh);
    refreshed = apply(refreshed, 'a', { type: 'colonize', placements: [
      { sectorId: '1', squareId: 'p0', resource: 'money' }, { sectorId: '1', squareId: 'p1', resource: 'money' },
    ] });
    refreshed = apply(apply(refreshed, 'a', endAction), 'b', pass);
    expect(scoreAfterUpkeep(apply(refreshed, 'a', pass)).total - baseline.total).toBe(2);
    const view = getPlayerView(state, 'a');
    expect(chooseAiCommand(view, 337)?.command).toEqual(refresh);
  });

  it('ends Influence when the same sector can be surrendered during mandatory upkeep', () => {
    const state = lastRound();
    state.firstPasser = 'b';
    state.seats[1].passed = true;
    state.seats[0].resources.money = 1;
    state.seats[0].influenceOnTrack = 5;
    state.sectors.push({ ...sector('302', 'a', 1), monolith: true });
    state.engine!.action = { owner: 'a', action: 'influence', remaining: 1, coloniesRefreshed: true };
    const view = getPlayerView(state, 'a');
    const withdraw: GameCommand = { type: 'influence', addSectorIds: [], removeSectorIds: ['101'] };
    const ending = apply(apply(apply(state, 'a', endAction), 'b', pass), 'a', pass);
    const debt = apply(ending, 'a', { type: 'finish-upkeep' });
    expect(debt.pendingDecision).toMatchObject({ kind: 'bankruptcy', shortfall: 3 });
    const settled = apply(debt, 'a', { type: 'resolve', decisionId: debt.pendingDecision!.id,
      choice: { kind: 'bankruptcy', abandonSectorId: '101' } });
    const baseline = apply(settled, 'b', { type: 'finish-upkeep' }).engine!.scores!.find(score => score.playerId === 'a')!;
    const surrendered = apply(apply(apply(state, 'a', withdraw), 'b', pass), 'a', pass);
    const paid = scoreAfterUpkeep(surrendered);
    expect([paid.total, paid.resourceTotal]).toEqual([baseline.total, baseline.resourceTotal]);
    expect(chooseAiCommand(view, 337)?.command).toEqual(endAction);
  });

  it('buys a Midas Influence activation only when the remaining plan justifies its Money cost', () => {
    const state = lastRound('midas');
    state.engine!.action = { owner: 'a', action: 'influence', remaining: 0, coloniesRefreshed: true };
    const buy: GameCommand = { type: 'buy-activation', action: 'influence' };
    const paid = apply(state, 'a', buy);
    expect(paid.seats[0].resources.money).toBe(state.seats[0].resources.money - 1);
    expect(chooseAiCommand(getPlayerView(state, 'a'), 337)?.command).toEqual(endAction);

    state.sectors.push({ ...sector('1', null, 1), monolith: true });
    const choice = chooseAiCommand(getPlayerView(state, 'a'), 337)!;
    expect(choice.command).toEqual(buy);
    const funded = apply(state, 'a', choice.command);
    const followup = chooseAiCommand(getPlayerView(funded, 'a'), 337)!;
    expect(followup.command).toEqual(claim('1'));
    const claimed = apply(funded, 'a', followup.command);
    expect(claimed.sectors.find(s => s.id === '1')?.owner).toBe('a');
  });

  it('keeps a Magellan colony ship for Money when spending it on Materials would force bankruptcy', () => {
    let state = lastRound('magellan');
    state.phase = 'upkeep';
    state.engine!.upkeepDone = ['b'];
    state.seats[0].resources.money = 0;
    state.seats[0].colonyShipsAvailable = 1;
    state.seats[0].influenceOnTrack = 6;
    state.sectors[0] = sector('302', 'a', 0);
    const settled = apply(state, 'a', { type: 'colonize', placements: [{ sectorId: '302', squareId: 'p2', resource: 'materials' }] });
    expect(apply(settled, 'a', { type: 'finish-upkeep' }).pendingDecision).toMatchObject({ kind: 'bankruptcy', shortfall: 1 });
    const converted = apply(apply(state, 'a', { type: 'convert-colony-ship', resource: 'money' }), 'a', { type: 'finish-upkeep' });
    expect(converted.phase).toBe('finished');
    const target = converted.engine!.scores!.find(score => score.playerId === 'a')!;
    for (let step = 0; step < 6 && state.phase !== 'finished'; step++) {
      const choice = chooseAiCommand(getPlayerView(state, 'a'), 337 + step)!;
      state = apply(state, 'a', choice.command);
    }
    expect(state.phase).toBe('finished');
    expect(state.engine!.scores!.find(score => score.playerId === 'a')?.total).toBe(target.total);
    expect(state.sectors[0].owner).toBe('a');
  });

  it('values only the discovery tiles still available for a two-sector Influence action', () => {
    const state = lastRound('lyra', true);
    state.sectors[0] = sector('238', 'a', 0);
    state.sectors.push({ ...sector('101', null, 1), discovery: true }, { ...sector('1', null, 2), discovery: true });
    state.lessRandom!.discoverySupply.length = 1;
    const plan: GameCommand = { type: 'influence', addSectorIds: ['101', '1'], removeSectorIds: [] };
    const claimed = apply(state, 'a', plan);
    const discovery = claimed.pendingDecision;
    if (discovery?.kind !== 'discovery') throw new Error('Expected the remaining face-up discovery');
    const resolved = apply(claimed, 'a', { type: 'resolve', decisionId: discovery.id,
      choice: { kind: 'discovery', option: 'keep', discoveryId: discovery.availableTileIds![0] } });
    expect(resolved.pendingDecision).toBeNull();
    const earned = resolved.privateSeats.find(seat => seat.seatId === 'a')!.discoveriesKept.length;
    expect(earned).toBe(1);
    const twoMarkers = evaluateAiCommand(getPlayerView(state, 'a'), plan);
    expect(Number.isFinite(twoMarkers)).toBe(true);
    state.sectors.at(-1)!.discovery = false;
    expect(evaluateAiCommand(getPlayerView(state, 'a'), plan)).toBe(twoMarkers);
  });

  it.each(['hard', 'expert'] as const)('keeps the pass option on %s when its search deadline expires before settlement', difficulty => {
    const state = lastRound();
    state.seats[0].resources.money = 0;
    state.seats[0].populationTracks.money = 5;
    state.sectors[0].population = [{ squareId: 'p0', resource: 'money' }, { squareId: 'p2', resource: 'materials' }];
    const view = getPlayerView(state, 'a');
    const normal = chooseStrategicAiCommand(view, 337, { difficulty: 'normal', budgetMs: 0 })!;
    expect(normal.search.nodes).toBe(0);
    expect(normal.command).toEqual(chooseAiCommand(view, 337)?.command);
    for (const budgetMs of [0, 2]) {
      let tick = 0;
      const choice = chooseStrategicAiCommand(view, 337, { difficulty, maxNodes: 8, budgetMs, now: () => tick++ })!;
      expect(choice.search.nodes).toBe(0);
      expect(choice.command).toEqual(pass);
    }
  });
});
