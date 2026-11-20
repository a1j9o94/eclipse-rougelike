import { describe, expect, it } from 'vitest';
import { chooseAiCommand, evaluateAiCommand } from '../../shared/eclipse/ai';
import { chooseStrategicAiCommand } from '../../shared/eclipse/aiSearch';
import { processGameCommand } from '../../shared/eclipse/engine';
import { adjacentPosition, type HexEdge } from '../../shared/eclipse/geometry';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { SECTORS } from '../../shared/eclipse/sectors';
import { createGame } from '../../shared/eclipse/setup';
import type { GameCommand, GameState, Sector } from '../../shared/eclipse/types';

const game = (seed: number) => createGame({
  seed,
  ruleOptions: { roundLimit: 9 },
  seats: [
    { id: 'a', faction: 'orion', controller: 'ai' },
    { id: 'b', faction: 'hydran', controller: 'ai' },
  ],
});

function apply(state: GameState, actor: string, command: GameCommand): GameState {
  const result = processGameCommand(state, actor, command);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function cashSector(): Sector {
  const tile = SECTORS.find(tile => tile.victoryPoints === 1 &&
    tile.population.some(square => square.resource === 'money' && !square.advanced))!;
  const square = tile.population.findIndex(square => square.resource === 'money' && !square.advanced);
  return {
    id: 'cash-colony', tileId: String(tile.id), position: { q: -2, r: 0 }, rotation: 0,
    owner: 'a', population: [{ squareId: `p${square}`, resource: 'money' }],
    orbital: false, monolith: false, discovery: false,
  };
}

const { id: cashId } = cashSector();

function safeMovementPosition(state: GameState) {
  const [startTile, nextTile] = SECTORS.filter(tile => tile.victoryPoints === 2 &&
    tile.wormholes.includes(0) && tile.wormholes.includes(3) && !tile.warpPortal);
  const base = { ...cashSector(), owner: null, population: [] };
  const start = { ...base, id: 'start', tileId: String(startTile.id), position: { q: 0, r: 0 } };
  const next = { ...base, id: 'next', tileId: String(nextTile.id), position: { q: 1, r: 0 } };
  const homes = state.sectors.filter(sector => sector.owner !== null);
  for (const home of homes) home.position = { q: home.owner === 'a' ? -5 : 5, r: 0 };
  state.sectors = [start, next, ...homes];
  state.ships = state.ships.filter(ship => ship.owner !== 'gcds');
  const ship = state.ships.find(ship => ship.owner === 'a')!;
  ship.sectorId = start.id;
  return { ship, next };
}

describe('final-round AI playtest regressions', () => {
  it.each(['hard', 'expert'] as const)('keeps a scoring sector on %s when withdrawal cannot improve upkeep', difficulty => {
    const state = game(55);
    state.round = 9;
    const seat = state.seats[0];
    seat.resources = { money: 0, science: 0, materials: 0 };
    seat.populationTracks.money = 3;
    seat.influenceOnTrack = 6;
    seat.colonyShipsAvailable = 0;
    state.sectors = [...state.sectors.filter(sector => sector.owner !== null), cashSector()];
    state.engine!.action = { owner: 'a', action: 'influence', remaining: 1, coloniesRefreshed: true };
    const view = getPlayerView(state, 'a');
    const withdraw: GameCommand = { type: 'influence', addSectorIds: [], removeSectorIds: [cashId] };
    expect(apply(state, 'a', withdraw).sectors.find(sector => sector.id === cashId)?.owner).toBeNull();
    expect(evaluateAiCommand(view, withdraw)).toBeLessThan(evaluateAiCommand(view, { type: 'end-action' }));
    const choice = chooseStrategicAiCommand(view, 40, { difficulty, now: () => 0 })!;
    expect(choice.command.type).toBe('end-action');
    expect(apply(state, 'a', choice.command).sectors.find(sector => sector.id === cashId)?.owner).toBe('a');
  });

  it('sells only what covers payable upkeep and keeps the whole empire', () => {
    let state = game(55);
    state.round = 9;
    state.phase = 'upkeep';
    state.engine!.upkeepDone = ['b'];
    const seat = state.seats[0];
    seat.resources = { money: 0, science: 15, materials: 9 };
    seat.influenceOnTrack = 6;
    seat.populationTracks.money = 3;
    const controlled = state.sectors.filter(sector => sector.owner === 'a').map(sector => sector.id);
    state = apply(state, 'a', { type: 'finish-upkeep' });
    expect(state.pendingDecision?.kind).toBe('bankruptcy');
    const view = getPlayerView(state, 'a');
    expect(evaluateAiCommand(view, { type: 'trade', from: 'science', to: 'money', amount: 1 }))
      .toBeGreaterThan(evaluateAiCommand(view, { type: 'trade', from: 'science', to: 'money', amount: 2 }));
    const choice = chooseAiCommand(view, 4)!;
    expect(choice.command).toMatchObject({ type: 'trade', to: 'money', amount: 1 });
    state = apply(state, 'a', choice.command);
    expect(state.phase).toBe('finished');
    expect(state.sectors.filter(sector => sector.owner === 'a').map(sector => sector.id)).toEqual(controlled);
  });

  it('abandons one sector when its returned disc can settle unavoidable bankruptcy', () => {
    let state = game(55);
    state.round = 9;
    state.phase = 'upkeep';
    state.engine!.upkeepDone = ['b'];
    const seat = state.seats[0];
    seat.resources = { money: 2, science: 0, materials: 0 };
    seat.influenceOnTrack = 5;
    seat.populationTracks.money = 3;
    const home = state.sectors.find(sector => sector.owner === 'a')!;
    home.tileId = '101';
    home.population = [];
    state.sectors.push(cashSector());
    state = apply(state, 'a', { type: 'finish-upkeep' });
    const choice = chooseAiCommand(getPlayerView(state, 'a'), 55)!;
    expect(choice.command).toMatchObject({ type: 'resolve', choice: { kind: 'bankruptcy', abandonSectorId: home.id } });
    state = apply(state, 'a', choice.command);
    expect(state.phase).toBe('finished');
    expect(state.sectors.find(sector => sector.id === cashId)?.owner).toBe('a');
  });

  it('preserves scarce Money and the monolith through a seven-Money final shortfall', () => {
    let state = createGame({ seed: 979, warpPortals: false, ruleOptions: { roundLimit: 6 }, seats: [
      { id: 'a', faction: 'eridani', controller: 'ai' },
      { id: 'b', faction: 'hydran', controller: 'ai' },
      { id: 'c', faction: 'planta', controller: 'ai' },
      { id: 'd', faction: 'orion', controller: 'ai' },
    ] });
    state.round = 6;
    state.phase = 'upkeep';
    state.engine!.upkeepDone = ['b', 'c', 'd'];
    const seat = state.seats[0];
    seat.resources = { money: 7, science: 0, materials: 0 };
    seat.colonyShipsAvailable = 0;
    seat.actionDiscs.move = 3;
    seat.influenceOnTrack -= 7;
    const home = state.sectors.find(sector => sector.owner === 'a')!;
    state.sectors.push(...['101', '102', '103', '106'].map((tileId, index): Sector => ({
      id: `extra-${index}`, tileId, position: adjacentPosition(home.position, index as HexEdge), rotation: 0,
      owner: 'a', population: [], orbital: false, monolith: index === 0, discovery: false,
    })));

    const harmfulTrade: GameCommand = { type: 'trade', from: 'money', to: 'science', amount: 2 };
    expect(evaluateAiCommand(getPlayerView(state, 'a'), harmfulTrade)).toBe(-Infinity);
    state = apply(state, 'a', { type: 'finish-upkeep' });
    expect(state.pendingDecision).toMatchObject({ kind: 'bankruptcy', shortfall: 7 });
    expect(evaluateAiCommand(getPlayerView(state, 'a'), harmfulTrade)).toBe(-Infinity);
    for (let step = 0; state.phase === 'upkeep' && step < 5; step++) {
      const choice = chooseAiCommand(getPlayerView(state, 'a'), 979 + 29 * step)!;
      expect(choice.command).toMatchObject({ type: 'resolve', choice: { kind: 'bankruptcy' } });
      state = apply(state, 'a', choice.command);
    }
    expect(state.phase).toBe('finished');
    expect(state.seats[0].eliminated).toBe(false);
    expect(state.sectors.find(sector => sector.id === 'extra-0')?.owner).toBe('a');
    expect(state.sectors.filter(sector => sector.owner === 'a')).toHaveLength(3);
  });

  it('uses a Magellan colony ship for Money when conversion can avert bankruptcy', () => {
    let state = createGame({ seed: 80, factionProfile: 'expanded-v2', ruleOptions: { roundLimit: 6 }, seats: [
      { id: 'a', faction: 'magellan', controller: 'ai', pieceColor: 'blue' },
      { id: 'b', faction: 'orion', controller: 'ai', pieceColor: 'red' },
    ] });
    state.round = 6;
    state.phase = 'upkeep';
    state.engine!.upkeepDone = ['b'];
    const seat = state.seats[0];
    seat.resources = { money: 0, science: 0, materials: 0 };
    seat.influenceOnTrack = 6;
    seat.populationTracks.money = 3;
    seat.colonyShipsAvailable = 1;
    state = apply(state, 'a', { type: 'finish-upkeep' });
    const view = getPlayerView(state, 'a');
    expect(view.pendingDecision).toMatchObject({ kind: 'bankruptcy', shortfall: 1 });
    expect(evaluateAiCommand(view, { type: 'convert-colony-ship', resource: 'science' })).toBe(-Infinity);
    expect(evaluateAiCommand(view, { type: 'convert-colony-ship', resource: 'materials' })).toBe(-Infinity);
    const choice = chooseAiCommand(view, 80)!;
    expect(choice.command).toEqual({ type: 'convert-colony-ship', resource: 'money' });
    expect(apply(state, 'a', choice.command).phase).toBe('finished');
  });

  it('does not buy a Midas Influence activation with its final upkeep reserve', () => {
    const state = createGame({ seed: 80, factionProfile: 'expanded-v2', ruleOptions: { roundLimit: 6 }, seats: [
      { id: 'a', faction: 'midas', controller: 'ai', pieceColor: 'blue' },
      { id: 'b', faction: 'orion', controller: 'ai', pieceColor: 'red' },
    ] });
    state.round = 6;
    const seat = state.seats[0];
    seat.resources = { money: 2, science: 0, materials: 0 };
    seat.influenceOnTrack = 6;
    seat.populationTracks.money = 3;
    seat.colonyShipsAvailable = 0;
    state.sectors = state.sectors.filter(sector => sector.owner !== null);
    state.engine!.action = { owner: 'a', action: 'influence', remaining: 0, coloniesRefreshed: true };
    const buy: GameCommand = { type: 'buy-activation', action: 'influence' };
    expect(apply(state, 'a', buy).seats[0].resources.money).toBe(0);
    const view = getPlayerView(state, 'a');
    expect(evaluateAiCommand(view, buy)).toBe(-Infinity);
    expect(chooseAiCommand(view, 80)?.command).toEqual({ type: 'end-action' });
  });

  it('ends an open Move instead of shuttling between equally valuable safe sectors', () => {
    const state = game(33);
    state.round = 9;
    state.seats[0].resources.money = 30;
    const { ship, next } = safeMovementPosition(state);
    state.engine!.action = { owner: 'a', action: 'move', remaining: 2 };
    const moved = apply(state, 'a', { type: 'move', moves: [{ shipId: ship.id, path: [next.id] }] });
    const choice = chooseStrategicAiCommand(getPlayerView(moved, 'a'), 2, { difficulty: 'expert' })!;
    expect(choice.command.type).toBe('end-action');
    expect(apply(moved, 'a', choice.command).ships.find(candidate => candidate.id === ship.id)?.sectorId).toBe(next.id);

    // A real improvement remains worth using the same Move activation for.
    next.monolith = true;
    const capture = chooseStrategicAiCommand(getPlayerView(state, 'a'), 2, { difficulty: 'expert' })!;
    expect(capture.command).toMatchObject({ type: 'move', moves: [{ shipId: ship.id, path: [next.id] }] });
  });

  it.each(['hard', 'expert'] as const)('does not shortlist ineffective Move or Influence while leading on %s', difficulty => {
    const state = game(91);
    state.round = 9;
    state.technologyMarket = [];
    state.seats[0].resources = { money: 20, science: 0, materials: 0 };
    state.seats[0].colonyShipsAvailable = 0;
    state.seats[1].passed = true;
    state.firstPasser = 'b';
    const own = state.sectors.find(sector => sector.owner === 'a')!;
    own.monolith = true;
    own.discovery = false;
    safeMovementPosition(state);
    const chosen = chooseStrategicAiCommand(getPlayerView(state, 'a'), 33, { difficulty, maxNodes: 5, now: () => 0 })!;
    expect(chosen.search.nodes).toBeGreaterThan(0);
    expect(chosen.command.type).not.toBe('move');
    expect(apply(state, 'a', chosen.command).sectors.find(sector => sector.id === own.id)?.owner).toBe('a');
  });
});
