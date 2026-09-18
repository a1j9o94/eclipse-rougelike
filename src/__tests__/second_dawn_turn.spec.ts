import { describe, expect, it } from 'vitest';
import { passTurn, tradeDuringGame } from '../../shared/eclipse/turn';
import { getFaction } from '../../shared/eclipse/catalog';
import { randomSeed } from '../../shared/eclipse/random';
import type { GameState, Seat } from '../../shared/eclipse/types';
function fixture(): GameState {
  const seats: Seat[] = (
    ['terran-directorate', 'hydran', 'planta'] as const
  ).map((faction, i) => ({
    id: String(i),
    faction,
    controller: i ? 'ai' : 'human',
    resources: { ...getFaction(faction).startingResources },
    populationTracks: { money: 0, science: 0, materials: 0 },
    influenceOnTrack: 12,
    actionDiscs: {
      explore: 0,
      influence: 0,
      research: 0,
      upgrade: 0,
      build: 0,
      move: 0,
    },
    colonyShipsAvailable: 3,
    passed: false,
    eliminated: false,
    technologies: { military: [], grid: [], nano: [] },
    blueprints: [],
    ambassadors: [],
    traitor: false,
  }));
  return {
    rulesVersion: 'fixture',
    catalogVersion: 'fixture',
    revision: 0,
    round: 1,
    phase: 'action',
    activeSeatId: '0',
    startSeatId: '2',
    firstPasser: null,
    seats,
    sectors: [],
    ships: [],
    technologyMarket: [],
    pendingDecision: null,
    privateSeats: seats.map((s) => ({
      seatId: s.id,
      reputation: [],
      discoveriesKept: [],
    })),
    random: randomSeed(2),
    supplies: {
      inner: [],
      middle: [],
      outer: [],
      technology: [],
      discovery: [],
      reputation: [],
    },
  };
}
describe('publisher p8 passing and p24 trading', () => {
  it('rewards the first passer once without spending an action disc or random draw', () => {
    const initial = fixture();
    const result = passTurn(initial, '0');
    if (!result.ok) throw Error(result.error.message);
    expect(result.state.seats[0].resources.money).toBe(5);
    expect(result.state.startSeatId).toBe('0');
    expect(result.state.activeSeatId).toBe('1');
    expect(result.state.seats[0].influenceOnTrack).toBe(12);
    expect(result.state.random).toEqual(initial.random);
    expect(initial.seats[0].passed).toBe(false);
    result.state.activeSeatId = '0';
    const again = passTurn(result.state, '0');
    expect(again.ok && again.state.seats[0].resources.money).toBe(5);
  });
  it('keeps passed seats in the turn cycle so they can react', () => {
    const initial = fixture();
    initial.seats[0].passed = true;
    initial.activeSeatId = '2';
    initial.firstPasser = '0';
    const result = passTurn(initial, '2');
    expect(result.ok && result.state.activeSeatId).toBe('0');
    expect(result.ok && result.state.phase).toBe('action');
  });
  it('enters combat immediately when the last surviving seat passes, even in round8', () => {
    const initial = fixture();
    initial.round = 8;
    initial.seats[1].passed = true;
    initial.seats[2].eliminated = true;
    const result = passTurn(initial, '0');
    expect(result.ok && result.state.phase).toBe('combat');
    expect(result.ok && result.state.activeSeatId).toBeNull();
  });
  it('rejects invalid turns, finished phases, and outstanding choices without mutation', () => {
    const initial = fixture();
    expect(passTurn(initial, '1').ok).toBe(false);
    expect(passTurn(initial, 'outsider').ok).toBe(false);
    initial.pendingDecision = {
      id: 'r',
      kind: 'reputation',
      owner: '0',
      drawn: [4],
      capacity: 1,
    };
    const before = JSON.stringify(initial);
    expect(passTurn(initial, '0').ok).toBe(false);
    expect(JSON.stringify(initial)).toBe(before);
  });
  it('permits faction-rate trade outside the active turn without advancing it', () => {
    const initial = fixture();
    const result = tradeDuringGame(initial, '1', 'science', 'money', 2);
    expect(result.ok && result.state.seats[1].resources).toEqual({
      science: 0,
      money: 4,
      materials: 2,
    });
    expect(result.ok && result.state.activeSeatId).toBe('0');
    expect(initial.seats[1].resources.science).toBe(6);
    expect(tradeDuringGame(initial, '1', 'science', 'money', 3).ok).toBe(false);
  });
  it('preserves bankruptcy decisions after a trade so upkeep can be recalculated', () => {
    const initial = fixture();
    initial.phase = 'upkeep';
    initial.pendingDecision = {
      id: 'b',
      kind: 'bankruptcy',
      owner: '1',
      shortfall: 2,
      abandonableSectorIds: [],
    };
    const result = tradeDuringGame(initial, '1', 'science', 'money', 2);
    expect(result.ok && result.state.pendingDecision).toEqual(
      initial.pendingDecision,
    );
    expect(tradeDuringGame(initial, '0', 'materials', 'money', 1).ok).toBe(
      false,
    );
  });
});
