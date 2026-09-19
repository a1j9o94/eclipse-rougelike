import { estimatePublicBattle } from './aiSimulation';
import { deriveBlueprintStats, neutralBlueprint } from './blueprints';
import { factionHasCapability } from './catalog';
import { publicBlueprint } from './legal';
import type { PlayerView, Ship } from './types';

export type MovementBattleEstimate =
  | { status: 'peaceful' }
  | { status: 'unavailable'; reason: string }
  | { status: 'estimate'; winPercent: number; lowerPercent: number; upperPercent: number; trials: number; friendlyShips: number; enemyShips: number; defender: boolean };
const unavailable=(reason:string):MovementBattleEstimate=>({status:'unavailable',reason});
const neutral=(ship:Ship)=>ship.type==='ancient'||ship.type==='guardian'||ship.type==='gcds';

/** Public-information approximation. Four-trial batches yield to input; the budget never consumes game RNG. */
export async function movementBattleEstimate(view:PlayerView,shipIds:readonly string[],targetSectorId:string,signal?:AbortSignal):Promise<MovementBattleEstimate>{
 if(signal?.aborted)return unavailable('Selection changed.');
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId),target=view.sectors.find(sector=>sector.id===targetSectorId);
 const selected=view.ships.filter(ship=>shipIds.includes(ship.id));
 if(!own||!target||!selected.length||new Set(shipIds).size!==shipIds.length||selected.length!==shipIds.length||selected.some(ship=>ship.owner!==own.id))return unavailable('Select your visible ships and a destination.');
 const enemies=view.ships.filter(ship=>ship.sectorId===target.id&&ship.owner!==own.id&&!(ship.type==='ancient'&&factionHasCapability(own.faction,'ancient-coexistence')));
 if(!enemies.length)return {status:'peaceful'};
 if(new Set(enemies.map(ship=>ship.owner)).size>1)return unavailable('Multiple factions fight in sequence here; a single win percentage would be misleading.');
 if(view.battle?.sectorId===target.id)return unavailable('An existing battle needs its current rolls and combat order.');
 const resident=selected.every(ship=>ship.sectorId===target.id);
 const friends=[...selected,...view.ships.filter(ship=>ship.owner===own.id&&ship.sectorId===target.id&&!shipIds.includes(ship.id))];
 if(friends.length+enemies.length>20)return unavailable('This fleet is too large for a quick estimate.');
 // Reinforcement arrival order in a contested unowned sector can depend on other queued routes.
 if(!resident&&friends.length>selected.length&&target.owner!==own.id&&target.owner!==enemies[0].owner)return unavailable('Reinforcements in this contested sector need the final arrival order.');
 const fleet=[...friends,...enemies];let dice=0;
 for(const ship of fleet){
  const seat=view.seats.find(candidate=>candidate.id===ship.owner),blueprint=seat?.blueprints.find(candidate=>candidate.shipType===ship.type);
  const stats=neutral(ship)?neutralBlueprint(`${ship.type as 'ancient'|'guardian'|'gcds'}-standard`).stats:seat&&blueprint?deriveBlueprintStats(seat.faction,publicBlueprint(blueprint)):null;
  if(!stats)return unavailable('A public ship blueprint is missing.');
  dice+=stats.weapons.reduce((sum,weapon)=>sum+weapon.dice,0);
 }
 if(dice>64)return unavailable('This fleet is too large for a quick estimate.');
 const projected:PlayerView={...view,ships:view.ships.map(ship=>shipIds.includes(ship.id)?{...ship,sectorId:target.id}:ship)};
 // Neutral fleets defend first, then the sector owner; otherwise the arriving fleet attacks.
 const firstArrival=(ships:Ship[])=>Math.min(...ships.map(ship=>ship.arrival??0));
 const residentDefender=firstArrival(friends)<firstArrival(enemies)||(firstArrival(friends)===firstArrival(enemies)&&own.id.localeCompare(enemies[0].owner)<0);
 const defender=!enemies.some(neutral)&&(target.owner===own.id||(resident&&target.owner!==enemies[0].owner&&residentDefender));
 const attackers=(defender?enemies:friends).map(ship=>ship.id),defenders=(defender?friends:enemies).map(ship=>ship.id);
 let wins=0,unresolved=0,trials=0,cpuMs=0;
 while(trials<96&&cpuMs<60){
  if(signal?.aborted)return unavailable('Selection changed.');
  const start=performance.now();
  const estimate=estimatePublicBattle(projected,attackers,defenders,(0x6ec11f+Math.imul(trials+1,2654435761))>>>0,4,{stage:'missiles',maxCannonRounds:24});
  cpuMs+=performance.now()-start;
  wins+=(defender?estimate.defenderWinProbability:estimate.attackerWinProbability)*estimate.trials;
  unresolved+=estimate.unresolvedProbability*estimate.trials;trials+=estimate.trials;
  if(estimate.model!=='duel')return unavailable('This engagement needs its actual combat order.');
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 if(signal?.aborted)return unavailable('Selection changed.');
 if(trials<32)return unavailable('This battle needs more time than a quick estimate allows.');
 if(unresolved/trials>0.05)return unavailable('Too many simulations remain unresolved to give a useful win percentage.');
 const probability=wins/trials,z=1.96,denominator=1+z*z/trials;
 const middle=(probability+z*z/(2*trials))/denominator;
 const radius=z*Math.sqrt(probability*(1-probability)/trials+z*z/(4*trials*trials))/denominator;
 return {status:'estimate',winPercent:Math.round(probability*20)*5,lowerPercent:Math.max(0,Math.floor((middle-radius)*100)),upperPercent:Math.min(100,Math.ceil((middle+radius)*100)),trials,friendlyShips:friends.length,enemyShips:enemies.length,defender};
}
