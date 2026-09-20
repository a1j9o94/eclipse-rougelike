import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import { sectorDefinition } from '../../shared/eclipse/sectors';
import type { Technology } from '../../shared/eclipse/technologies';
import type { PlayerView, Resource } from '../../shared/eclipse/types';
import { previewColonizationDraft } from './colonizationPlanning';

export interface AdvancedPopulationOpportunity {
  resource: Resource | 'all';
  eligible: number;
  newOptions: number;
  populationCapacity: number;
  colonyShips: number;
  cubes: { resource: Resource; available: number }[];
}
const resources: Resource[] = ['money', 'science', 'materials'];
const technologyFor = { money: 'advanced-economy', science: 'advanced-labs', materials: 'advanced-mining' };

/** Geographic opportunity after acquisition, independent of turn/command legality.
 * A gray square has one population space, even when several resources are eligible.
 */
export function advancedPopulationOpportunity(view: PlayerView, technology: Technology): AdvancedPopulationOpportunity | null {
  const effect = technology.effect;
  const seat = view.seats.find(candidate => candidate.id === view.viewerSeatId);
  if (effect.kind !== 'colonize-advanced' || !seat) return null;
  const targetResources = effect.resource === 'all' ? resources : [effect.resource];
  const owned: readonly string[] = researchedTechnologyIds(seat);
  const unlocked = (resource: Resource) => owned.includes('metasynthesis') || owned.includes(technologyFor[resource]);
  const squares = view.sectors.filter(sector => sector.owner === seat.id).flatMap(sector =>
    (sectorDefinition(Number(sector.tileId))?.population ?? []).flatMap((square, index) => {
      if (!square.advanced || sector.population.some(population => population.squareId === `p${index}`)) return [];
      const options = targetResources.filter(resource => square.resource === 'gray' || square.resource === resource);
      return options.length ? [options] : [];
    }));
  const supplies = previewColonizationDraft(view, []);
  const cubes = supplies.resources.filter(item => targetResources.includes(item.resource)).map(item => ({ resource: item.resource, available: item.cubesBefore }));
  // Fill resource-specific planets first, then use leftover cubes for flexible gray planets.
  const fixed = cubes.reduce((total, cube) => total + Math.min(cube.available, squares.filter(options => options.length === 1 && options[0] === cube.resource).length), 0);
  const flexible = squares.filter(options => options.length > 1).length;
  const cubeCapacity = fixed + Math.min(flexible, cubes.reduce((total, cube) => total + cube.available, 0) - fixed);
  return { resource: effect.resource, eligible: squares.length, newOptions: squares.filter(options => options.some(resource => !unlocked(resource))).length,
    populationCapacity: Math.min(supplies.colonyShipsBefore, cubeCapacity), colonyShips: supplies.colonyShipsBefore, cubes };
}
