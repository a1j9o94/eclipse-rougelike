import {continuesAction} from './actionCapacity';
import { useEffect, useMemo, useRef } from 'react';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { BASE_COMPONENTS, getFaction } from '../../shared/eclipse/catalog';
import { deriveBlueprintStats, type BlueprintShipType } from '../../shared/eclipse/blueprints';
import { describeWeapons } from './itemDescriptions';
import { fundingOptions } from '../../shared/eclipse/funding';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import { publicBlueprint } from '../../shared/eclipse/legal';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
import ShipSilhouette from './ShipSilhouette';
import { StatIcon } from './ShipPartStats';
import { TradeResourceIcon } from './TradePanel';
import FundingPlanSelector from './FundingPlanSelector';
import ActionEconomy from './ActionEconomy';
import ActionDraftNotice from './ActionDraftNotice';
import { addBuildItem, analyzeBuildOrder, BUILD_COMPONENTS, emptyBuildOrder, placeBuildItem, removeBuildItem, type BuildComponent, type BuildOrderDraft, type BuildPlacementPreview } from './buildPlanning';
import './buildPlanner.css';

export interface BuildPlannerProps { view: PlayerView; sectorId: string | null; defaultPlacementSectorId?: string | null; disabled: boolean; onClose: () => void; onSubmit: (command: GameCommand) => void; embedded?: boolean; placementRequest?: { sectorId: string; serial: number } | null; onPlacementPreview?: (preview: BuildPlacementPreview | null) => void; onLegalTargetsChange?: (targets: readonly string[]) => void }
const name = (type: BuildComponent) => type[0].toUpperCase() + type.slice(1);
const isShip = (type: BuildComponent): type is BlueprintShipType => !['orbital','monolith'].includes(type);

