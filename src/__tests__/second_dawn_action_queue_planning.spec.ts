import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import {
  builtShipBindingKey,
  projectQueuedSteps,
  recordBuiltShipBindings,
  resolveQueuedCommand,
  type ActionQueueStep,
} from '../../shared/eclipse/queue';

function game() {
  return createGame({
    seed: 93,
    seats: [
      { id: 'one', faction: 'terran-directorate', controller: 'human' },
      { id: 'two', faction: 'planta', controller: 'human' },
    ],
    warpPortals: false,
  });
}

describe('queued action planning', () => {
  it('resolves a future built ship by the build step and index', () => {
    const before = game();
    const sectorId = before.sectors.find(sector => sector.owner === 'one')!.id;
    const build: ActionQueueStep = {
      id: 'build-a',
      command: { type: 'build', builds: [{ sectorId, component: 'interceptor' }] },
    };
    const after = structuredClone(before);
    after.ships.push({ id: 'ship-created', owner: 'one', type: 'interceptor', sectorId, damage: 0 });
    const bindings = recordBuiltShipBindings(build, before, after, 'one', {});
    expect(bindings[builtShipBindingKey('build-a', 0)]).toBe('ship-created');
    const move: ActionQueueStep = {
      id: 'move-a',
      command: { type: 'move', moves: [{ shipId: { kind: 'built-ship', stepId: 'build-a', buildIndex: 0 }, path: [sectorId] }] },
    };
    expect(resolveQueuedCommand(move, bindings, after)).toEqual({
      ok: true,
      command: { type: 'move', moves: [{ shipId: 'ship-created', path: [sectorId] }] },
    });
    expect(resolveQueuedCommand(move, {}, after)).toMatchObject({ ok: false });
  });

  it('keeps build indices stable when a structure also creates a combat orbital', () => {
    const before = game();
    const sectorId = before.sectors.find(sector => sector.owner === 'one')!.id;
    const build: ActionQueueStep = { id: 'mixed-build', command: { type: 'build', builds: [
      { sectorId, component: 'orbital' },
      { sectorId, component: 'interceptor' },
    ] } };
    const after = structuredClone(before);
    after.ships.push({ id: 'orbital-combat', owner: 'one', type: 'starbase', sectorId, damage: 0, orbitalShip: true });
    after.ships.push({ id: 'interceptor-build', owner: 'one', type: 'interceptor', sectorId, damage: 0 });
    const bindings = recordBuiltShipBindings(build, before, after, 'one', {});
    expect(bindings).toEqual({ [builtShipBindingKey('mixed-build', 1)]: 'interceptor-build' });
  });

  it('resolves a newly explored sector by coordinate only after placement', () => {
    const state = game();
    const sector = state.sectors[0];
    const step: ActionQueueStep = {
      id: 'build-b',
      command: { type: 'build', builds: [{ sectorId: { kind: 'sector-coordinate', position: sector.position }, component: 'interceptor' }] },
    };
    expect(resolveQueuedCommand(step, {}, state)).toEqual({
      ok: true,
      command: { type: 'build', builds: [{ sectorId: sector.id, component: 'interceptor' }] },
    });
    expect(resolveQueuedCommand(step, {}, { ...state, sectors: [] })).toMatchObject({ ok: false });
  });

  it('projects a researched part as available to a later upgrade while preserving the input view', () => {
    const state = game();
    const seat = state.seats.find(value => value.id === 'one')!;
    const view = getPlayerView(state, 'one')!;
    const technologyId = 'gauss-shield';
    state.technologyMarket.push(technologyId);
    seat.resources.science = 50;
    const current = seat.blueprints.find(blueprint => blueprint.shipType === 'interceptor')!;
    const upgraded = { ...current, parts: [...current.parts] };
    upgraded.parts[upgraded.parts.length - 1] = 'gauss-shield';
    const steps: ActionQueueStep[] = [
      { id: 'research', command: { type: 'research', tileId: technologyId, track: 'grid' } },
      { id: 'upgrade', command: { type: 'upgrade', blueprints: [upgraded] } },
    ];
    const projection = projectQueuedSteps(getPlayerView(state, 'one')!, steps);
    expect(projection.map(item => item.status)).toEqual(['known', 'known']);
    expect(view.seats.find(value => value.id === 'one')!.technologies.grid).not.toContain(technologyId);
    expect(seat.technologies.grid).not.toContain(technologyId);
  });

  it('keeps a move after a planned build tentative and rejects an impossible future ship alias', () => {
    const state = game();
    state.seats.find(value => value.id === 'one')!.resources.materials = 20;
    const sectorId = state.sectors.find(sector => sector.owner === 'one')!.id;
    const build: ActionQueueStep = {
      id: 'build', command: { type: 'build', builds: [{ sectorId, component: 'interceptor' }] },
    };
    const plannedMove: ActionQueueStep = {
      id: 'move', command: { type: 'move', moves: [{ shipId: { kind: 'built-ship', stepId: 'build', buildIndex: 0 }, path: [sectorId] }] },
    };
    const view = getPlayerView(state, 'one')!;
    expect(projectQueuedSteps(view, [build, plannedMove]).map(value => value.status)).toEqual(['known', 'uncertain']);
    const invalid = structuredClone(plannedMove);
    if (invalid.command.type === 'move') invalid.command.moves[0].shipId = { kind: 'built-ship', stepId: 'build', buildIndex: 5 };
    expect(projectQueuedSteps(view, [build, invalid])[1]).toMatchObject({ status: 'blocked' });
  });

  it('does not claim future affordability is impossible after an unknown exploration outcome', () => {
    const state = game();
    state.seats.find(value => value.id === 'one')!.resources.materials = 0;
    const sectorId = state.sectors.find(sector => sector.owner === 'one')!.id;
    const steps: ActionQueueStep[] = [
      { id: 'explore', command: { type: 'explore', position: { q: 0, r: 1 } } },
      { id: 'build', command: { type: 'build', builds: [{ sectorId, component: 'interceptor' }] } },
    ];
    expect(projectQueuedSteps(getPlayerView(state, 'one')!, steps)[1].status).toBe('uncertain');
  });
});
