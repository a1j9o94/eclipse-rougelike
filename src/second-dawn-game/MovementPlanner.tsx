import CommitBar from './CommitBar';
import FactoryBadge from './FactoryBadge';
import {guildMovementTolls} from '../../shared/eclipse/scifiActions';
import {getFaction} from '../../shared/eclipse/catalog';
import {useCommitLabel} from './commitContext';
import { useEffect, useMemo } from 'react';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
import ShipSilhouette from './ShipSilhouette';
import ActionEconomy from './ActionEconomy';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import { movementPlan, queuedMovementPlan, type MovementRoutePreview } from './movementPlanning';
import './movementPlanner.css';
import MovementBattlePreview from './MovementBattlePreview';
export interface MovementSelection { sourceSectorId:string|null; shipIds:string[]; targetSectorId:string|null }
export interface MovementPlannerProps {
 view:PlayerView; sourceSectorId:string|null; selectedTargetId:string|null; disabled:boolean;
 showCombatOdds?:boolean; embedded?:boolean;
 result?:string; onDone?:()=>void; onTargetsChange:(ids:string[])=>void; onClose:()=>void; onSubmit:(command:GameCommand)=>void;
 onChangeSource?:()=>void;
 onRoutePreview?:(routes:readonly MovementRoutePreview[])=>void;
 onSelectionChange?:(selection:MovementSelection)=>void;
}
export default function MovementPlanner({view,sourceSectorId,selectedTargetId,disabled,result,onDone,onTargetsChange,onClose,onSubmit,onRoutePreview,onSelectionChange,onChangeSource,showCombatOdds=false,embedded=false}:MovementPlannerProps){
 const commitLabel=useCommitLabel();
 const [savedEditingRoute,setEditingRoute]=useActionDraftState('movementEditIndex',null);
 const [draft,setDraft]=useActionDraftState('movement',{source:sourceSectorId,ids:[]});
 const [queuedRoutes,setQueuedRoutes]=useActionDraftState('movementRoutes',[]);
 const draftGuard=useActionDraftGuard();
 const editingRoute=savedEditingRoute!==null&&queuedRoutes[savedEditingRoute]?savedEditingRoute:null;
 const ids=useMemo(()=>draft.source===sourceSectorId?draft.ids:[],[draft,sourceSectorId]);
 const escortsByLeader=useMemo(()=>draft.source===sourceSectorId?draft.escortsByLeader??{}:{},[draft,sourceSectorId]);
 const queued=useMemo(()=>queuedMovementPlan(view,queuedRoutes),[view,queuedRoutes]);
 const prefix=useMemo(()=>editingRoute===null?queued:queuedMovementPlan(view,queuedRoutes.slice(0,editingRoute)),[editingRoute,queued,view,queuedRoutes]);
 const plan=useMemo(()=>movementPlan(prefix.projectedView,sourceSectorId,ids,prefix.remainingCapacity,escortsByLeader,prefix.paidShipIds),[prefix,sourceSectorId,ids,escortsByLeader]);
 const targetKey=plan.destinations.map(d=>d.sectorId).join('|');
 useEffect(()=>{onTargetsChange(targetKey?targetKey.split('|'):[]);},[targetKey,onTargetsChange]);
 const destination=plan.destinations.find(d=>d.sectorId===selectedTargetId);
 const activations=destination?.activations??ids.length;
 const source=view.sectors.find(s=>s.id===sourceSectorId);const target=view.sectors.find(s=>s.id===selectedTargetId);
 const toggle=(id:string)=>setDraft({source:sourceSectorId,ids:ids.includes(id)?ids.filter(s=>s!==id):[...ids,id],escortsByLeader: Object.fromEntries(Object.entries(escortsByLeader).filter(([leader])=>leader!==id))});
 const clearSelection=()=>{setDraft({source:null,ids:[]});onSelectionChange?.({sourceSectorId:null,shipIds:[],targetSectorId:null});};
 const currentRoute=useMemo(()=>destination&&sourceSectorId?{sourceSectorId,shipIds:[...ids],destinationSectorId:destination.sectorId,...(Object.values(escortsByLeader).some(group=>group.length)?{escortsByLeader}:{})}:null,[destination,sourceSectorId,ids,escortsByLeader]);
 const routeMode=!!onRoutePreview;
 const editableRoute=useMemo(()=>sourceSectorId&&(ids.length>0||editingRoute!==null)?{sourceSectorId,shipIds:[...ids],destinationSectorId:selectedTargetId??'',...(Object.values(escortsByLeader).some(group=>group.length)?{escortsByLeader}:{})}:null,[sourceSectorId,ids,selectedTargetId,editingRoute,escortsByLeader]);
 const visibleRoutes=useMemo(()=>editableRoute?(editingRoute===null?[...queuedRoutes,editableRoute]:queuedRoutes.map((route,index)=>index===editingRoute?editableRoute:route)):queuedRoutes,[editableRoute,editingRoute,queuedRoutes]);
 const activeRoute=editingRoute??(editableRoute?queuedRoutes.length:null);
 const execution=useMemo(()=>queuedMovementPlan(view,visibleRoutes),[view,visibleRoutes]);
 const hasInvalidSelection=(ids.length>0||editingRoute!==null)&&!currentRoute;
 const command=routeMode?execution.command:destination?.command;
 const commandPreview=command?.moves.length?previewCommand(view,command):null;
 const queueRoute=()=>{if(!currentRoute||draftGuard.stale)return;setQueuedRoutes(visibleRoutes);setEditingRoute(null);const after=queuedMovementPlan(view,visibleRoutes);if(sourceSectorId&&movementPlan(after.projectedView,sourceSectorId,[],after.remainingCapacity).ships.some(ship=>!ship.reason)){setDraft({source:sourceSectorId,ids:[]});onSelectionChange?.({sourceSectorId,shipIds:[],targetSectorId:null});}else clearSelection();};
 const editRoute=(index:number)=>{const route=visibleRoutes[index];if(!route)return;setQueuedRoutes(visibleRoutes);setEditingRoute(index);setDraft({source:route.sourceSectorId,ids:route.shipIds,escortsByLeader:route.escortsByLeader});onSelectionChange?.({sourceSectorId:route.sourceSectorId,shipIds:route.shipIds,targetSectorId:route.destinationSectorId});};
 const removeRoute=(index:number)=>{setQueuedRoutes(visibleRoutes.filter((_,routeIndex)=>routeIndex!==index));if(activeRoute===index){setEditingRoute(null);clearSelection();}else if(activeRoute!==null)setEditingRoute(activeRoute>index?activeRoute-1:activeRoute);};
 const moveRoute=(index:number,direction:-1|1)=>{const targetIndex=index+direction;if(targetIndex<0||targetIndex>=visibleRoutes.length)return;const next=[...visibleRoutes];[next[index],next[targetIndex]]=[next[targetIndex],next[index]];setQueuedRoutes(next);if(activeRoute===index)setEditingRoute(targetIndex);else if(activeRoute===targetIndex)setEditingRoute(index);else setEditingRoute(activeRoute);};
 const previewRoutes=execution.routes;
 useEffect(()=>{onRoutePreview?.(previewRoutes);},[previewRoutes,onRoutePreview]);
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 const tollCommand=routeMode?execution.command:destination?.command;let toll=0;const recipients=new Set<string>();const paid:string[]=[...(view.actionProgress?.guildTollShipIds??[])];const origins=new Map(view.ships.map(s=>[s.id,s.sectorId]));for(const move of tollCommand?.moves??[]){const quoted=guildMovementTolls(view,own.id,[move.shipId,...(move.escorts??[])],origins.get(move.shipId)??'',move.path,paid);toll+=quoted.reduce((sum,item)=>sum+item.amount,0);paid.push(...quoted.map(item=>item.shipId));for(const item of quoted)recipients.add(item.owner);for(const id of [move.shipId,...(move.escorts??[])])origins.set(id,move.path.at(-1)??'');}
 return <section className="dg-movement-planner" aria-label="Move fleet">
  <header><div className="dg-movement-heading-copy"><span className="dg-eyebrow">MOVE FLEET</span><h2>{source?`Depart sector ${source.tileId}`:'Choose a departure sector'}</h2></div><div className="dg-movement-header-actions">{onChangeSource&&<button type="button" onClick={onChangeSource}>Change departure sector</button>}{!embedded&&<button type="button" onClick={onClose} aria-label="Close movement planner">Close</button>}</div></header>
  {result&&<p className="dg-movement-result" role="status">{result}</p>}
  <div className="dg-movement-body">
  <output className="dg-movement-budget" aria-label="Move activations">{activations>0?`${activations} / ${prefix.remainingCapacity} moves`:`${queued.remainingCapacity} moves available`}{source&&plan.leaveCapacity<plan.ships.length&&<span> · {plan.leaveCapacity} ships can leave</span>}</output>
  <div className="dg-movement-ships">{plan.ships.map(ship=>{const checked=ids.includes(ship.id);const locked=disabled||!!ship.reason||(!checked&&(ids.length>=prefix.remainingCapacity||ids.length>=plan.leaveCapacity));return <label key={ship.id} className={`dg-movement-ship ${checked?'is-selected':''} ${locked?'is-unavailable':''}`}><input type="checkbox" checked={checked} disabled={locked} onChange={()=>toggle(ship.id)} aria-label={ship.label}/><ShipSilhouette type={ship.type} faction={view.seats.find(seat=>seat.id===view.viewerSeatId)?.faction}/><span><strong>{view.ships.find(candidate=>candidate.id===ship.id)?.factoryPopulation&&<FactoryBadge/>}{ship.label}</strong><small>{ship.range} {ship.range===1?'sector':'sectors'} per activation</small>{ship.reason&&<small className="dg-danger">{ship.reason}</small>}</span></label>;})}</div>
  {own.faction==='formics'&&!own.passed&&ids.map(leaderId=>{const leader=plan.ships.find(s=>s.id===leaderId);const escortType=leader?.type==='cruiser'?'interceptor':leader?.type==='dreadnought'?'cruiser':null;const escorts=escortsByLeader[leaderId]??[];return escortType?<fieldset key={leaderId}><legend>{leader?.label} convoy · up to 2 {escortType}s</legend>{plan.ships.filter(ship=>ship.type===escortType&&!ids.includes(ship.id)).map(ship=><label key={ship.id}><input type="checkbox" checked={escorts.includes(ship.id)} disabled={disabled||!!ship.reason||(!escorts.includes(ship.id)&&(escorts.length>=2||Object.values(escortsByLeader).some(group=>group.includes(ship.id))))} onChange={()=>setDraft({source:sourceSectorId,ids,escortsByLeader:{...escortsByLeader,[leaderId]:escorts.includes(ship.id)?escorts.filter(id=>id!==ship.id):[...escorts,ship.id]}})}/>{ship.label} · {ship.range} sectors</label>)}</fieldset>:null;})}
  {plan.message&&(ids.length>0||source&&plan.ships.length===0)&&<p role="status">{plan.message}</p>}
  {!!ids.length&&!plan.message&&!destination&&<p role="status">{target?'That sector is outside the selected fleet’s legal routes.':'Choose a highlighted destination on the galaxy.'}</p>}
  {destination&&!routeMode&&<div className="dg-movement-route"><h3>Destination · sector {target?.tileId}</h3>{ids.map(shipId=>{const moves=destination.command.moves.filter(move=>move.shipId===shipId);return <p key={shipId}><strong>{plan.ships.find(s=>s.id===shipId)?.label} <small>· {moves.length} {moves.length===1?'activation':'activations'}</small></strong><span>{[source?.tileId,...moves.flatMap(move=>move.path).map(id=>view.sectors.find(s=>s.id===id)?.tileId)].join(' → ')}</span></p>;})}</div>}
  {showCombatOdds&&destination&&<MovementBattlePreview view={prefix.projectedView} shipIds={ids} targetSectorId={destination.sectorId}/>}
  {routeMode&&execution.routes.length>0&&<section className="dg-movement-queue" aria-label="Movement routes"><header><h3>Routes · {execution.routes.length}</h3>{destination&&<button type="button" disabled={disabled||draftGuard.stale} onClick={queueRoute}>Add another route</button>}</header>{execution.routes.map((route,index)=>{const from=view.sectors.find(sector=>sector.id===route.draft.sourceSectorId);const to=view.sectors.find(sector=>sector.id===route.draft.destinationSectorId);return <div key={`${route.draft.sourceSectorId}:${route.draft.shipIds.join(',')}:${route.draft.destinationSectorId}:${index}`} className={route.status==='rejected'?'is-rejected':''}><button type="button" aria-pressed={activeRoute===index} aria-label={`Edit route ${index+1}`} onClick={()=>editRoute(index)}>{activeRoute===index&&<span aria-hidden="true">✓ </span>}{index+1}. {from?.tileId??'Unknown'} → {to?.tileId??'Choose destination'} · {route.draft.shipIds.length} ship{route.draft.shipIds.length===1?'':'s'}</button>{route.message&&<small role="status">{route.message}</small>}<button type="button" disabled={disabled} onClick={()=>moveRoute(index,-1)} aria-label={`Move queued route ${index+1} earlier`}>↑</button><button type="button" disabled={disabled} onClick={()=>moveRoute(index,1)} aria-label={`Move queued route ${index+1} later`}>↓</button><button type="button" disabled={disabled} onClick={()=>removeRoute(index)}>Remove</button></div>;})}</section>}
  </div>
  <CommitBar className="dg-movement-confirm" summary={<>
    <ActionEconomy view={view} action="move" preview={commandPreview}/>
    {toll>0&&<p role="status">Transport · {toll} money to {[...recipients].map(id=>getFaction(view.seats.find(s=>s.id===id)!.faction).name).join(', ')}</p>}
    {!!commandPreview?.betrayedPartners.length&&<p className="dg-danger">Breaks diplomacy with {commandPreview.betrayedPartners.map(id=>{const partner=view.seats.find(seat=>seat.id===id);return partner?getFaction(partner.faction).name:id;}).join(', ')} · traitor {getFaction(own.faction).special?.ignoresTraitorPenalty?'0':'−2'} VP. Ambassadors return; no new relations while holding the card.</p>}
  </>}>
    {onDone&&!command?.moves.length&&!ids.length?<button className="sd-primary" type="button" disabled={disabled||draftGuard.stale} onClick={onDone}>Finish action</button>:<button className="sd-primary" type="button" aria-label={commitLabel(`Move fleet${command?.moves.length?` · ${command.moves.length} ${command.moves.length===1?'activation':'activations'}`:''}`)} disabled={disabled||draftGuard.stale||hasInvalidSelection||!command?.moves.length||routeMode&&execution.routes.some(route=>route.status==='rejected')} onClick={()=>{if(command&&!hasInvalidSelection){draftGuard.markSubmitted(command);onSubmit(command);}}}>{commitLabel('Move fleet')}</button>}
  </CommitBar>

 </section>;
}
