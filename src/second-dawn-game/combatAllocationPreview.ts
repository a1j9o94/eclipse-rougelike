import {deriveBlueprintStats,neutralBlueprint} from '../../shared/eclipse/blueprints';
import {publicBlueprint} from '../../shared/eclipse/legal';
import {attackDieHits,riftDieOutcome} from '../../shared/eclipse/combat';
import type {PendingDecision,PlayerView} from '../../shared/eclipse/types';

type Allocation=Extract<PendingDecision,{kind:'combat-allocation'}>;
export interface TargetProjection {id:string;hp:number|undefined;damage:number;uncertainDamage:number;excess:number;destroyed:boolean;assigned:boolean}
export function combatTargetStats(view:PlayerView|undefined,id:string){
 const ship=view?.ships.find(candidate=>candidate.id===id),seat=view?.seats.find(candidate=>candidate.id===ship?.owner),blueprint=seat?.blueprints.find(candidate=>candidate.shipType===ship?.type);
 return ship&&(ship.type==='ancient'||ship.type==='guardian'||ship.type==='gcds')?neutralBlueprint(`${ship.type}-standard`).stats:seat&&blueprint?deriveBlueprintStats(seat.faction,publicBlueprint(blueprint)):undefined;
}
export function combatHitPreview(die:Allocation['dice'][number],id:string,shield:number|undefined):boolean|undefined {
 if(die.hitTargets!==undefined)return die.hitTargets.includes(id);
 if(die.weaponColor==='magenta')return die.damage>0;
 if(die.face===1)return false;
 if(die.face===6)return true;
 return die.computer===undefined||shield===undefined?undefined:attackDieHits({face:die.face,computer:die.computer,weaponColor:die.weaponColor},shield);
}
/** Presentation of the editable allocation; authoritative dice and ships stay untouched. */
export function combatAllocationPreview(view:PlayerView|undefined,decision:Allocation,values:Readonly<Record<string,string>>) {
 const remaining=decision.dice.filter(die=>die.targets.length&&die.hitTargets?.length!==0).reduce((sum,die)=>sum+(die.split?Math.max(0,die.damage-die.targets.reduce((damage,id)=>damage+Number(values[`${die.id}/${id}`]??0),0)):die.targets.includes(values[die.id])?0:1),0);
 const targets:TargetProjection[]=[...new Set(decision.dice.flatMap(die=>die.targets))].map(id=>{
  const ship=view?.ships.find(candidate=>candidate.id===id),stats=combatTargetStats(view,id);
  const hp=stats&&ship?Math.max(0,stats.hull+1-ship.damage):undefined;
  let damage=0,uncertainDamage=0,assigned=false;
  for(const die of decision.dice){
   if(die.split){const amount=Number(values[`${die.id}/${id}`]??0);damage+=amount;assigned||=amount>0;continue;}
   if(values[die.id]!==id)continue;
   assigned=true;
   const hit=combatHitPreview(die,id,stats?.shield);
   if(hit===true)damage+=die.damage;else if(hit===undefined)uncertainDamage+=die.damage;
  }
  return {id,hp,damage,uncertainDamage,assigned,excess:hp===undefined?0:Math.max(0,damage-hp),destroyed:hp!==undefined&&hp>0&&damage>=hp};
 });
 const destroyed=targets.filter(target=>target.destroyed).length;
 const backfire=decision.dice.reduce((sum,die)=>sum+(die.weaponColor==='magenta'?riftDieOutcome(die.face).backfire:0),0);
 return {remaining,targets,destroyed,backfire,damage:targets.reduce((sum,target)=>sum+target.damage,0),uncertainDamage:targets.reduce((sum,target)=>sum+target.uncertainDamage,0)};
}
