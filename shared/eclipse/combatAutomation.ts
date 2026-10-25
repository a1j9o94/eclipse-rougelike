import {deriveBlueprintStats, neutralBlueprint} from './blueprints';
import {publicBlueprint} from './legal';
import {attackDieHits} from './combat';
import type {DecisionChoice, GameCommand, PendingDecision, PlayerView} from './types';

export type CombatAutomationPauseReason = 'manual' | 'ship-loss' | 'forced-retreat' | 'special-decision' | 'complete' | 'error' | 'timeout' | 'undo';
/** Only this projection is returned to the owning player. Old saves omit it. */
export interface CombatAutomationStatus {
 battleId: string;
 status: 'running' | 'paused' | 'finished';
 reason: CombatAutomationPauseReason | null;
 controlVersion: number;
}
export interface CombatAutomationIntent extends CombatAutomationStatus {
 /** Snapshot of the fleet at explicit enable/resume, used to stop on losses. */
 shipIds: string[];
 scheduledRevision?: number;
 expiresAt?: number;
}
export type CombatAutomationControlResult =
 | {ok: true; duplicate: boolean}
 | {ok: false; error: import('./types').ValidationError};
type Allocation = Extract<DecisionChoice,{kind:'combat-allocation'}>;
type AllocationDecision = Extract<PendingDecision,{kind:'combat-allocation'}>;

export function combatAutomationPauseReason(view: PlayerView, battleId: string, shipIds: readonly string[]): CombatAutomationPauseReason | null {
 if (view.phase === 'finished' || !view.battle || view.battle.id !== battleId) return 'complete';
 if (shipIds.some(id => !view.ships.some(ship => ship.id === id && ship.owner === view.viewerSeatId))) return 'ship-loss';
 const decision=view.pendingDecision;
 if (!decision) return null;
 if (decision.kind === 'combat-turn') return decision.forcedRetreat ? 'forced-retreat' : null;
 if (decision.kind === 'combat-allocation') return null;
 return decision.kind === 'retreat' ? 'forced-retreat' : 'special-decision';
}

/** Deterministic public-information policy. It never rolls dice or changes state. */
export function automaticCombatAllocation(view: PlayerView, decision: AllocationDecision): Allocation {
 const targetIds=[...new Set(decision.dice.flatMap(die=>die.targets))];
 const targets=targetIds.map(id=>{
  const ship=view.ships.find(candidate=>candidate.id===id);
  if (!ship) throw new Error('A rolled target is no longer present.');
  const seat=view.seats.find(candidate=>candidate.id===ship.owner);
  const blueprint=seat?.blueprints.find(candidate=>candidate.shipType===ship.type);
  const stats=ship.type==='ancient'||ship.type==='guardian'||ship.type==='gcds'
   ? neutralBlueprint(`${ship.type}-standard`).stats
   : seat&&blueprint ? deriveBlueprintStats(seat.faction,publicBlueprint(blueprint)) : null;
  if (!stats) throw new Error('A target blueprint is unavailable.');
  return {id,hp:Math.max(0,stats.hull+1-ship.damage),shield:stats.shield};
 }).sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id));
 const hits=(die:AllocationDecision['dice'][number],target:typeof targets[number])=>die.targets.includes(target.id)&&(die.hitTargets!==undefined?die.hitTargets.includes(target.id):attackDieHits({face:die.face,computer:die.computer??0,weaponColor:die.weaponColor},target.shield));
 // Split dice become independently assignable units, then are combined again.
 const units=decision.dice.flatMap(die=>die.split
  ? Array.from({length:die.damage},(_,index)=>({id:`${die.id}/${index}`,die,damage:1}))
  : [{id:die.id,die,damage:die.damage}]);
 const remaining=units.filter(unit=>unit.damage>0&&targets.some(target=>hits(unit.die,target)));
 const assigned=new Map<string,string>();
 const hp=new Map(targets.map(target=>[target.id,target.hp]));
 // Complete cheap kills first. A bounded damage subset avoids wasting a large die
 // when a smaller combination is sufficient. No combinatorial target enumeration.
 for (const target of targets) {
  const candidates=remaining.filter(unit=>hits(unit.die,target));
  const cap=target.hp+Math.max(0,...candidates.map(unit=>unit.damage));
  const sums=new Map<number,string[]>([[0,[]]]);
  for (const unit of candidates) for (const [damage,ids] of [...sums]) {
   const sum=damage+unit.damage;
   if(sum<=cap&&!sums.has(sum))sums.set(sum,[...ids,unit.id]);
  }
  const enough=[...sums.keys()].filter(sum=>sum>=target.hp&&sum>0).sort((a,b)=>a-b)[0];
  if(enough===undefined)continue;
  for(const id of sums.get(enough)!) {
   assigned.set(id,target.id);
   remaining.splice(remaining.findIndex(unit=>unit.id===id),1);
  }
  hp.set(target.id,0);
 }
 for(const unit of remaining) {
  const hittable=targets.filter(target=>hits(unit.die,target));
  const live=hittable.filter(target=>(hp.get(target.id)??0)>0).sort((a,b)=>(hp.get(a.id)??0)-(hp.get(b.id)??0)||a.id.localeCompare(b.id));
  const target=live[0]??hittable[hittable.length-1];
  if(target){assigned.set(unit.id,target.id);hp.set(target.id,Math.max(0,(hp.get(target.id)??0)-unit.damage));}
 }
 const allocations:Allocation['allocations']=[];
 for(const die of decision.dice) {
  if(die.split) {
   const amounts=new Map<string,number>();
   for(const unit of units.filter(candidate=>candidate.die.id===die.id)) {
    const target=assigned.get(unit.id);if(target)amounts.set(target,(amounts.get(target)??0)+1);
   }
   for(const [targetId,damage] of amounts)allocations.push({dieId:die.id,targetId,damage});
  } else if(!(die.weaponColor==='magenta'&&die.damage===0)&&die.targets.length) {
   allocations.push({dieId:die.id,targetId:assigned.get(die.id)??die.targets[0]});
  }
 }
 return {kind:'combat-allocation',allocations};
}

export function automaticCombatCommand(view: PlayerView): GameCommand | null {
 const decision=view.pendingDecision;
 if(!decision||decision.owner!==view.viewerSeatId||!view.battle||!('battleId' in decision)||decision.battleId!==view.battle.id)return null;
 if(decision.kind==='combat-turn'&&!decision.forcedRetreat)return {type:'resolve',decisionId:decision.id,choice:{kind:'combat-turn',retreatTo:null}};
 if(decision.kind==='combat-allocation')return {type:'resolve',decisionId:decision.id,choice:automaticCombatAllocation(view,decision)};
 return null;
}
