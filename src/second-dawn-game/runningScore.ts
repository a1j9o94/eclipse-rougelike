import { calculateScore, type ScoreBreakdown } from '../../shared/eclipse/scoring';
import { sectorDefinition } from '../../shared/eclipse/sectors';
import type { PlayerView } from '../../shared/eclipse/types';

export interface RunningScore {
  breakdown: ScoreBreakdown;
  hiddenReputation: boolean;
  final: boolean;
}
/** Live board score, never a prediction of unearned VP. Standard reputation stays private; Less Random reputation and bonuses are public. */
export function runningScore(view: PlayerView, seatId: string): RunningScore {
  const seat = view.seats.find(candidate => candidate.id === seatId);
  if (!seat) throw new RangeError(`Seat is absent from this view: ${seatId}`);
  const final = view.phase === 'finished';
  const own = seatId === view.viewerSeatId;
  const counts = view.hiddenTileCounts.find(candidate => candidate.seatId === seatId);
  const publicReputation = view.rulesMode === 'less-random-v1';
  const hiddenReputation = !final && !publicReputation && (own ? (counts?.reputation ?? 0) > 0 : true);
  const frozen = view.scores?.find(score => score.playerId === seatId);
  if (frozen && (final || seat.eliminated)) {
    return {
      breakdown: final || publicReputation
        ? { ...frozen }
        : { ...frozen, reputation: 0, total: frozen.total - frozen.reputation },
      hiddenReputation,
      final,
    };
  }
  const breakdown = calculateScore({
    playerId: seatId,
    faction: seat.faction,
    reputation: publicReputation ? view.lessRandom?.reputationBySeat[seatId] ?? [] : final && own ? view.private.reputation : [],
    ambassadors: seat.ambassadors.length,
    minorSpecies: seat.minorSpecies,
    reputationTileCount: own?view.private.reputation.length:counts?.reputation??0,
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
    discoveriesKeptForVp: own ? view.private.discoveriesKept.length : counts?.discoveriesKept ?? 0,
    traitor: seat.traitor,
    ancientPartsUsed:seat.ancientPartsUsed??0,
    researchTracks: [seat.technologies.military.length, seat.technologies.grid.length, seat.technologies.nano.length],
    ancientsOnBoard: view.ships.filter(ship => ship.type === 'ancient').length,
    variantVp: publicReputation ? (view.lessRandom?.explorationJokers[seatId] ? 2 : 0) + (seat.developments?.some(d=>d.id==='quantum-labs'&&d.technologyId) ? 1 : 0) + (seat.discoveryBonuses??[]).reduce((sum,bonus)=>sum+(bonus==='artifacts'?view.sectors.filter(s=>s.owner===seatId).reduce((n,s)=>n+(sectorDefinition(Number(s.tileId))?.artifacts??0),0):Math.floor((view.lessRandom?.reputationBySeat[seatId]??[]).reduce((a,b)=>a+b,0)/3)),0) : 0,
    resources: seat.resources,
  });
  return { breakdown, hiddenReputation, final };
}
