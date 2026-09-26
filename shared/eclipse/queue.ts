import { validateBlueprint } from './blueprints';
import { previewCommand } from './commandPreview';
import { publicBlueprint } from './legal';
import { constructionCostForSeat, researchCostForSeat } from './minorSpecies';
import { researchedTechnologyIds, type TechnologyId } from './technologies';
import type { Coordinate, GameCommand, GameState, PlayerView, Resources } from './types';

/** A coordinate remains meaningful before Explore has given the sector an ID. */
export interface QueueSectorReference {
  kind: 'sector-coordinate';
  position: Coordinate;
}
export type QueueSectorTarget = string | QueueSectorReference;
export interface QueueBuiltShipReference {
  kind: 'built-ship';
  stepId: string;
  buildIndex: number;
}
export type QueueShipTarget = string | QueueBuiltShipReference;

type QueuedBuild = Omit<Extract<GameCommand, { type: 'build' }>, 'builds'> & {
  builds: { sectorId: QueueSectorTarget; component: Extract<GameCommand, { type: 'build' }>['builds'][number]['component'] }[];
};
type QueuedMove = Omit<Extract<GameCommand, { type: 'move' }>, 'moves'> & {
  moves: { shipId: QueueShipTarget; path: QueueSectorTarget[] }[];
};
type QueuedInfluence = Omit<Extract<GameCommand, { type: 'influence' }>, 'removeSectorIds' | 'addSectorIds'> & {
  removeSectorIds: QueueSectorTarget[];
  addSectorIds: QueueSectorTarget[];
};
type QueuedColonize = Omit<Extract<GameCommand, { type: 'colonize' }>, 'placements'> & {
  placements: (Omit<Extract<GameCommand, { type: 'colonize' }>['placements'][number], 'sectorId'> & { sectorId: QueueSectorTarget })[];
};
type QueuedTradeAndAct = Omit<Extract<GameCommand, { type: 'trade-and-act' }>, 'action'> & {
  action: Extract<GameCommand, { type: 'trade-and-act' }>['action'] extends infer A
    ? Exclude<A, { type: 'build' }> | QueuedBuild
    : never;
};
type QueuedPlaceShrine = Omit<Extract<GameCommand, { type: 'place-shrine' }>, 'sectorId'> & { sectorId: QueueSectorTarget };

/** Decisions depend on outcomes and must always be answered by a player. */
export type QueuedGameCommand =
  | Exclude<GameCommand, { type: 'resolve' | 'build' | 'move' | 'influence' | 'colonize' | 'trade-and-act' | 'place-shrine' }>
  | QueuedBuild | QueuedMove | QueuedInfluence | QueuedColonize | QueuedTradeAndAct | QueuedPlaceShrine;
export interface ActionQueueStep {
  id: string;
  command: QueuedGameCommand;
}
export interface ActionQueueView {
  steps: ActionQueueStep[];
  status: 'draft' | 'running' | 'paused' | 'finished';
  currentIndex: number;
  pauseReason?: string;
}
export type QueueCommandResolution =
  | { ok: true; command: GameCommand }
  | { ok: false; reason: string };

export function builtShipBindingKey(stepId: string, buildIndex: number): string {
  return `${stepId}:${buildIndex}`;
}

/** Bind the actual IDs created by a successful Build. Structures produce no ship binding. */
export function recordBuiltShipBindings(
  step: ActionQueueStep,
  before: GameState,
  after: GameState,
  actor: string,
  bindings: Readonly<Record<string, string>>,
): Record<string, string> {
  const builds = step.command.type === 'build' ? step.command.builds
    : step.command.type === 'trade-and-act' && step.command.action.type === 'build' ? step.command.action.builds
      : [];
  const result = { ...bindings };
  const priorIds = new Set(before.ships.map(ship => ship.id));
  const created = after.ships.filter(ship => ship.owner === actor && !priorIds.has(ship.id));
  builds.forEach((build, buildIndex) => {
    if (build.component === 'orbital' || build.component === 'monolith') return;
    const match = created.findIndex(ship => ship.type === build.component &&
      (typeof build.sectorId !== 'string' || ship.sectorId === build.sectorId));
    if (match >= 0) {
      const [ship] = created.splice(match, 1);
      result[builtShipBindingKey(step.id, buildIndex)] = ship.id;
    }
  });
  return result;
}

/** Resolve only against committed state. A missing target pauses execution, never substitutes another piece. */
export function resolveQueuedCommand(
  step: ActionQueueStep,
  bindings: Readonly<Record<string, string>>,
  state: GameState,
): QueueCommandResolution {
  const sector = (target: QueueSectorTarget): string | null => {
    if (typeof target === 'string') return target;
    return state.sectors.find(value => value.position.q === target.position.q && value.position.r === target.position.r)?.id ?? null;
  };
  const sectorOrError = (target: QueueSectorTarget): string => {
    const id = sector(target);
    if (id === null) {
      if (typeof target === 'string') throw new Error(`Sector ${target} is unavailable.`);
      throw new Error(`No placed sector at ${target.position.q}, ${target.position.r}.`);
    }
    return id;
  };
  const build = (command: QueuedBuild): Extract<GameCommand, { type: 'build' }> => ({
    type: 'build', builds: command.builds.map(value => ({ ...value, sectorId: sectorOrError(value.sectorId) })),
  });
  try {
    const command = step.command;
    switch (command.type) {
      case 'build': return { ok: true, command: build(command) };
      case 'trade-and-act': return { ok: true, command: {
        ...command,
        action: command.action.type === 'build' ? build(command.action) : command.action,
      } };
      case 'move': return { ok: true, command: {
        type: 'move', moves: command.moves.map(value => ({
          shipId: typeof value.shipId === 'string' ? value.shipId :
            bindings[builtShipBindingKey(value.shipId.stepId, value.shipId.buildIndex)] ??
              (() => { throw new Error('A planned ship has not been built yet.'); })(),
          path: value.path.map(sectorOrError),
        })),
      } };
      case 'influence': return { ok: true, command: {
        type: 'influence',
        removeSectorIds: command.removeSectorIds.map(sectorOrError),
        addSectorIds: command.addSectorIds.map(sectorOrError),
      } };
      case 'colonize': return { ok: true, command: {
        type: 'colonize', placements: command.placements.map(value => ({ ...value, sectorId: sectorOrError(value.sectorId) })),
      } };
      case 'place-shrine': return { ok: true, command: { ...command, sectorId: sectorOrError(command.sectorId) } };
      default: return { ok: true, command };
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'The planned target is unavailable.' };
  }
}

