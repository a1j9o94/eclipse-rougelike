import { minorSpeciesPoints, type MinorSpeciesTile } from "./minorSpecies";
import { getFaction, type CatalogResources, type FactionId } from './catalog';
export interface ScoringSector {
  readonly id: string;
  readonly printedVp: number;
  readonly monoliths: number;
  /** Bonus of an installed optional portal tile, not the sector's printed VP. */
  readonly portalVp: 0 | 1 | 2 | 3;
  readonly orbitalPopulated?: boolean;
}
export interface ScoringInput {
  readonly minorSpecies?: readonly MinorSpeciesTile[];
  /** Public tile count for estimates that intentionally omit private reputation values. */
  readonly reputationTileCount?: number;
  readonly playerId: string;
  readonly faction: FactionId;
  readonly reputation: readonly number[];
  /** Ambassador tiles actually retained on the reputation track. */
  readonly ambassadors: number;
  /** Only sectors controlled by this player. */
  readonly sectors: readonly ScoringSector[];
  readonly discoveriesKeptForVp: number;
  readonly traitor: boolean;
  /** Include printed starting technologies and rare technologies. */
  readonly researchTracks: readonly [number, number, number];
  readonly ancientsOnBoard: number;
  readonly ancientPartsUsed?: number;
  /** Less Random end-game awards: unused Exploration Joker and public discoveries. */
  readonly variantVp?: number;
  readonly resources: CatalogResources;
}
export interface ScoreBreakdown {
  readonly minorSpecies?: number;
  readonly playerId: string;
  readonly reputation: number;
  readonly ambassadors: number;
  readonly sectors: number;
  readonly monoliths: number;
  readonly portals: number;
  readonly discoveries: number;
  readonly traitor: number;
  readonly research: number;
  readonly species: number;
  readonly variant?: number;
  readonly total: number;
  readonly resourceTotal: number;
}
/** Publisher rulebook p.25: four/five/six/seven technologies score 1/2/3/5. */
export function researchTrackVp(technologyCount: number): number {
  if (
    !Number.isInteger(technologyCount) ||
    technologyCount < 0 ||
    technologyCount > 7
  )
    throw new RangeError(
      'A technology track contains zero to seven technologies.',
    );
  return [0, 0, 0, 0, 1, 2, 3, 5][technologyCount];
}
export function calculateScore(input: ScoringInput): ScoreBreakdown {
  const minorSpecies = minorSpeciesPoints(input.minorSpecies ?? [], input.ambassadors, input.reputationTileCount ?? input.reputation.length);
  const reputation = input.reputation.reduce((sum, vp) => sum + vp, 0);
  const ambassadors = input.ambassadors;
  const sectors = input.sectors.reduce((sum, s) => sum + s.printedVp, 0);
  const monoliths = input.sectors.reduce((sum, s) => sum + 3 * s.monoliths, 0);
  const portals = input.sectors.reduce((sum, s) => sum + s.portalVp, 0);
  const discoveries = 2 * input.discoveriesKeptForVp;
  const faction = getFaction(input.faction);
  const traitor = input.traitor && !faction.special?.ignoresTraitorPenalty ? -2 : 0;
  const research = input.researchTracks.reduce(
    (sum, n) => sum + researchTrackVp(n),
    0,
  );
  const scoring = faction.capabilities.endGameVp;
  const speciesBase = scoring === 'controlled-sector'
    ? input.sectors.length
    : scoring === 'surviving-ancient'
      ? input.ancientsOnBoard
      : 0;
  const species = speciesBase + (input.ancientPartsUsed ?? 0) * (faction.special?.ancientPartVp ?? 0)
    + input.sectors.filter(sector => sector.orbitalPopulated).length * (faction.special?.populatedOrbitalVp ?? 0);
  const variant = input.variantVp ?? 0;
  return {
    ...(input.minorSpecies?.length ? {minorSpecies} : {}),
    playerId: input.playerId,
    reputation,
    ambassadors,
    sectors,
    monoliths,
    portals,
    discoveries,
    traitor,
    research,
    species,
    ...(variant ? { variant } : {}),
    total:
      reputation +
      ambassadors +
      sectors +
      monoliths +
      portals +
      discoveries +
      traitor +
      research +
      species + variant + minorSpecies,
    resourceTotal:
      input.resources.materials +
      input.resources.science +
      input.resources.money,
  };
}
export interface ScoreRank {
  readonly place: number;
  readonly players: readonly string[];
  readonly score: number;
  readonly resources: number;
}
/** Exact VP/resource ties are left tied; the published rule supplies no further tie-break. */
export function rankScores(
  scores: readonly ScoreBreakdown[],
): readonly ScoreRank[] {
  const sorted = [...scores].sort(
    (a, b) => b.total - a.total || b.resourceTotal - a.resourceTotal,
  );
  const groups: {
    place: number;
    players: string[];
    score: number;
    resources: number;
  }[] = [];
  sorted.forEach((score, index) => {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.score === score.total &&
      last.resources === score.resourceTotal
    )
      last.players.push(score.playerId);
    else
      groups.push({
        place: index + 1,
        players: [score.playerId],
        score: score.total,
        resources: score.resourceTotal,
      });
  });
  return groups;
}
