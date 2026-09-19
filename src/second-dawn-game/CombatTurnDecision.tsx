import {useState} from 'react';
import type {GameCommand,PendingDecision,PlayerView} from '../../shared/eclipse/types';
import {RetreatCards} from './CombatDecisionVisuals';
import ShipSilhouette from './ShipSilhouette';

type CombatTurn=Extract<PendingDecision,{kind:'combat-turn'|'retreat'}>;
export default function CombatTurnDecision({decision,view,disabled,onSubmit}:{decision:CombatTurn;view?:PlayerView;disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const forced=decision.kind==='combat-turn'&&!!decision.forcedRetreat;
 const [choosingRetreat,setChoosingRetreat]=useState(forced);
 const shipType=decision.kind==='combat-turn'?decision.shipType:null;
 const sector=view?.sectors.find(s=>s.id===view.battle?.sectorId);
 const submit=(destination:string|null)=>{
  if(disabled||(destination!==null&&!decision.destinationIds.includes(destination))||(forced&&destination===null))return;
  onSubmit({type:'resolve',decisionId:decision.id,choice:decision.kind==='combat-turn'?{kind:'combat-turn',retreatTo:destination}:{kind:'retreat',destinationId:destination}});
 };
 return <section className="dg-decision dg-combat-turn" aria-label="Combat controls">
  <div className="dg-combat-turn-heading">
   {shipType&&['interceptor','cruiser','dreadnought','starbase'].includes(shipType)&&<ShipSilhouette type={shipType as 'interceptor'|'cruiser'|'dreadnought'|'starbase'} faction={view?.seats.find(seat=>seat.id===decision.owner)?.faction}/>}
   <div><p className="sd-eyebrow">{sector?`BATTLE · SECTOR ${sector.tileId}`:'BATTLE'}</p><h2>{forced?'Retreat required':shipType?`Your ${shipType}s are ready`:'Your fleet is ready'}</h2></div>
  </div>
  {!forced&&decision.kind==='combat-turn'&&<p className="dg-combat-turn-prompt">Roll when you are ready, or declare a retreat.</p>}
  {!forced&&<div className="dg-combat-turn-actions">
   <button className="sd-primary" disabled={disabled} onClick={()=>submit(null)}>{decision.kind==='combat-turn'?'Roll dice':'Keep fighting'}</button>
   <button disabled={!decision.destinationIds.length} aria-expanded={choosingRetreat} onClick={()=>setChoosingRetreat(open=>!open)}>Retreat</button>
  </div>}
  {!decision.destinationIds.length&&<p className="sd-muted">No legal retreat route. Retreat requires a connected, controlled sector without opposing ships.</p>}
  {choosingRetreat&&<div className="dg-combat-retreat-options">
   {decision.kind==='combat-turn'&&<p>Choose a destination to declare retreat instead of firing. These ships leave on their next firing turn and can still be hit before then.</p>}
   <RetreatCards view={view} destinationIds={decision.destinationIds} value={null} includeFight={false} forced={forced} disabled={disabled} onSelect={submit}/>
   {!forced&&<button onClick={()=>setChoosingRetreat(false)}>Back to firing</button>}
  </div>}
 </section>;
}