export interface QueueStepProjection {
  stepId: string;
  status: 'known' | 'uncertain' | 'blocked';
  reason?: string;
  resourcesAfter: Resources;
}

/** A public, advisory projection. Every queued step is revalidated by the server before execution. */
export function projectQueuedSteps(view: PlayerView, steps: readonly ActionQueueStep[]): QueueStepProjection[] {
  const projected = structuredClone(view);
  const seat = projected.seats.find(value => value.id === view.viewerSeatId);
  if (!seat) return steps.map(step => ({ stepId: step.id, status: 'blocked', reason: 'Your seat is unavailable.', resourcesAfter: { money: 0, science: 0, materials: 0 } }));
  const result: QueueStepProjection[] = [];
  let uncertain = false;
  const plannedShips = new Set<string>();
  for (const step of steps) {
    const command = step.command;
    const queuedBuild = command.type === 'build' ? command
      : command.type === 'trade-and-act' && command.action.type === 'build' ? command.action : null;
    let reason: string | undefined;
    const wasUncertain = uncertain;
    if (command.type === 'research' || command.type === 'quantum-research') {
      if (!projected.technologyMarket.includes(command.tileId)) reason = 'Technology is not in the current market.';
      else if (researchedTechnologyIds(seat).includes(command.tileId as TechnologyId)) reason = 'Technology is already researched.';
      else if (command.type === 'research') {
        const cost = researchCostForSeat(command.tileId as TechnologyId, command.track, seat);
        if (!cost.ok || seat.resources.science < cost.scienceCost) reason = 'Insufficient science for this research.';
        else seat.resources.science -= cost.scienceCost;
      } else uncertain = true;
      if (!reason) {
        seat.technologies[command.track].push(command.tileId);
        projected.technologyMarket.splice(projected.technologyMarket.indexOf(command.tileId), 1);
      }
    } else if (command.type === 'upgrade') {
      const researched = researchedTechnologyIds(seat);
      for (const blueprint of command.blueprints) {
        const previous = seat.blueprints.find(value => value.shipType === blueprint.shipType);
        if (!previous) { reason = 'The planned blueprint is unavailable.'; break; }
        const issues = validateBlueprint(seat.faction, publicBlueprint(blueprint), researched, [], publicBlueprint(previous));
        const definiteIssue = issues.find(issue => issue.code !== 'ANCIENT_PART_UNAVAILABLE');
        if (definiteIssue) { reason = definiteIssue.message; break; }
        if (issues.length) uncertain = true;
      }
      if (!reason) for (const blueprint of command.blueprints) {
        const index = seat.blueprints.findIndex(value => value.shipType === blueprint.shipType);
        seat.blueprints[index] = structuredClone(blueprint);
      }
    } else if (queuedBuild) {
      if (command.type === 'trade-and-act') uncertain = true;
      for (const build of queuedBuild.builds) {
        const cost = constructionCostForSeat(seat, build.component);
        if (seat.resources.materials < cost) { reason = 'Insufficient materials for this build.'; break; }
        seat.resources.materials -= cost;
        if (typeof build.sectorId !== 'string') uncertain = true;
      }
      if (!reason || command.type === 'trade-and-act') queuedBuild.builds.forEach((build, index) => {
        if (build.component !== 'orbital' && build.component !== 'monolith') plannedShips.add(builtShipBindingKey(step.id, index));
      });
    } else if (command.type === 'move') {
      for (const move of command.moves) {
        if (typeof move.shipId !== 'string' && !plannedShips.has(builtShipBindingKey(move.shipId.stepId, move.shipId.buildIndex))) {
          reason = 'The referenced ship is not produced by an earlier queued build.';
          break;
        }
      }
      uncertain = true;
    } else if (command.type === 'explore') {
      uncertain = true;
    } else if (command.type === 'trade' || command.type === 'convert-colony-ship' || command.type === 'buy-activation') {
      const preview = previewCommand(projected, command);
      seat.resources = preview.resourcesAfter;
    } else {
      uncertain = true;
    }
    result.push({
      stepId: step.id,
      status: reason && !wasUncertain && command.type !== 'trade-and-act' ? 'blocked' : uncertain ? 'uncertain' : 'known',
      ...(reason ? { reason } : {}),
      resourcesAfter: { ...seat.resources },
    });
    if (reason) uncertain = true;
  }
  return result;
}
