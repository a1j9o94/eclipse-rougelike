import { researchedTechnologyIds } from './technologies';
import {gameRules,gameRoundLimit} from './gameRules';
import {minorSpeciesFutureValue} from './aiMinorSpecies';
import { aiWeaponValue } from "./aiWeaponValue";
import {factionHasCapability,getFaction} from './catalog';
import {deriveBlueprintStats} from './blueprints';
import {publicBlueprint} from './legal';
import {sectorDefinition} from './sectors';
import {calculateScore, type ScoreBreakdown} from './scoring';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from './tracks';
import {adjacentPosition} from './geometry';
import {estimatePublicBattle} from './aiSimulation';
import {remainingUpkeepShortfall} from './aiEndgame';
import type {PlayerView,Seat} from './types';

/** Each estimate is in final victory points, from the requesting player's information. */
export interface AiScoreForecast {
 seatId: string;
 expectedVp: number;
}

function expectedSeatVp(view: PlayerView, seat: Seat): number {
 const sectors = view.sectors.filter(sector => sector.owner === seat.id);
 const own = seat.id === view.viewerSeatId;
 const rules = gameRules(view);
 const counts = view.hiddenTileCounts.find(s => s.seatId === seat.id);
 const reputation = own ? view.private.reputation : view.lessRandom?.reputationBySeat[seat.id] ?? [];
 const knownReputation = own || rules.publicReputation;
 const hiddenReputation = knownReputation ? 0 : (counts?.reputation ?? 0) * 2.5;
 const reputationBonuses = seat.discoveryBonuses?.filter(bonus => bonus === 'reputation').length ?? 0;
 const hiddenBonus = reputationBonuses * Math.floor(hiddenReputation / 3);
 const sheet = view.scores?.find(score => score.playerId === seat.id);
 if (sheet && (seat.eliminated || view.phase === 'finished')) {
  return view.phase === 'finished' ? sheet.total : sheet.total + hiddenReputation + hiddenBonus;
 }
 const scoringReputation = knownReputation ? reputation : [];
 const researchTracks: [number, number, number] = [
  seat.technologies.military.length, seat.technologies.grid.length, seat.technologies.nano.length,
 ];
 const artifacts = sectors.reduce((total, sector) => total + (sectorDefinition(Number(sector.tileId))?.artifacts ?? 0), 0);
 const score = calculateScore({
  playerId: seat.id, faction: seat.faction, reputation: scoringReputation,
  ambassadors: seat.ambassadors.length, minorSpecies: seat.minorSpecies,
  reputationTileCount: own ? view.private.reputation.length : counts?.reputation ?? 0,
  sectors: sectors.map(sector => ({
   id: sector.id, printedVp: sectorDefinition(Number(sector.tileId))?.victoryPoints ?? 0,
   monoliths: Number(sector.monolith), portalVp: sector.portalVp ?? 0,
   orbitalPopulated: sector.orbital && sector.population.some(cube => cube.squareId === 'orbital'),
   shrines: (seat.shrines ?? []).filter(shrine => shrine.sectorId === sector.id).length,
  })),
  discoveriesKeptForVp: own ? view.private.discoveriesKept.length : counts?.discoveriesKept ?? 0,
  traitor: seat.traitor, researchTracks, ancientsOnBoard: view.ships.filter(s => s.type === 'ancient').length,
  ancientPartsUsed: seat.ancientPartsUsed, resources: seat.resources,
  variantVp: (rules.explorationRules && view.lessRandom?.explorationJokers[seat.id] ? 2 : 0)
   + Number(seat.developments?.some(d => d.id === 'quantum-labs' && d.technologyId) ?? false)
   + (seat.discoveryBonuses ?? []).filter(bonus => bonus === 'artifacts').length * artifacts
   + reputationBonuses * Math.floor(scoringReputation.reduce((total, vp) => total + vp, 0) / 3),
 });
 const currentVp = score.total + hiddenReputation + hiddenBonus;
 if (seat.eliminated) return currentVp;
 let value = minorSpeciesFutureValue(view, seat);
 const remaining=Math.max(0,gameRoundLimit(view)-view.round),income={money:incomeForPopulationAway(seat.populationTracks.money),science:incomeForPopulationAway(seat.populationTracks.science),materials:incomeForPopulationAway(seat.populationTracks.materials)};
 const upkeep=upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack));
 const balance=seat.resources.money+income.money-upkeep;
  value-=remaining ? Math.max(0,-balance)*1.3 : remainingUpkeepShortfall(view,seat)*4;
 // Discount long-range production; finite useful spending stops resource hoarding dominating VP.
 const horizon=Math.min(3,remaining);
 const technologies=researchedTechnologyIds(seat);
 // Technology access and discounts retain value before the next blueprint refit;
 // actual track VP is already included above and is not counted twice.
 value+=technologies.length*.15*horizon;
 // Compare on the same final-round horizon. A pass that advances the calendar
 // converts future income to storage; it must not create extra economic value.
 value+=Math.min(30,seat.resources.science+income.science*remaining)*0.16;
 value+=Math.min(35,seat.resources.materials+income.materials*remaining)*0.13;
 const returnedActions=Object.values(seat.actionDiscs).reduce((a,b)=>a+b,0);
 const controlUpkeep=upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack-returnedActions));
 value+=Math.max(-15,Math.min(25,balance+(income.money-controlUpkeep-3)*remaining))*.10;
 const populationPotential:number[]=[];
 for(const sector of sectors){
  const definition=sectorDefinition(Number(sector.tileId));
  for(const [i,square] of (definition?.population??[]).entries()){
   if(sector.population.some(p=>p.squareId===`p${i}`))continue;
   const resources=square.resource==='gray'?(['science','materials','money']as const):[square.resource];
   const gains=resources.filter(resource=>seat.populationTracks[resource]<11&&(!square.advanced||technologies.includes('metasynthesis')||technologies.includes(resource==='science'?'advanced-labs':resource==='materials'?'advanced-mining':'advanced-economy'))).map(resource=>{
    const gain=incomeForPopulationAway(seat.populationTracks[resource]+1)-income[resource];
    return gain*(resource==='money'?(balance<4?.3:.1):resource==='science'?.16:.13)*horizon;
   });
   if(gains.length)populationPotential.push(Math.max(...gains));
  }
 }
 value+=populationPotential.sort((a,b)=>b-a).slice(0,seat.colonyShipsAvailable).reduce((a,b)=>a+b,0);
 const faction=getFaction(seat.faction);
 const fleets=new Map<string,number>();
 for(const ship of view.ships.filter(s=>s.owner===seat.id)){
  const blueprint=seat.blueprints.find(b=>b.shipType===ship.type);if(!blueprint)continue;
  const stats=deriveBlueprintStats(seat.faction,publicBlueprint(blueprint));
  const force=Math.max(0.2,stats.hull+1-ship.damage)*(1+stats.shield*.15)+stats.weapons.reduce((sum,w)=>sum+aiWeaponValue(w,1+stats.computer*.16)*(w.kind==='missile'?.6:1),0);
  fleets.set(ship.sectorId,(fleets.get(ship.sectorId)??0)+force);
  const cost=faction.constructionCosts[blueprint.shipType];
  value+=Math.min(force*.23,cost*.45)*(0.5+remaining*.08);
 }
 // Occupying valuable foreign sectors is progress toward control; leaving border sectors
 // exposed to a nearby hostile fleet is a liability. Diplomacy is considered by the action policy.
 for(const sector of view.sectors){
  const force=fleets.get(sector.id)??0;
  const hostile=view.ships.some(s=>s.sectorId===sector.id&&s.owner!==seat.id&&!(factionHasCapability(seat.faction,'ancient-coexistence')&&s.type==='ancient'));
  if(force&&!hostile&&sector.owner!==seat.id)value+=(sectorDefinition(Number(sector.tileId))?.victoryPoints??0)*.65;
  if(force&&hostile&&sector.owner!==seat.id){
   const attackers=view.ships.filter(s=>s.sectorId===sector.id&&s.owner===seat.id).map(s=>s.id);
   const defenders=view.ships.filter(s=>s.sectorId===sector.id&&s.owner!==seat.id&&!(factionHasCapability(seat.faction,'ancient-coexistence')&&s.type==='ancient')).map(s=>s.id);
   const battle=estimatePublicBattle(view,attackers,defenders,113,8);
   const conquest=sector.population.length&&!technologies.includes('neutron-bombs')?.5:.85;
   value+=battle.attackerWinProbability*(sectorDefinition(Number(sector.tileId))?.victoryPoints??0)*conquest;
   value-=Math.max(0,attackers.length-battle.expectedSurvivors)*.25;
  }
  if(sector.owner!==seat.id)continue;
  const neighbors=([0,1,2,3,4,5]as const).map(edge=>adjacentPosition(sector.position,edge));
  const enemyNear=view.sectors.filter(s=>neighbors.some(p=>p.q===s.position.q&&p.r===s.position.r)).some(s=>view.ships.some(ship=>ship.sectorId===s.id&&ship.owner!==seat.id&&view.seats.some(p=>p.id===ship.owner&&!seat.ambassadors.includes(p.id))));
  if(enemyNear&&force<2)value-=1.1;
 }
 // Least-squares fit to the VP still to be earned in 36 seeded complete games.
 // Separate accrued points from the future value of production, fleets and frontier sectors.
 const spent = Math.min(3, returnedActions);
 return currentVp + 0.66 + 1.43 * remaining + 0.17 * value - 0.31 * spent;
}

