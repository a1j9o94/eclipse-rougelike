import { sectorDefinition } from "../../shared/eclipse/sectors";
import type { PendingDecision, PlayerView, Resource } from "../../shared/eclipse/types";
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
