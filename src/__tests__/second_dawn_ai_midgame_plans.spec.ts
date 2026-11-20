import { describe, expect, it } from 'vitest';
import { chooseAiCommand } from '../../shared/eclipse/ai';
import { chooseStrategicAiCommand } from '../../shared/eclipse/aiSearch';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { scoreSeat } from '../../shared/eclipse/rounds';
import { createGame } from '../../shared/eclipse/setup';
import type { GameCommand, GameState } from '../../shared/eclipse/types';

const actor = 'planner';
const seed = 947;
const options = { difficulty: 'hard' as const, now: () => 0 };
const research: GameCommand = { type: 'research', tileId: 'monolith', track: 'nano' };

function monolithRace() {
  const state = createGame({ seed: 1941, ruleOptions: { roundLimit: 4 }, seats: [
    { id: actor, faction: 'orion', controller: 'ai' }, { id: 'rival', faction: 'hydran', controller: 'ai' },
  ] });
  state.round = 3;
  state.activeSeatId = actor;
  state.startSeatId = 'rival';
  state.firstPasser = 'rival';
  state.seats[1].passed = true;
  state.seats[1].autoPassUnlessAttacked = true;
  state.sectors = state.sectors.filter(sector => sector.owner !== null);
  state.ships = [];
  state.technologyMarket = ['monolith'];
  state.supplies.inner = [];
  state.supplies.middle = [];
  state.supplies.outer = [];
  state.supplies.technology = [];
  for (const seat of state.seats) {
    seat.colonyShipsAvailable = 0;
    seat.resources = { money: 9, science: 12, materials: seat.id === actor ? 10 : 0 };
  }
  return state;
}