export function forecastFinalScores(view: PlayerView): AiScoreForecast[] {
 return view.seats.map(seat => ({ seatId: seat.id, expectedVp: expectedSeatVp(view, seat) }));
}

/** Both planners use the same opponent and resource tiebreak on a completed score sheet. */
export function finalScoreComparison(scores: readonly ScoreBreakdown[], seatId: string) {
 const own = scores.find(score => score.playerId === seatId);
 let leader: ScoreBreakdown | undefined;
 for (const score of scores) {
  if (score.playerId === seatId) continue;
  if (!leader || score.total > leader.total || (score.total === leader.total && score.resourceTotal > leader.resourceTotal))
   leader = score;
 }
 if (!own || !leader) return null;
 const margin = own.total - leader.total;
 const resources = own.resourceTotal - leader.resourceTotal;
 const tiebreak = resources / (1 + Math.abs(resources)) * .01;
 return { expectedVp: own.total, expectedLeaderVp: leader.total, margin: margin + tiebreak, outcome: Math.sign(margin || resources) };
}

/** Comparable estimated final points, with leader pressure and actual terminal outcomes. */
export function evaluateStrategicPosition(view:PlayerView,seatId:string):number {
 if(view.phase==='finished'&&view.scores?.length){
  const comparison = finalScoreComparison(view.scores, seatId);
  return comparison ? comparison.outcome * 100 + comparison.margin : -1000;
 }
 const forecasts = forecastFinalScores(view);
 const own = forecasts.find(s => s.seatId === seatId);
 if (!own) return -1000;
 // A command that advances the round changes both players' scoring horizons.
 // Compare margins so that the shared time left cannot favor delaying that command.
 const leader = Math.max(...forecasts.filter(s => s.seatId !== seatId).map(s => s.expectedVp));
 return own.expectedVp - leader;
}
