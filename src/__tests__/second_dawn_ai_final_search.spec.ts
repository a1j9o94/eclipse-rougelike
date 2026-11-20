import { describe, expect, it } from 'vitest';
import { chooseAiCommand } from '../../shared/eclipse/ai';
import { chooseStrategicAiCommand } from '../../shared/eclipse/aiSearch';
import { sampleAiWorld } from '../../shared/eclipse/aiWorld';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { scoreSeat } from '../../shared/eclipse/rounds';
import { createGame } from '../../shared/eclipse/setup';
import type { GameCommand, GameState } from '../../shared/eclipse/types';

function finalTurn(faction: 'orion' | 'lyra' = 'orion') {
  const state = createGame({ seed: 7201, factionProfile: 'official-v1', ruleOptions: { roundLimit: 6 }, seats: [
    { id: 'a', faction, pieceColor: 'black', controller: 'ai' },
    { id: 'b', faction: 'hydran', pieceColor: 'blue', controller: 'ai' },
  ] });
  state.round = 6;
  state.activeSeatId = 'a';
  state.firstPasser = 'b';
  state.seats[1].passed = true;
  state.seats[1].autoPassUnlessAttacked = true;
  state.sectors = state.sectors.filter(sector => sector.owner !== null);
  state.ships = state.ships.filter(ship => ship.owner === 'a' || ship.owner === 'b');
  state.technologyMarket = [];
  state.supplies.inner = [];
  state.supplies.middle = [];
  state.supplies.outer = [];
  state.seats[0].resources = { money: 18, science: 0, materials: 18 };
  state.seats[0].colonyShipsAvailable = 0;
  return state;
}

function apply(state: GameState, actor: string, command: GameCommand) {
  const result = processGameCommand(state, actor, command);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

/** After this candidate, pass every remaining ordinary turn and use the real upkeep and scoring. */
function finish(state: GameState, command: GameCommand) {
  state = apply(state, 'a', command);
  for (let step = 0; step < 60 && state.phase !== 'finished'; step++) {
    const actor = state.pendingDecision?.owner ?? state.activeSeatId!;
    const next = state.phase === 'action' && !state.pendingDecision
      ? state.engine?.action ? { type: 'end-action' } as const : { type: 'pass' } as const
      : chooseAiCommand(getPlayerView(state, actor), 7201)!.command;
    state = apply(state, actor, next);
  }
  expect(state.phase).toBe('finished');
  return state.engine!.scores!.find(score => score.playerId === 'a')!;
}

describe('final-round search compares settled outcomes', () => {
  it('preserves the current action turn for expiring reservations in all sampled worlds', () => {
    const state = finalTurn();
    state.actionTurnSerial = 113;
    const view = getPlayerView(state, 'a');
    expect(view.actionTurnSerial).toBe(113);
    expect(sampleAiWorld(view, 42).actionTurnSerial).toBe(113);
  });

  it('carries an eliminated rival’s frozen points into the sample with sampled hidden reputation', () => {
    const state = finalTurn();
    const rival = state.seats[1];
    rival.discoveryBonuses = ['reputation'];
    state.privateSeats[1].reputation = [3, 4];
    state.engine!.scores = [scoreSeat(state, rival)];
    rival.eliminated = true;
    const view = getPlayerView(state, 'a')!;
    const visible = view.scores![0];
    expect(visible.reputation).toBe(0);
    const sample = sampleAiWorld(view, 42);
    const reputation = sample.privateSeats[1].reputation.reduce((total, tile) => total + tile, 0);
    expect(sample.engine!.scores?.[0]).toMatchObject({
      playerId: rival.id, reputation, total: visible.total + reputation + Math.floor(reputation / 3),
      resourceTotal: visible.resourceTotal,
    });
  });
  it.each(['hard', 'expert'] as const)('keeps the pass baseline on %s even with a single node', difficulty => {
    const state = finalTurn();
    const view = getPlayerView(state, 'a');
    const sectorId = state.sectors.find(sector => sector.owner === 'a')!.id;
    const build: GameCommand = { type: 'build', builds: [{ sectorId, component: 'cruiser' }] };
    const construction = finish(state, build), pass = finish(state, { type: 'pass' });
    expect(construction.total).toBe(pass.total);
    expect(construction.resourceTotal).toBeLessThan(pass.resourceTotal);
    const choice = chooseStrategicAiCommand(view, 42, { difficulty, maxNodes: 1, now: () => 0 })!;
    expect(choice.search.nodes).toBe(1);
    expect(choice.command.type).toBe('pass');
  });

  it('plans both scoring actions when the other seat auto-passes between them', () => {
    const state = finalTurn();
    state.seats[0].technologies.nano.push('monolith');
    state.seats[0].technologies.grid.push('fusion-source', 'positron-computer');
    state.seats[0].resources.science = 20;
    state.technologyMarket = ['improved-hull'];
    const choice = chooseStrategicAiCommand(getPlayerView(state, 'a'), 42, { difficulty: 'expert', maxNodes: 48, now: () => 0 })!;
    const scored = finish(state, choice.command), pass = finish(state, { type: 'pass' });
    expect(scored.total).toBeGreaterThan(pass.total);
    expect(choice.search.principalVariation.map(step => step.type)).toEqual(expect.arrayContaining(['build', 'research']));
  });

  it('compares a Lyra Shrine that starts Research with the same pass baseline', () => {
    const state = finalTurn('lyra');
    state.seats[0].resources = { money: 6, science: 0, materials: 0 };
    const view = getPlayerView(state, 'a');
    expect(chooseAiCommand(view, 42)!.command.type).toBe('place-shrine');
    const choice = chooseStrategicAiCommand(view, 42, { difficulty: 'hard', maxNodes: 1, now: () => 0 })!;
    expect(choice.search.nodes).toBe(1);
    expect(finish(state, choice.command).total).toBeGreaterThan(finish(state, { type: 'pass' }).total);
  });
});
