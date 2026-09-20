import { getFaction } from "./catalog";
import {
  getTechnology,
  researchCost,
  type ResearchCostResult,
  type TechnologyId,
} from "./technologies";
import type {
  GameCommand,
  PlayerView,
  Resource,
  Seat,
  ShipType,
  Track,
} from "./types";

export type MinorSpeciesId =
  | "reputation"
  | "ambassadors"
  | "prestige"
  | "population"
  | "cruisers"
  | "dreadnoughts"
  | "orbitals"
  | "monoliths"
  | "researchers";
export interface MinorSpeciesTile {
  id: MinorSpeciesId;
  resource?: Resource;
}
export interface MinorSpeciesState {
  market: MinorSpeciesId[];
}
export type MinorSpeciesEffect =
  | { kind: "reputation-vp" | "ambassador-vp" | "fixed-vp"; points: number }
  | { kind: "population" }
  | {
      kind: "construction-discount";
      component: "cruiser" | "dreadnought" | "orbital" | "monolith";
      amount: number;
    }
  | { kind: "research-discount"; amount: number };
export interface MinorSpeciesDefinition {
  id: MinorSpeciesId;
  name: string;
  cost: number;
  effect: MinorSpeciesEffect;
  source: string;
}
const source =
  "https://www.lautapelit.fi/files/Online%20rules/Eclipse2_MS_rules_web.pdf";
/** Official 2019 Second Dawn Minor Species rule sheet p1. Tiles are unnamed;
 * descriptive English labels identify their printed abilities. */