export default function BuildPlanner({ view, sectorId, defaultPlacementSectorId=null, disabled, onClose, onSubmit, embedded=false, placementRequest, onPlacementPreview, onLegalTargetsChange }: BuildPlannerProps) {
  const dialog=useRef<HTMLDialogElement>(null), handledPlacement=useRef<number|null>(null);
  const own=view.seats.find(seat=>seat.id===view.viewerSeatId);
  const [draft,setDraft]=useActionDraftState('buildOrder',emptyBuildOrder);
  const guard=useActionDraftGuard(), analysis=useMemo(()=>analyzeBuildOrder(view,draft),[view,draft]);
  const selected=draft.items.find(item=>item.id===draft.selectedItemId)??null;
  const targets=useMemo(()=>selected?analysis.legalSectorIdsByItem[selected.id]??[]:[],[analysis.legalSectorIdsByItem,selected]);
  useEffect(()=>{if(embedded)return;const node=dialog.current;if(!node)return;if(typeof node.showModal==='function')node.showModal();else node.setAttribute('open','');return()=>{if(node.open&&typeof node.close==='function')node.close();};},[embedded]);
  useEffect(()=>onLegalTargetsChange?.(targets),[onLegalTargetsChange,targets]);
  useEffect(()=>onPlacementPreview?.(selected?{itemId:selected.id,component:selected.component,sectorId:selected.sectorId,legalSectorIds:targets,items:draft.items,selectedItemId:selected.id}:null),[draft.items,onPlacementPreview,selected,targets]);
  useEffect(()=>{if(!placementRequest||handledPlacement.current===placementRequest.serial)return;handledPlacement.current=placementRequest.serial;if(selected&&targets.includes(placementRequest.sectorId))setDraft(current=>placeBuildItem(current,selected.id,placementRequest.sectorId));},[placementRequest,selected,setDraft,targets]);
  if(!own)return null;
  const faction=getFaction(own.faction), technologies=Object.values(own.technologies).flat(), total=draft.items.length, action=analysis.command;
  const plans=total&&analysis.unplacedCount===0?fundingOptions(view,action):[], funded=plans.find(plan=>JSON.stringify(plan.trades)===draft.fundingKey)??plans[0];
  const command:GameCommand=analysis.cost>own.resources.materials&&funded?funded.command:action;
  const turnReason=own.eliminated?'This civilization has been eliminated.':view.waitingFor||view.pendingDecision?'Resolve the pending decision first.':view.phase!=='action'||view.activeSeatId!==own.id?'Wait for your action turn.':view.actionProgress&&(!continuesAction(view,'build'))?'Finish your current action first.':!view.actionProgress&&own.influenceOnTrack<1?'No influence discs remain.':analysis.limit<1?'No Build activations remain.':null;
  const valid=total>0&&!turnReason&&analysis.issues.length===0&&(analysis.cost<=own.resources.materials||!!funded), preview=valid?previewCommand(view,command):null;
  const componentReason=(type:BuildComponent):string|null=>{
    if(isShip(type)&&getFaction(own.faction).componentSupply?.[type]===0)return `${getFaction(own.faction).name} does not build ${name(type)}s.`;
    if(['starbase','orbital','monolith'].includes(type)&&!technologies.includes(type))return `Research ${name(type)} first.`;
    const sample={...draft,items:[...draft.items,{id:'candidate',component:type,sectorId:null}]} as BuildOrderDraft;
    if(analyzeBuildOrder(view,sample).legalSectorIdsByItem.candidate.length===0)return type==='orbital'||type==='monolith'?`No sector can hold another ${type}.`:`All ${type}s are deployed.`;
    return total>=analysis.limit?'Build activation limit reached.':null;
  };
  const content=<>
    <header className="dg-build-header"><div><small>SHIPYARD · ORDER THEN DEPLOY</small><h2 id="build-planner-title">Assemble your build order</h2></div><button type="button" aria-label="Close build planner" onClick={onClose}>×</button></header>
    <div className="dg-build-body"><main className="dg-build-workspace"><ActionDraftNotice/>
      <section aria-labelledby="build-capabilities"><h3 id="build-capabilities">1. Choose pieces</h3><div className="dg-build-cards">{BUILD_COMPONENTS.map(type=>{
        const reason=componentReason(type), blueprint=isShip(type)?own.blueprints.find(candidate=>candidate.shipType===type):null, stats=blueprint&&isShip(type)?deriveBlueprintStats(own.faction,publicBlueprint(blueprint)):null;
        const remaining=isShip(type)?Math.max(0,BASE_COMPONENTS.perColor[type]-view.ships.filter(ship=>ship.owner===own.id&&ship.type===type).length-draft.items.filter(item=>item.component===type).length):null;
        return <article key={type} className={`dg-build-card${reason?' dg-build-unavailable':''}`} aria-label={name(type)}><div className="dg-build-piece">{isShip(type)?<ShipSilhouette type={type} faction={own.faction}/>:<StatIcon kind={type==='orbital'?'portal':'structure'}/>}</div><h4>{name(type)}</h4><span className="dg-build-price"><TradeResourceIcon resource="materials"/>{faction.constructionCosts[type]}</span>{stats?<small className="dg-build-capability">Hull {stats.hull+1} · move {stats.movement}<br/>initiative {stats.initiative} · computer +{stats.computer} · shield −{stats.shield}<br/>{describeWeapons(stats)} · {remaining} in supply</small>:<small className="dg-build-capability">{type==='orbital'?'Adds a money / science population space':'Worth 3 victory points'}</small>}<button type="button" aria-label={`Add ${type}`} title={reason??`Add ${type} to order`} disabled={disabled||!!turnReason||!!reason} onClick={()=>setDraft(current=>{const added=addBuildItem(current,type),item=added.items.at(-1);if(!item||!defaultPlacementSectorId)return added;const next=analyzeBuildOrder(view,added);return next.legalSectorIdsByItem[item.id]?.includes(defaultPlacementSectorId)?placeBuildItem(added,item.id,defaultPlacementSectorId):added;})}>Add to order</button>{reason&&<small className="dg-build-reason">{reason}</small>}</article>;
      })}</div></section>
      <section className="dg-build-deployment" aria-labelledby="build-deploy"><h3 id="build-deploy">2. Place every piece</h3>{draft.items.length===0?<p className="dg-build-empty">Your tray is empty. Add a ship or structure above.</p>:<div className="dg-build-tray" aria-label="Build order tray">{draft.items.map((item,index)=><article key={item.id} className={item.id===selected?.id?'is-selected':''}><button type="button" className="dg-build-order-piece" aria-pressed={item.id===selected?.id} onClick={()=>setDraft(current=>({...current,selectedItemId:item.id}))}><b>{index+1}. {name(item.component)}</b><span>{item.sectorId?`Sector ${view.sectors.find(sector=>sector.id===item.sectorId)?.tileId??item.sectorId}`:'Unplaced'}</span></button><button type="button" aria-label={`Remove ${item.component} from order`} onClick={()=>setDraft(current=>removeBuildItem(current,item.id))}>×</button></article>)}</div>}
      {selected&&<div className="dg-build-targets"><p>Place <strong>{name(selected.component)}</strong>{sectorId&&!selected.sectorId?` — Build here suggests sector ${view.sectors.find(sector=>sector.id===sectorId)?.tileId??sectorId}`:''}. Choose a map hex or a sector below.</p><div>{view.sectors.filter(sector=>targets.includes(sector.id)).map(sector=><button key={sector.id} type="button" aria-label={`Place ${selected.component} in sector ${sector.tileId}`} className={selected.sectorId===sector.id?'is-selected':''} onClick={()=>setDraft(current=>placeBuildItem(current,selected.id,sector.id))}>Sector {sector.tileId}</button>)}</div>{selected.sectorId&&<button type="button" onClick={()=>setDraft(current=>placeBuildItem(current,selected.id,null))}>Return to tray</button>}</div>}</section>
    </main><aside className="dg-build-summary" aria-label="Build price and funding"><div className="dg-build-total"><span>Total materials</span><strong><TradeResourceIcon resource="materials"/>{analysis.cost}</strong><small>{total} / {analysis.limit} pieces · {analysis.placedCount} placed · {analysis.unplacedCount} unplaced</small></div>{turnReason&&<p role="status">{turnReason}</p>}{!turnReason&&analysis.issues.map(issue=><p role="status" key={issue}>{issue}</p>)}{total>0&&analysis.cost>own.resources.materials&&funded&&<FundingPlanSelector view={view} command={funded.command} disabled={disabled} onChange={choice=>setDraft(current=>({...current,fundingKey:JSON.stringify(choice.trades)}))}/>}<ActionEconomy view={view} action="build" preview={preview}/></aside></div>
    <footer className="dg-build-footer"><span>{valid?`${total} ${total===1?'piece':'pieces'} ready · ${new Set(action.builds.map(build=>build.sectorId)).size} deployment ${new Set(action.builds.map(build=>build.sectorId)).size===1?'sector':'sectors'}`:analysis.unplacedCount?`${analysis.unplacedCount} ${analysis.unplacedCount===1?'piece still needs':'pieces still need'} a sector`:'Review the order before building.'}</span><button type="button" onClick={onClose}>Cancel</button><button type="button" className="sd-primary" disabled={disabled||guard.stale||!valid} onClick={()=>{if(!disabled&&!guard.stale&&valid){guard.markSubmitted(command);onSubmit(command);}}}>{command.type==='trade-and-act'?'Convert & ':''}Build {total} {draft.items.every(item=>isShip(item.component))?(total===1?'ship':'ships'):(total===1?'piece':'pieces')} · {analysis.cost} materials</button></footer>
  </>;
  return embedded?<section className="dg-build-planner is-embedded" aria-labelledby="build-planner-title">{content}</section>:<dialog ref={dialog} className="dg-build-dialog" aria-labelledby="build-planner-title" onCancel={event=>{event.preventDefault();onClose();}}>{content}</dialog>;
}
