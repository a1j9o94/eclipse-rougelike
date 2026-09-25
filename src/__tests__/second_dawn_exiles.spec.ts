import { describe, expect, it } from 'vitest';
import { getFaction } from '../../shared/eclipse/catalog';
import { createGame } from '../../shared/eclipse/setup';
import { calculateScore } from '../../shared/eclipse/scoring';
import { processGameCommand } from '../../shared/eclipse/engine';
import { abandonSector } from '../../shared/eclipse/rulesState';
import { deriveBlueprintStats } from '../../shared/eclipse/blueprints';
import { scoreSeat } from '../../shared/eclipse/rounds';
import { advanceCombat, resolveCombatChoice } from '../../shared/eclipse/battleEngine';
import type { GameEvent } from '../../shared/eclipse/types';
import { chooseAiCommand } from '../../shared/eclipse/ai';
import { getPlayerView } from '../../shared/eclipse/protocol';

describe('The Exiles (official Outcasts pack)', () => {
  it('starts on sector 234 with its printed orbital, techs and population', () => {
    const faction = getFaction('exiles');
    expect(faction.startingResources).toEqual({ materials: 4, science: 2, money: 3 });
    expect(faction.startingTechnologies).toEqual(['orbital', 'cloaking-device']);
    expect(faction.activations).toEqual({ explore: 1, research: 1, upgrade: 2, build: 2, move: 2, influence: 2 });
    const game = createGame({ seed: 10, warpPortals: false, factionProfile: 'expanded-v1', seats: [
      { id: 'exiles', faction: 'exiles', controller: 'human' },
      { id: 'other', faction: 'orion', controller: 'ai' },
    ] });
    const home = game.sectors.find(sector => sector.owner === 'exiles');
    expect(home?.tileId).toBe('234');
    expect(home?.orbital).toBe(true);
    expect(home?.population).toContainEqual({ squareId: 'p2', resource: 'materials' });
    expect(game.seats[0].technologies.nano).toContain('orbital');
    expect(game.seats[0].technologies.nano).toContain('cloaking-device');
    const orbitalBlueprint = game.seats[0].blueprints.find(blueprint => blueprint.shipType === 'starbase')!;
    expect(deriveBlueprintStats('exiles', { ...orbitalBlueprint, outsideParts: [] })).toMatchObject({
      initiative: 2, computer: 1, hull: 1,
      weapons: [{ kind: 'cannon', color: 'yellow', dice: 2, damage: 1 }],
    });
    game.seats[0].technologies.grid.push('positron-computer');
    const upgraded = processGameCommand(game, 'exiles', { type: 'upgrade', blueprints: [{
      shipType: 'starbase', parts: [null, 'positron-computer', null], outsideParts: [],
    }] });
    expect(upgraded.ok).toBe(true);
    if (upgraded.ok) expect(deriveBlueprintStats('exiles', {
      ...upgraded.state.seats[0].blueprints.find(blueprint => blueprint.shipType === 'starbase')!, outsideParts: [],
    }).computer).toBe(2);
  });

  it('scores one point per populated orbital only', () => {
    const base = { playerId: 'exiles', faction: 'exiles' as const, reputation: [], ambassadors: 0,
      discoveriesKeptForVp: 0, traitor: false, researchTracks: [0, 0, 0] as [number, number, number],
      ancientsOnBoard: 0, resources: { money: 0, science: 0, materials: 0 } };
    const score = calculateScore({ ...base, sectors: [
      { id: '234', printedVp: 3, monoliths: 0, portalVp: 0 as const, orbitalPopulated: true },
      { id: '101', printedVp: 2, monoliths: 0, portalVp: 0 as const, orbitalPopulated: false },
    ] });
    expect(score.species).toBe(1);
  });

  it('turns a populated orbital into a stationary defender and removes it on abandonment', () => {
    const game = createGame({ seed: 10, warpPortals: false, factionProfile: 'expanded-v1', seats: [
      { id: 'exiles', faction: 'exiles', controller: 'human' },
      { id: 'other', faction: 'orion', controller: 'ai' },
    ] });
    const home = game.sectors.find(sector => sector.owner === 'exiles')!;
    const colonized = processGameCommand(game, 'exiles', { type: 'colonize', placements: [
      { sectorId: home.id, squareId: 'orbital', resource: 'money' },
    ] });
    expect(colonized.ok).toBe(true);
    if (!colonized.ok) return;
    expect(colonized.state.ships).toContainEqual(expect.objectContaining({ orbitalShip: true, owner: 'exiles', sectorId: home.id }));
    expect(scoreSeat(colonized.state, colonized.state.seats[0]).species).toBe(1);
    const abandoned = structuredClone(colonized.state);
    abandonSector(abandoned, abandoned.sectors.find(sector => sector.id === home.id)!);
    expect(abandoned.ships.some(ship => ship.orbitalShip)).toBe(false);
  });

  it('rejects Starbase construction even after acquiring its technology', () => {
    const game = createGame({ seed: 10, warpPortals: false, factionProfile: 'expanded-v1', seats: [
      { id: 'exiles', faction: 'exiles', controller: 'human' },
      { id: 'other', faction: 'orion', controller: 'ai' },
    ] });
    game.seats[0].technologies.grid.push('starbase');
    const home = game.sectors.find(sector => sector.owner === 'exiles')!;
    expect(processGameCommand(game, 'exiles', { type: 'build', builds: [
      { sectorId: home.id, component: 'starbase' },
    ] }).ok).toBe(false);
  });

  it('loses a populated Orbital as a ship while its structure remains', () => {
    const game = createGame({ seed: 10, warpPortals: false, factionProfile: 'expanded-v1', seats: [
      { id: 'exiles', faction: 'exiles', controller: 'human' },
      { id: 'other', faction: 'orion', controller: 'ai' },
    ] });
    const home = game.sectors.find(sector => sector.owner === 'exiles')!;
    const colonized = processGameCommand(game, 'exiles', { type: 'colonize', placements: [
      { sectorId: home.id, squareId: 'orbital', resource: 'money' },
    ] });
    if (!colonized.ok) throw Error(colonized.error.message);
    const state = colonized.state;
    state.ships = state.ships.filter(ship => ship.owner !== 'exiles' || ship.orbitalShip);
    const attacker = state.ships.find(ship => ship.owner === 'other')!;
    attacker.sectorId = home.id;
    attacker.type = 'dreadnought';
    state.seats[1].blueprints.find(blueprint => blueprint.shipType === 'dreadnought')!.parts = [
      'electron-computer', 'antimatter-cannon', 'antimatter-cannon', 'hull', 'hull', 'nuclear-source', 'nuclear-drive', null,
    ];
    state.phase = 'combat';
    const events: GameEvent[] = [];
    for (let step = 0; step < 50 && state.ships.some(ship => ship.orbitalShip); step++) {
      advanceCombat(state, events);
      const decision = state.pendingDecision;
      if (!decision) continue;
      if (decision.kind === 'combat-turn') resolveCombatChoice(state, decision.owner, decision, { kind: 'combat-turn', retreatTo: null }, events);
      else if (decision.kind === 'combat-allocation') resolveCombatChoice(state, decision.owner, decision, {
        kind: 'combat-allocation', allocations: decision.dice.filter(die => die.targets.length).map(die => ({ dieId: die.id, targetId: die.targets[0] })),
      }, events);
      else throw Error(`Unexpected decision ${decision.kind}`);
    }
    expect(state.ships.some(ship => ship.orbitalShip)).toBe(false);
    expect(state.sectors.find(sector => sector.id === home.id)?.orbital).toBe(true);
    expect(state.sectors.find(sector => sector.id === home.id)?.population.some(cube => cube.squareId === 'orbital')).toBe(false);
    expect(state.engine?.battle?.kills).toContainEqual({ owner: 'other', value: 2 });
    expect(state.engine?.decisions).toContainEqual(expect.objectContaining({ kind: 'population-return', owner: 'exiles', destination: 'graveyard', resources: ['money'] }));
  });

  it('finishes a seeded AI match with Exiles', () => {
    let state = createGame({ seed: 234, warpPortals: false, factionProfile: 'expanded-v1', seats: [
      { id: 'exiles', faction: 'exiles', controller: 'ai' },
      { id: 'other', faction: 'orion', controller: 'ai' },
    ] });
    let commands = 0;
    while (state.phase !== 'finished' && commands < 6000) {
      const actor = state.pendingDecision?.owner ?? state.activeSeatId;
      if (!actor) throw Error(`Missing actor during ${state.phase}`);
      const selected = chooseAiCommand(getPlayerView(state, actor), 23400 + commands);
      if (!selected) throw Error(`No AI command for ${actor}`);
      const result = processGameCommand(state, actor, selected.command);
      if (!result.ok) throw Error(result.error.message);
      state = result.state;
      commands++;
    }
    expect(state.phase).toBe('finished');
    expect(state.engine?.scores).toHaveLength(2);
  }, 30_000);
});
