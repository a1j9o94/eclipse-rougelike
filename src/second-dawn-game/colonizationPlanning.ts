import { sectorDefinition } from "../../shared/eclipse/sectors";
import type { PendingDecision, PlayerView, Resource } from "../../shared/eclipse/types";
import { incomeForPopulationAway } from '../../shared/eclipse/tracks';
import type { PlanetResource } from "./SectorPlanets";
import type { CommandCandidate } from "./SecondDawnBoard";

export interface PlanetOption {
  sectorId: string;
  squareId: string;
  resource: PlanetResource;
  advanced: boolean;
  resources: Resource[];
  candidates: CommandCandidate[];
}

export interface ColonizationResourcePreview {
  resource: Resource;
  placements: number;
  cubesBefore: number;
  cubesAfter: number;
  incomeBefore: number;
  incomeAfter: number;
  incomeDelta: number;
}
export interface ColonizationDraftPreview {
  colonyShipsBefore: number;
  colonyShipsAfter: number;
  resources: readonly ColonizationResourcePreview[];
  legal: boolean;
}

/** Player-facing cube and income consequences for a complete colonization draft. */
export function previewColonizationDraft(view: PlayerView, placements: readonly { resource: Resource }[]): ColonizationDraftPreview {
  const own = view.seats.find(seat => seat.id === view.viewerSeatId);
  const colonyShipsBefore = own?.colonyShipsAvailable ?? 0;
  const resources = (['money','science','materials'] as const).map(resource => {
    const count = placements.filter(placement => placement.resource === resource).length;
    const before = own?.populationTracks[resource] ?? 11;
    const after = before + count;
    const incomeBefore = incomeForPopulationAway(Math.max(-1, Math.min(11, before)));
    const incomeAfter = incomeForPopulationAway(Math.max(-1, Math.min(11, after)));
    return { resource, placements: count, cubesBefore: Math.max(0, 11 - before), cubesAfter: Math.max(0, 11 - after), incomeBefore, incomeAfter, incomeDelta: incomeAfter - incomeBefore };
  });
  return { colonyShipsBefore, colonyShipsAfter: colonyShipsBefore - placements.length, resources, legal: placements.length <= colonyShipsBefore && resources.every(resource => resource.cubesAfter >= 0 && resource.cubesBefore >= resource.placements) };
}

/** Groups legal colonize commands by the physical population square they affect. */
export function colonizationOptions(
  view: PlayerView,
  candidates: readonly CommandCandidate[],
): PlanetOption[] {
  const grouped = new Map<string, CommandCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.command.type !== "colonize" || candidate.command.placements.length !== 1) continue;
    const placement = candidate.command.placements[0];
    const key = `${placement.sectorId}:${placement.squareId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), candidate]);
  }
  return [...grouped.entries()].flatMap(([key, squareCandidates]) => {
    const [sectorId, squareId] = key.split(":");
    const sector = view.sectors.find((candidate) => candidate.id === sectorId);
    const definition = sector && sectorDefinition(Number(sector.tileId));
    if (!sector || !definition) return [];
    const printed = squareId === "orbital"
      ? sector.orbital ? { resource: "orbital" as const, advanced: false } : null
      : definition.population[Number(squareId.slice(1))];
    const resources = [...new Set(squareCandidates.flatMap((candidate) => candidate.command.type === "colonize" ? candidate.command.placements.map((placement) => placement.resource) : []))];
    return printed ? [{ sectorId, squareId, ...printed, resources, candidates: squareCandidates }] : [];
  });
}

/** Turns the persisted offered squares into the same visual model as a free colonize action. */
export function decisionColonizationOptions(
  view: PlayerView,
  decision: Extract<PendingDecision, { kind: "colonization" }>,
): PlanetOption[] {
  return decision.squares.flatMap((offered) => {
    const sector = view.sectors.find((candidate) => candidate.id === offered.sectorId);
    const definition = sector && sectorDefinition(Number(sector.tileId));
    if (!sector || !definition) return [];
    const printed = offered.squareId === "orbital"
      ? sector.orbital ? { resource: "orbital" as const, advanced: false } : null
      : definition.population[Number(offered.squareId.slice(1))];
    return printed ? [{
      sectorId: offered.sectorId,
      squareId: offered.squareId,
      ...printed,
      resources: offered.resources,
      candidates: [],
    }] : [];
  });
}
