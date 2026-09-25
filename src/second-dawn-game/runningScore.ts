import {gameRules} from '../../shared/eclipse/gameRules';
import { calculateScore, type ScoreBreakdown } from '../../shared/eclipse/scoring';
import { sectorDefinition } from '../../shared/eclipse/sectors';
import type { SpectatorView, PlayerView } from '../../shared/eclipse/types';

export interface RunningScore {
  breakdown: ScoreBreakdown;
  hiddenReputation: boolean;
  final: boolean;
}
/** Live public board score. Reputation and its dependent bonuses stay hidden until enabled or final. */
export function runningScore(view: PlayerView|SpectatorView, seatId: string): RunningScore {
  const seat = view.seats.find(candidate => candidate.id === seatId);
  if (!seat) throw new RangeError(`Seat is absent from this view: ${seatId}`);
  const final = view.phase === 'finished';
  const own = seatId === ('viewerSeatId' in view?view.viewerSeatId:undefined);
  const counts = view.hiddenTileCounts.find(candidate => candidate.seatId === seatId);
  const rules = gameRules(view);
  const publicReputation = rules.publicReputation;
  const hiddenReputation = !final && !publicReputation && (own ? (counts?.reputation ?? 0) > 0 : true);
  const frozen = view.scores?.find(score => score.playerId === seatId);
  if (frozen && (final || seat.eliminated)) {
    // Opponent snapshots already have reputation removed by the protocol; their
    // zero reputation makes this redaction idempotent for either viewer.
    const hiddenBonus = (seat.discoveryBonuses ?? []).filter(bonus => bonus === 'reputation').length * Math.floor(frozen.reputation / 3);
    return {
      breakdown: final || publicReputation
        ? { ...frozen }
        : { ...frozen, reputation: 0, ...(hiddenBonus ? {variant: Math.max(0, (frozen.variant ?? 0) - hiddenBonus)} : {}), total: frozen.total - frozen.reputation - hiddenBonus },
      hiddenReputation,
      final,
    };
  }
  const visibleReputation = publicReputation ? view.lessRandom?.reputationBySeat[seatId] ?? [] : final && own && 'private' in view ? view.private.reputation : [];
  const reputationBonus = Math.floor(visibleReputation.reduce((total, points) => total + points, 0) / 3);
  const artifactBonus = view.sectors.filter(sector => sector.owner === seatId).reduce((total, sector) => total + (sectorDefinition(Number(sector.tileId))?.artifacts ?? 0), 0);
  const variantVp = (rules.explorationRules && view.lessRandom?.explorationJokers[seatId] ? 2 : 0)
    + (seat.developments?.some(development => development.id === 'quantum-labs' && development.technologyId) ? 1 : 0)
    + (seat.discoveryBonuses ?? []).reduce((total, bonus) => total + (bonus === 'artifacts' ? artifactBonus : reputationBonus), 0);
  const breakdown = calculateScore({
    playerId: seatId,
    faction: seat.faction,
    reputation: visibleReputation,
    ambassadors: seat.ambassadors.length,
    minorSpecies: seat.minorSpecies,
    reputationTileCount: own&&'private' in view?view.private.reputation.length:counts?.reputation??0,
    sectors: view.sectors.filter(sector => sector.owner === seatId).map(sector => {
      const definition = sectorDefinition(Number(sector.tileId));
      if (!definition) throw new RangeError(`Sector is absent from base catalog: ${sector.tileId}`);
      return {
        id: sector.id,
        printedVp: definition.victoryPoints,
        monoliths: Number(sector.monolith),
        portalVp: sector.portalVp ?? 0,
      };
    }),
    discoveriesKeptForVp: own && 'private' in view ? view.private.discoveriesKept.length : counts?.discoveriesKept ?? 0,
    traitor: seat.traitor,
    ancientPartsUsed:seat.ancientPartsUsed??0,
    researchTracks: [seat.technologies.military.length, seat.technologies.grid.length, seat.technologies.nano.length],
    ancientsOnBoard: view.ships.filter(ship => ship.type === 'ancient').length,
    variantVp,
    resources: seat.resources,
  });
  return { breakdown, hiddenReputation, final };
}
