import { researchedTechnologyIds } from './technologies';
import {getFaction} from './catalog';
import {getMinorSpecies,minorSpeciesPoints} from './minorSpecies';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from './tracks';
import type {GameCommand,PlayerView,Seat} from './types';

/** Conservative future savings in estimated VP units, using public plans and income only. */
export function minorSpeciesFutureValue(view:PlayerView,seat:Seat):number {
 const rounds=Math.max(0,(view.rulesMode==='less-random-v1'?10:8)-view.round),horizon=Math.min(3,rounds);
 const techs=researchedTechnologyIds(seat);
 return (seat.minorSpecies??[]).reduce((value,tile)=>{
  if(tile.id==='researchers'){
   const openSlots=21-techs.length;
   return value+Math.min(openSlots,horizon*1.5)*.18;
  }
  const ships=view.ships.filter(ship=>ship.owner===seat.id);
  const income=incomeForPopulationAway(seat.populationTracks.materials);
  if(tile.id==='cruisers')return value+Math.min(4-ships.filter(ship=>ship.type==='cruiser').length,horizon*income/8)*.16;
  if(tile.id==='dreadnoughts')return value+Math.min(2-ships.filter(ship=>ship.type==='dreadnought').length,horizon*income/12)*.32;
  if(tile.id==='orbitals'&&techs.includes('orbital'))return value+horizon*.18;
  if(tile.id==='monoliths'&&techs.includes('monolith'))return value+Math.min(2,rounds)*.32;
  return value;
 },0);
}

/** Price, forgone reputation and upkeep reserves matter more than buying every available tile. */
export function evaluateMinorSpeciesPurchase(view:PlayerView,command:Extract<GameCommand,{type:'buy-minor-species'}>):number {
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const tile=getMinorSpecies(command.minorSpeciesId);
 const owned=seat.minorSpecies??[],returned=command.returnReputation??[];
 const remainingReputation=view.private.reputation.length-returned.length;
 const next:Seat={...seat,minorSpecies:[...owned,{id:tile.id,...(command.resource?{resource:command.resource}:{})}]};
 const gainedVp=minorSpeciesPoints(next.minorSpecies!,seat.ambassadors.length,remainingReputation)-minorSpeciesPoints(owned,seat.ambassadors.length,view.private.reputation.length);
 const forfeited=returned.reduce((a,b)=>a+b,0);
 let future=(minorSpeciesFutureValue(view,next)-minorSpeciesFutureValue(view,seat))*5;
 let moneyIncome=incomeForPopulationAway(seat.populationTracks.money);
 if(tile.id==='population'&&command.resource){
  const resource=command.resource;
  const gain=incomeForPopulationAway(Math.min(11,seat.populationTracks[resource]+1))-incomeForPopulationAway(seat.populationTracks[resource]);
  const policy=getFaction(seat.faction).capabilities.ai;
  future+=gain*Math.max(0,9-view.round)*(resource==='science'?policy.scienceValue:resource==='materials'?policy.materialsValue:1)*.7;
  if(resource==='money')moneyIncome+=gain;
 }
 const balance=seat.resources.money-tile.cost+moneyIncome-upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack));
 return (gainedVp-forfeited)*5+future-tile.cost*(balance<6?.8:.35)-Math.max(0,-balance)*14-Math.max(0,3-balance)*3;
}