function apply(state: GameState, owner: string, command: GameCommand) {
  const result = processGameCommand(state, owner, command);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

/** The queued entries are main actions. Both sides still resolve all intervening choices by playing the real game. */
function finish(initial: GameState, mainActions: GameCommand[], remainingTurns: 'play' | 'pass' = 'play') {
  let state = initial;
  let used = 0;
  for (let step = 0; step < 160 && state.phase !== 'finished'; step++) {
    const owner = state.pendingDecision?.owner ?? state.activeSeatId!;
    const ordinary = state.phase === 'action' && !state.pendingDecision && !state.engine?.action;
    let command: GameCommand;
    if (owner === actor && ordinary && used < mainActions.length) command = mainActions[used++];
    else if (ordinary && remainingTurns === 'pass') command = { type: 'pass' };
    else command = chooseAiCommand(getPlayerView(state, owner)!, seed)!.command;
    state = apply(state, owner, command);
  }
  expect(state.phase).toBe('finished');
  expect(used).toBe(mainActions.length);
  return state.engine!.scores!;
}

describe('midgame planning in expected final VP', () => {
  it('plans research and construction together on a board where buying isolated ships cannot score', () => {
    const state = monolithRace();
    const view = getPlayerView(state, actor)!;
    const sectorId = state.sectors.find(sector => sector.owner === actor)!.id;
    const build: GameCommand = { type: 'build', builds: [{ sectorId, component: 'monolith' }] };
    const fleet: GameCommand = { type: 'build', builds: [{ sectorId, component: 'cruiser' }, { sectorId, component: 'cruiser' }] };
    const researched = apply(state, actor, research);
    expect(scoreSeat(researched, researched.seats[0]).total).toBe(scoreSeat(state, state.seats[0]).total);
    const score = (plan: GameCommand[]) => finish(state, plan).find(row => row.playerId === actor)!.total;
    expect(score([research, build])).toBe(6);
    expect(score([fleet])).toBe(3);
    expect(score([{ type: 'pass' }])).toBe(3);

    const before = structuredClone(state);
    const choice = chooseStrategicAiCommand(view, seed, options)!;
    expect(state).toEqual(before);
    expect(choice.search.principalVariation[0]).toEqual(choice.command);
    const line = choice.search.principalVariation;
    const researchIndex = line.findIndex(command => command.type === 'research' && command.tileId === 'monolith');
    const buildIndex = line.findIndex(command => command.type === 'build' && command.builds.some(piece => piece.component === 'monolith'));
    expect(researchIndex).toBeGreaterThanOrEqual(0);
    expect(buildIndex).toBeGreaterThan(researchIndex);
    // There is no combat, discovery, exploration or new technology supply in this position.
    // The measured finish can therefore be checked against both authoritative score sheets.
    const scores = finish(state, line.slice(0, buildIndex + 1));
    const forecast = choice.search.forecast;
    expect(forecast).toMatchObject({ source: 'rollout', comparedPass: true,
      expectedVp: scores.find(row => row.playerId === actor)!.total,
      expectedLeaderVp: scores.find(row => row.playerId === 'rival')!.total,
    });
    expect(forecast!.samples).toBe(choice.search.samples);
    expect(forecast!.comparedPlans).toBeGreaterThanOrEqual(2);
  });

  it('chooses to pass when another paid action would endanger a home monolith at upkeep', () => {
    const state = monolithRace();
    const seat = state.seats[0];
    const home = state.sectors.find(sector => sector.owner === actor)!;
    home.monolith = true;
    seat.populationTracks.money = 1;
    seat.actionDiscs.explore = seat.influenceOnTrack - 7;
    seat.influenceOnTrack = 7;
    seat.resources = { money: 2, science: 4, materials: 4 };
    state.seats[1].resources.science = 0;
    state.technologyMarket = ['fusion-source'];

    // After the first choice both sides pass their turns; upkeep, including
    // any necessary trades or abandonment, still runs through the game engine.
    const scoreAfter = (command: GameCommand) => finish(state, [command], 'pass').find(row => row.playerId === actor)!;
    const passing = scoreAfter({ type: 'pass' });
    const research = scoreAfter({ type: 'research', tileId: 'fusion-source', track: 'grid' });
    const building = scoreAfter({ type: 'build', builds: [{ sectorId: home.id, component: 'interceptor' }] });
    expect(passing.total).toBe(6);
    expect(research.total).toBe(0);
    expect(building.total).toBe(6);
    expect(building.resourceTotal).toBeLessThan(passing.resourceTotal);

    const choice = chooseStrategicAiCommand(getPlayerView(state, actor)!, 42, options)!;
    expect(choice.command).toEqual({ type: 'pass' });
    expect(choice.search.forecast).toMatchObject({
      source: 'rollout', comparedPass: true, expectedVp: passing.total, comparedPlans: 2, samples: 2,
    });
  });

  it('makes the same decision when only the hidden rival reputation and game RNG change', () => {
    const state = monolithRace();
    state.privateSeats[1].reputation = [1, 2];
    const changed = structuredClone(state);
    changed.privateSeats[1].reputation = [3, 4];
    changed.random.value ^= 123456;
    const view = getPlayerView(state, actor)!;
    const other = getPlayerView(changed, actor)!;
    expect(other).toEqual(view);
    const choice = chooseStrategicAiCommand(view, seed, options)!;
    expect(chooseStrategicAiCommand(other, seed, options)).toEqual(choice);
    expect(processGameCommand(state, actor, choice.command).ok).toBe(true);
  });

  it('compares second moves within a 32-node budget when several action families are affordable', () => {
    const state = createGame({ seed: 27, seats: [
      { id: actor, faction: 'orion', controller: 'ai' }, { id: 'rival', faction: 'hydran', controller: 'ai' },
    ] });
    state.round = 3;
    state.seats[0].resources = { money: 12, science: 12, materials: 12 };
    const view = getPlayerView(state, actor)!;
    const choice = chooseStrategicAiCommand(view, 27, { difficulty: 'expert', maxNodes: 32, now: () => 0 })!;
    expect(processGameCommand(state, actor, choice.command).ok).toBe(true);
    expect(choice.search.nodes).toBeLessThanOrEqual(32);
    expect(choice.search.opponentCommands).toBeGreaterThan(0);
    expect(choice.search.completedDepth).toBeGreaterThanOrEqual(2);
    expect(choice.search.principalVariation.length).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it('uses a VP estimate in an early round when the node budget cannot finish two plans', () => {
    const state = monolithRace();
    state.round = 2;
    state.ruleOptions = { ...state.ruleOptions, roundLimit: 10 };
    const view = getPlayerView(state, actor)!;
    const choice = chooseStrategicAiCommand(view, seed, { ...options, maxNodes: 1 })!;
    expect(processGameCommand(state, actor, choice.command).ok).toBe(true);
    expect(choice.search.nodes).toBeLessThanOrEqual(1);
    expect(choice.search.forecast).toMatchObject({ source: 'estimate', samples: 0 });
    expect(Number.isFinite(choice.search.forecast!.expectedVp)).toBe(true);
    expect(Number.isFinite(choice.search.forecast!.expectedLeaderVp)).toBe(true);
  });

  it('accepts two completed Expert finalists if the third times out, and requires a second for comparison', () => {
    const view = getPlayerView(monolithRace(), actor)!;
    function searchUntil(stop: number) {
      let checks = 0;
      const choice = chooseStrategicAiCommand(view, seed, {
        difficulty: 'expert', maxNodes: 96, budgetMs: 1000, now: () => ++checks <= stop ? 0 : 1000,
      })!;
      return { search: choice.search, checks };
    }
    const full = searchUntil(Infinity);
    expect(full.search.forecast).toMatchObject({ source: 'rollout', comparedPass: true, comparedPlans: 3, samples: 3 });
    const treeNodes = full.search.nodes - 3 * 3;
    // Find the deadline at which the first sample of the next finalist has just
    // started. Counting clock checks dynamically keeps this independent of runtime.
    function interruptAfter(plans: number) {
      const target = treeNodes + 3 * plans + 1;
      let low = 0, high = full.checks;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (searchUntil(mid).search.nodes >= target) high = mid;
        else low = mid + 1;
      }
      const stopped = searchUntil(low).search;
      expect(stopped.nodes).toBe(target);
      expect(stopped.cutoff).toBe(true);
      return stopped.forecast;
    }
    expect(interruptAfter(1)).toMatchObject({ source: 'estimate', samples: 0 });
    expect(interruptAfter(2)).toMatchObject({ source: 'rollout', comparedPass: true, samples: 3, comparedPlans: 2 });
  }, 30_000);

  it('returns a legal choice and reports no sampled final score if the deadline expires', () => {
    const state = monolithRace();
    const view = getPlayerView(state, actor)!;
    let tick = 0;
    const choice = chooseStrategicAiCommand(view, seed, { ...options, budgetMs: 1, now: () => tick++ })!;
    expect(processGameCommand(state, actor, choice.command).ok).toBe(true);
    expect(choice.search.nodes).toBe(0);
    expect(choice.search.forecast?.source).not.toBe('rollout');
    expect(choice.search.forecast?.samples ?? 0).toBe(0);
  });
});
