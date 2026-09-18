import { useEffect, useMemo } from 'react';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
import ShipSilhouette from './ShipSilhouette';
import ActionEconomy from './ActionEconomy';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import { movementPlan, queuedMovementPlan, type MovementRoutePreview } from './movementPlanning';
import './movementPlanner.css';
export interface MovementSelection { sourceSectorId:string|null; shipIds:string[]; targetSectorId:string|null }
export interface MovementPlannerProps {
 view:PlayerView; sourceSectorId:string|null; selectedTargetId:string|null; disabled:boolean;
 result?:string; onDone?:()=>void; onTargetsChange:(ids:string[])=>void; onClose:()=>void; onSubmit:(command:GameCommand)=>void;
 onRoutePreview?:(routes:readonly MovementRoutePreview[])=>void;
 onSelectionChange?:(selection:MovementSelection)=>void;
}
export default function MovementPlanner({view,sourceSectorId,selectedTargetId,disabled,result,onDone,onTargetsChange,onClose,onSubmit,onRoutePreview,onSelectionChange}:MovementPlannerProps){
 const [draft,setDraft]=useActionDraftState('movement',{source:sourceSectorId,ids:[]});
 const [queuedRoutes,setQueuedRoutes]=useActionDraftState('movementRoutes',[]);
 const draftGuard=useActionDraftGuard();
 const ids=useMemo(()=>draft.source===sourceSectorId?draft.ids:[],[draft,sourceSectorId]);
 const queued=useMemo(()=>queuedMovementPlan(view,queuedRoutes),[view,queuedRoutes]);
 const plan=useMemo(()=>movementPlan(queued.projectedView,sourceSectorId,ids,queued.remainingCapacity),[queued.projectedView,sourceSectorId,ids,queued.remainingCapacity]);
 const targetKey=plan.destinations.map(d=>d.sectorId).join('|');
 useEffect(()=>{onTargetsChange(targetKey?targetKey.split('|'):[]);},[targetKey,onTargetsChange]);
 useEffect(()=>{onRoutePreview?.(queued.routes);},[queued.routes,onRoutePreview]);
 const destination=plan.destinations.find(d=>d.sectorId===selectedTargetId);
 const activations=destination?.activations??ids.length;
 const source=view.sectors.find(s=>s.id===sourceSectorId);const target=view.sectors.find(s=>s.id===selectedTargetId);
 const toggle=(id:string)=>setDraft({source:sourceSectorId,ids:ids.includes(id)?ids.filter(s=>s!==id):[...ids,id]});
 const clearSelection=()=>{setDraft({source:null,ids:[]});onSelectionChange?.({sourceSectorId:null,shipIds:[],targetSectorId:null});};
 const queueRoute=()=>{if(!destination||draftGuard.stale||!sourceSectorId)return;const nextRoutes=[...queuedRoutes,{sourceSectorId,shipIds:[...ids],destinationSectorId:destination.sectorId}];setQueuedRoutes(nextRoutes);const afterQueue=queuedMovementPlan(view,nextRoutes);const retained=movementPlan(afterQueue.projectedView,sourceSectorId,[],afterQueue.remainingCapacity).ships.some(ship=>!ship.reason);if(retained){setDraft({source:sourceSectorId,ids:[]});onSelectionChange?.({sourceSectorId,shipIds:[],targetSectorId:null});}else clearSelection();};
 const removeRoute=(index:number)=>setQueuedRoutes(routes=>routes.filter((_,routeIndex)=>routeIndex!==index));
 const moveRoute=(index:number,direction:-1|1)=>setQueuedRoutes(routes=>{const targetIndex=index+direction;if(targetIndex<0||targetIndex>=routes.length)return routes;const next=[...routes];[next[index],next[targetIndex]]=[next[targetIndex],next[index]];return next;});
 const routeMode=!!onRoutePreview;
 const hasUnqueuedSelection=routeMode&&ids.length>0;
 const execution=routeMode&&destination&&sourceSectorId?queuedMovementPlan(view,[...queuedRoutes,{sourceSectorId,shipIds:[...ids],destinationSectorId:destination.sectorId}]):queued;
 const executionRouteCount=queuedRoutes.length+(routeMode&&destination?1:0);
 return <section className="dg-movement-planner" aria-label="Move fleet">
  <header><div><span className="dg-eyebrow">MOVE FLEET</span><h2>{source?`Depart sector ${source.tileId}`:'Choose a departure sector'}</h2></div><button type="button" onClick={onClose} aria-label="Close movement planner">Close</button></header>
  {result&&<p className="dg-movement-result" role="status">{result}</p>}
  {view.actionProgress?.owner===view.viewerSeatId&&view.actionProgress.action==='move'&&<p className="dg-movement-capacity">{queued.remainingCapacity} {queued.remainingCapacity===1?'move':'moves'} left in this action</p>}
  <p className="dg-movement-steps">{routeMode?'1 Select ships · 2 Choose a sector on the galaxy · 3 Queue route · 4 Execute':'1 Select ships · 2 Choose a sector on the galaxy · 3 Confirm'}</p>
  <p>{activations} / {queued.remainingCapacity} move activations selected{source&&plan.leaveCapacity<plan.ships.length?` · ${plan.leaveCapacity} ships can leave without being pinned`:''}</p>
  <div className="dg-movement-ships">{plan.ships.map(ship=>{const checked=ids.includes(ship.id);const locked=disabled||!!ship.reason||(!checked&&(ids.length>=queued.remainingCapacity||ids.length>=plan.leaveCapacity));return <label key={ship.id} className={`dg-movement-ship ${checked?'is-selected':''} ${locked?'is-unavailable':''}`}><input type="checkbox" checked={checked} disabled={locked} onChange={()=>toggle(ship.id)} aria-label={ship.label}/><ShipSilhouette type={ship.type}/><span><strong>{ship.label}</strong><small>{ship.range} {ship.range===1?'sector':'sectors'} per activation</small>{ship.reason&&<small className="dg-danger">{ship.reason}</small>}</span></label>;})}</div>
  {plan.message&&<p role="status">{plan.message}</p>}
  {!!ids.length&&!plan.message&&!destination&&<p role="status">{target?'That sector is outside the selected fleet’s legal routes.':'Choose a highlighted destination on the galaxy.'}</p>}
  {destination&&<div className="dg-movement-route"><h3>Destination · sector {target?.tileId}</h3>{ids.map(shipId=>{const moves=destination.command.moves.filter(move=>move.shipId===shipId);return <p key={shipId}><strong>{plan.ships.find(s=>s.id===shipId)?.label} <small>· {moves.length} {moves.length===1?'activation':'activations'}</small></strong><span>{[source?.tileId,...moves.flatMap(move=>move.path).map(id=>view.sectors.find(s=>s.id===id)?.tileId)].join(' → ')}</span></p>;})}</div>}
  {routeMode&&queued.routes.length>0&&<section className="dg-movement-queue" aria-label="Queued movement routes"><h3>Queued routes · {queued.routes.length}</h3>{queued.routes.map((route,index)=>{const from=view.sectors.find(sector=>sector.id===route.draft.sourceSectorId);const to=view.sectors.find(sector=>sector.id===route.draft.destinationSectorId);return <div key={`${route.draft.sourceSectorId}:${route.draft.shipIds.join(',')}:${route.draft.destinationSectorId}:${index}`} className={route.status==='rejected'?'is-rejected':''}><span>{index+1}. {from?.tileId??'Unknown'} → {to?.tileId??'Unknown'} · {route.draft.shipIds.length} ship{route.draft.shipIds.length===1?'':'s'}</span>{route.message&&<small role="status">{route.message}</small>}<button type="button" disabled={disabled} onClick={()=>moveRoute(index,-1)} aria-label={`Move queued route ${index+1} earlier`}>↑</button><button type="button" disabled={disabled} onClick={()=>moveRoute(index,1)} aria-label={`Move queued route ${index+1} later`}>↓</button><button type="button" disabled={disabled} onClick={()=>removeRoute(index)}>Remove</button></div>;})}</section>}
  <ActionEconomy view={view} action="move" preview={routeMode&&execution.command.moves.length?previewCommand(view,execution.command):destination?previewCommand(view,destination.command):null}/>
  <div className="dg-movement-confirm">{routeMode?<><button type="button" disabled={disabled||draftGuard.stale||!destination} onClick={queueRoute}>Queue route{ids.length?` · ${ids.length} ${ids.length===1?'ship':'ships'}`:''}</button>{hasUnqueuedSelection&&<p role="status">Execute includes the selected route, or queue it to draft another departure.</p>}<button type="button" disabled={disabled||draftGuard.stale||execution.routes.some(route=>route.status==='rejected')||!execution.command.moves.length} onClick={()=>{if(!draftGuard.stale&&!execution.routes.some(route=>route.status==='rejected')&&execution.command.moves.length)onSubmit(execution.command);}}>Execute {executionRouteCount} {executionRouteCount===1?'route':'routes'} · {execution.command.moves.length} {execution.command.moves.length===1?'activation':'activations'}</button></>:<button type="button" disabled={disabled||draftGuard.stale||!destination} onClick={()=>{if(destination&&!draftGuard.stale)onSubmit(destination.command);}}>Confirm move{ids.length?` · ${ids.length} ${ids.length===1?'ship':'ships'}`:''}{destination?` · ${activations} ${activations===1?'activation':'activations'}`:''}</button>}{onDone&&<button type="button" disabled={disabled||draftGuard.stale} onClick={onDone}>Done moving</button>}</div>
 </section>;
}
