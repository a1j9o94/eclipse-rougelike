import {minorSpeciesFutureValue} from './aiMinorSpecies';
import { aiWeaponValue } from "./aiWeaponValue";
import {factionHasCapability,getFaction} from './catalog';
import {deriveBlueprintStats} from './blueprints';
import {publicBlueprint} from './legal';
import {sectorDefinition} from './sectors';
import {calculateScore} from './scoring';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from './tracks';
import {adjacentPosition} from './geometry';
import {estimatePublicBattle} from './aiSimulation';
import type {PlayerView,Seat} from './types';

function empireValue(view:PlayerView,seat:Seat):number {
 if(seat.eliminated)return -30;
 const sectors=view.sectors.filter(s=>s.owner===seat.id);
 const own=seat.id===view.viewerSeatId;
 const hidden=view.hiddenTileCounts.find(s=>s.seatId===seat.id);
const score=calculateScore({playerId:seat.id,faction:seat.faction,reputation:own?view.private.reputation:[],ambassadors:seat.ambassadors.length,minorSpecies:seat.minorSpecies,reputationTileCount:own?view.private.reputation.length:hidden?.reputation??0,sectors:sectors.map(s=>({id:s.id,printedVp:sectorDefinition(Number(s.tileId))?.victoryPoints??0,monoliths:Number(s.monolith),portalVp:s.portalVp??0})),discoveriesKeptForVp:own?view.private.discoveriesKept.length:hidden?.discoveriesKept??0,traitor:seat.traitor,researchTracks:[seat.technologies.military.length,seat.technologies.grid.length,seat.technologies.nano.length],ancientsOnBoard:view.ships.filter(s=>s.type==='ancient').length,ancientPartsUsed:seat.ancientPartsUsed,resources:seat.resources});
 // Hidden reputation is an expectation based on count, never sampled opponent values.
 let value=score.total+(own?0:(hidden?.reputation??0)*2.5)+minorSpeciesFutureValue(view,seat);
 const remaining=Math.max(0,8-view.round),income={money:incomeForPopulationAway(seat.populationTracks.money),science:incomeForPopulationAway(seat.populationTracks.science),materials:incomeForPopulationAway(seat.populationTracks.materials)};
 const upkeep=upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack));
 const balance=seat.resources.money+income.money-upkeep;
 value-=Math.max(0,-balance)*1.3;
 // Discount long-range production; finite useful spending stops resource hoarding dominating VP.
 const horizon=Math.min(3,remaining);
 const technologies=Object.values(seat.technologies).flat();
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
 return value;
}

/** Comparable estimated final points, with leader pressure and actual terminal outcomes. */
export function evaluateStrategicPosition(view:PlayerView,seatId:string):number {
 if(view.phase==='finished'&&view.scores?.length){
  const own=view.scores.find(s=>s.playerId===seatId)!;
  const opponents=view.scores.filter(s=>s.playerId!==seatId);
  const leader=Math.max(...opponents.map(s=>s.total));
  const resourceLeader=Math.max(...opponents.filter(s=>s.total===leader).map(s=>s.resourceTotal));
  const win=own.total>leader||own.total===leader&&own.resourceTotal>resourceLeader;
  const loss=own.total<leader||own.total===leader&&own.resourceTotal<resourceLeader;
  return (win?100:loss?-100:0)+own.total-leader;
 }
 const seat=view.seats.find(s=>s.id===seatId);if(!seat)return -1000;
 const own=empireValue(view,seat),others=view.seats.filter(s=>s.id!==seatId).map(s=>empireValue(view,s));
 return own-Math.max(...others)*.6;
}