export const MINOR_SPECIES: readonly MinorSpeciesDefinition[] = [
  {
    id: "reputation",
    name: "Reputation patrons",
    cost: 8,
    effect: { kind: "reputation-vp", points: 1 },
    source,
  },
  {
    id: "ambassadors",
    name: "Diplomatic patrons",
    cost: 4,
    effect: { kind: "ambassador-vp", points: 1 },
    source,
  },
  {
    id: "prestige",
    name: "Esteemed allies",
    cost: 8,
    effect: { kind: "fixed-vp", points: 3 },
    source,
  },
  {
    id: "population",
    name: "Settler envoys",
    cost: 9,
    effect: { kind: "population" },
    source,
  },
  {
    id: "cruisers",
    name: "Cruiser engineers",
    cost: 4,
    effect: { kind: "construction-discount", component: "cruiser", amount: 1 },
    source,
  },
  {
    id: "dreadnoughts",
    name: "Dreadnought engineers",
    cost: 4,
    effect: {
      kind: "construction-discount",
      component: "dreadnought",
      amount: 2,
    },
    source,
  },
  {
    id: "orbitals",
    name: "Orbital engineers",
    cost: 4,
    effect: { kind: "construction-discount", component: "orbital", amount: 1 },
    source,
  },
  {
    id: "monoliths",
    name: "Monolith architects",
    cost: 6,
    effect: { kind: "construction-discount", component: "monolith", amount: 2 },
    source,
  },
  {
    id: "researchers",
    name: "Research partners",
    cost: 4,
    effect: { kind: "research-discount", amount: 1 },
    source,
  },
];
export function getMinorSpecies(id: MinorSpeciesId): MinorSpeciesDefinition {
  const tile = MINOR_SPECIES.find((t) => t.id === id);
  if (!tile) throw new RangeError("Unknown Minor Species.");
  return tile;
}
export function ambassadorCapacityForSeat(seat: Seat): number {
  const track = getFaction(seat.faction).capabilities;
  return (
    track.reputationSlots -
    (track.dedicatedReputationSlots ?? 0) +
    track.dedicatedAmbassadorSlots
  );
}
export function hasEmptyAmbassadorSpace(seat: Seat): boolean {
  return (
    seat.ambassadors.length + (seat.minorSpecies?.length ?? 0) <
    ambassadorCapacityForSeat(seat)
  );
}
export function reputationCapacityWithMinorSpecies(seat: Seat): number {
  const track = getFaction(seat.faction).capabilities;
  return Math.max(
    0,
    track.reputationSlots -
      Math.max(
        0,
        seat.ambassadors.length +
          (seat.minorSpecies?.length ?? 0) -
          track.dedicatedAmbassadorSlots,
      ),
  );
}
export function researchCostForSeat(
  id: TechnologyId,
  track: Track,
  seat: Seat,
): ResearchCostResult {
  if (seat.developments?.some(d => d.technologyId === id)) return {ok:false,code:'already-researched'};
  const result = researchCost(
    id,
    track,
    Object.entries(seat.technologies).flatMap(([t, ids]) =>
      ids.map((technology) => ({
        track: t as Track,
        technology: technology as TechnologyId,
      })),
    ),
  );
  if (!result.ok) return result;
  const extra = (seat.minorSpecies ?? []).reduce((sum, t) => {
    const effect = getMinorSpecies(t.id).effect;
    return sum + (effect.kind === "research-discount" ? effect.amount : 0);
  }, 0);
  return {
    ...result,
    scienceCost: Math.max(
      getTechnology(id).minimumCost,
      result.scienceCost - extra,
    ),
    discount: result.discount + extra,
  };
}
export function constructionCostForSeat(
  seat: Seat,
  component: ShipType | "orbital" | "monolith",
): number {
  const discount = (seat.minorSpecies ?? []).reduce((sum, t) => {
    const effect = getMinorSpecies(t.id).effect;
    return (
      sum +
      (effect.kind === "construction-discount" && effect.component === component
        ? effect.amount
        : 0)
    );
  }, 0);
  return Math.max(
    0,
    getFaction(seat.faction).constructionCosts[component] - discount,
  );
}
export function minorSpeciesPoints(
  tiles: readonly MinorSpeciesTile[],
  ambassadors: number,
  reputationCount: number,
): number {
  return tiles.reduce((sum, t) => {
    const e = getMinorSpecies(t.id).effect;
    return (
      sum +
      (e.kind === "reputation-vp"
        ? reputationCount * e.points
        : e.kind === "ambassador-vp"
          ? (ambassadors + tiles.length) * e.points
          : e.kind === "fixed-vp"
            ? e.points
            : 1)
    );
  }, 0);
}
export function minorSpeciesPurchaseIssue(
  view: PlayerView,
  id: MinorSpeciesId,
): string | null {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId);
  if (!seat || seat.eliminated)
    return "This civilization cannot form diplomatic relations.";
  if (seat.traitor) return "The traitor cannot form new diplomatic relations.";
  if (!view.minorSpecies?.market.includes(id))
    return "This Minor Species is no longer available.";
  if (view.phase !== "action" || view.activeSeatId !== seat.id)
    return "Wait for your action turn.";
  if (view.pendingDecision || view.waitingFor)
    return "Resolve your outstanding choice first.";
  const tile = getMinorSpecies(id);
  if (seat.resources.money < tile.cost) return `Requires ${tile.cost} money.`;
  if (
    seat.ambassadors.length + (seat.minorSpecies?.length ?? 0) >=
    ambassadorCapacityForSeat(seat)
  )
    return "All ambassador spaces are occupied.";
  if (
    tile.effect.kind === "population" &&
    !(["money", "science", "materials"] as const).some(
      (r) => seat.populationTracks[r] < 11,
    )
  )
    return "No population cube is available.";
  return null;
}
/** Only the viewer's private rack is used to propose the smallest required return.
 * Returned VP values belong solely in the authenticated command, never public history. */
export function minorSpeciesPurchaseOptions(
  view: PlayerView,
): Extract<GameCommand, { type: "buy-minor-species" }>[] {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId);
  if (!seat) return [];
  return (view.minorSpecies?.market ?? []).flatMap((id) => {
    if (minorSpeciesPurchaseIssue(view, id)) return [];
    const after = {
      ...seat,
      minorSpecies: [...(seat.minorSpecies ?? []), { id }],
    };
    const needed = Math.max(
      0,
      view.private.reputation.length -
        reputationCapacityWithMinorSpecies(after),
    );
    const returnReputation = [...view.private.reputation]
      .sort((a, b) => a - b)
      .slice(0, needed);
    const base = {
      type: "buy-minor-species" as const,
      minorSpeciesId: id,
      ...(needed ? { returnReputation } : {}),
    };
    return getMinorSpecies(id).effect.kind === "population"
      ? (["money", "science", "materials"] as const)
          .filter((r) => seat.populationTracks[r] < 11)
          .map((resource) => ({ ...base, resource }))
      : [base];
  });
}
