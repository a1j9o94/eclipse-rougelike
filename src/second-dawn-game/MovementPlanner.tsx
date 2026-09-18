import { useEffect, useMemo } from 'react';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
import ShipSilhouette from './ShipSilhouette';
import ActionEconomy from './ActionEconomy';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import { movementPlan } from './movementPlanning';
import './movementPlanner.css';
export interface MovementPlannerProps {
 view:PlayerView; sourceSectorId:string|null; selectedTargetId:string|null; disabled:boolean;
 onTargetsChange:(ids:string[])=>void; onClose:()=>void; onSubmit:(command:GameCommand)=>void;
}
export default function MovementPlanner({view,sourceSectorId,selectedTargetId,disabled,onTargetsChange,onClose,onSubmit}:MovementPlannerProps){
 const [draft,setDraft]=useActionDraftState('movement',{source:sourceSectorId,ids:[]});
 const draftGuard=useActionDraftGuard();
 const ids=useMemo(()=>draft.source===sourceSectorId?draft.ids:[],[draft,sourceSectorId]);
 const plan=useMemo(()=>movementPlan(view,sourceSectorId,ids),[view,sourceSectorId,ids]);
 const targetKey=plan.destinations.map(d=>d.sectorId).join('|');
 useEffect(()=>{onTargetsChange(targetKey?targetKey.split('|'):[]);},[targetKey,onTargetsChange]);
 const destination=plan.destinations.find(d=>d.sectorId===selectedTargetId);
 const activations=destination?.activations??ids.length;
 const source=view.sectors.find(s=>s.id===sourceSectorId);
 const target=view.sectors.find(s=>s.id===selectedTargetId);
 const toggle=(id:string)=>setDraft({source:sourceSectorId,ids:ids.includes(id)?ids.filter(s=>s!==id):[...ids,id]});
 return <section className="dg-movement-planner" aria-label="Move fleet">
  <header><div><span className="dg-eyebrow">MOVE FLEET</span><h2>{source?`Depart sector ${source.tileId}`:'Choose a departure sector'}</h2></div><button type="button" onClick={onClose} aria-label="Close movement planner">Close</button></header>
  <p className="dg-movement-steps">1 Select ships · 2 Choose a sector on the galaxy · 3 Confirm</p>
  <p>{activations} / {plan.capacity} move activations selected{source&&plan.leaveCapacity<plan.ships.length?` · ${plan.leaveCapacity} ships can leave without being pinned`:''}</p>
  <div className="dg-movement-ships">{plan.ships.map(ship=>{const checked=ids.includes(ship.id);const locked=disabled||!!ship.reason||(!checked&&(ids.length>=plan.capacity||ids.length>=plan.leaveCapacity));return <label key={ship.id} className={`dg-movement-ship ${checked?'is-selected':''} ${locked?'is-unavailable':''}`}><input type="checkbox" checked={checked} disabled={locked} onChange={()=>toggle(ship.id)} aria-label={ship.label}/><ShipSilhouette type={ship.type}/><span><strong>{ship.label}</strong><small>{ship.range} {ship.range===1?'sector':'sectors'} per activation</small>{ship.reason&&<small className="dg-danger">{ship.reason}</small>}</span></label>;})}</div>
  {plan.message&&<p role="status">{plan.message}</p>}
  {!!ids.length&&!plan.message&&!destination&&<p role="status">{target?'That sector is outside the selected fleet’s legal routes.':'Choose a highlighted destination on the galaxy.'}</p>}
  {destination&&<div className="dg-movement-route"><h3>Destination · sector {target?.tileId}</h3>{ids.map(shipId=>{const moves=destination.command.moves.filter(move=>move.shipId===shipId);return <p key={shipId}><strong>{plan.ships.find(s=>s.id===shipId)?.label} <small>· {moves.length} {moves.length===1?'activation':'activations'}</small></strong><span>{[source?.tileId,...moves.flatMap(move=>move.path).map(id=>view.sectors.find(s=>s.id===id)?.tileId)].join(' → ')}</span></p>;})}</div>}
  <ActionEconomy view={view} action="move" preview={destination?previewCommand(view,destination.command):null}/>
  <div className="dg-movement-confirm"><button type="button" disabled={disabled||draftGuard.stale||!destination} onClick={()=>{if(destination&&!draftGuard.stale)onSubmit(destination.command);}}>Confirm move{ids.length?` · ${ids.length} ${ids.length===1?'ship':'ships'}`:''}{destination?` · ${activations} ${activations===1?'activation':'activations'}`:''}</button></div>
 </section>;
}
