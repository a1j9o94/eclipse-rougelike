import {CommitContext,useCommitLabel} from './commitContext';
import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import {constructionCostForSeat} from '../../shared/eclipse/minorSpecies';
import {continuesAction} from './actionCapacity';
import { useEffect, useMemo, useRef, useState, useContext } from 'react';
import CommitBar from './CommitBar';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { BASE_COMPONENTS, getFaction } from '../../shared/eclipse/catalog';
import { deriveBlueprintStats,effectiveBlueprintParts, type BlueprintShipType } from '../../shared/eclipse/blueprints';
import {getShipPart} from '../../shared/eclipse/parts';
import { describeWeapons } from './itemDescriptions';
import { fundingOptions } from '../../shared/eclipse/funding';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import { publicBlueprint } from '../../shared/eclipse/legal';
import type { FundingTrade, GameCommand, PlayerView } from '../../shared/eclipse/types';
import {ShipCapabilities} from './BlueprintLoadout';
import BuildPieceSilhouette from './BuildPieceSilhouette';
import { TradeResourceIcon } from './TradePanel';
import FundingPlanSelector from './FundingPlanSelector';
import ActionEconomy from './ActionEconomy';
import ActionDraftNotice from './ActionDraftNotice';
import { addBuildItem, analyzeBuildOrder, BUILD_COMPONENTS, emptyBuildOrder, placeBuildItem, removeBuildItem, type BuildComponent, type BuildOrderDraft, type BuildPlacementPreview } from './buildPlanning';
import './buildPlanner.css';

export interface BuildPlannerProps { view: PlayerView; sectorId: string | null; defaultPlacementSectorId?: string | null; disabled: boolean; onClose: () => void; onSubmit: (command: GameCommand) => void; embedded?: boolean; compact?: boolean; onStageChange?: (stage:'catalog'|'placement')=>void; placementRequest?: { sectorId: string; serial: number } | null; onPlacementPreview?: (preview: BuildPlacementPreview | null) => void; onLegalTargetsChange?: (targets: readonly string[]) => void }
const name = (type: BuildComponent) => type[0].toUpperCase() + type.slice(1);
const isShip = (type: BuildComponent): type is BlueprintShipType => !['orbital','monolith'].includes(type);
function retainedBuildFunding(key: string, action: Extract<GameCommand,{type:'build'}>): Extract<GameCommand,{type:'trade-and-act'}> | null {
  if(!key)return null;
  try {
    const trades: unknown=JSON.parse(key);
    if(!Array.isArray(trades)||trades.length<1||trades.length>2)return null;
    if(!trades.every((trade):trade is FundingTrade=>typeof trade==='object'&&trade!==null&&Object.keys(trade).every(key=>['from','to','amount'].includes(key))&&(trade.from==='money'||trade.from==='science')&&trade.to==='materials'&&Number.isSafeInteger(trade.amount)&&trade.amount>0&&trade.amount<=1000))return null;
    if(new Set(trades.map(trade=>trade.from)).size!==trades.length)return null;
    return {type:'trade-and-act',trades,action};
  } catch { return null; }
}

export default function BuildPlanner({ view, defaultPlacementSectorId=null, disabled, onClose, onSubmit, embedded=false, compact=false, onStageChange, placementRequest, onPlacementPreview, onLegalTargetsChange }: BuildPlannerProps) {
  const commitLabel=useCommitLabel();
  const queuedCommit=useContext(CommitContext);
  const dialog=useRef<HTMLDialogElement>(null), handledPlacement=useRef<number|null>(null);
  const own=view.seats.find(seat=>seat.id===view.viewerSeatId);
  const [draft,setDraft]=useActionDraftState('buildOrder',emptyBuildOrder);
  const [catalogOpen,setCatalogOpen]=useState(false);
  const stage=!draft.items.length||catalogOpen?'catalog':'placement';
  useEffect(()=>onStageChange?.(stage),[onStageChange,stage]);
  const guard=useActionDraftGuard(), analysis=useMemo(()=>analyzeBuildOrder(view,draft),[view,draft]);
  const selected=draft.items.find(item=>item.id===draft.selectedItemId)??null;
  const targets=useMemo(()=>selected?analysis.legalSectorIdsByItem[selected.id]??[]:[],[analysis.legalSectorIdsByItem,selected]);
  useEffect(()=>{if(embedded)return;const node=dialog.current;if(!node)return;if(typeof node.showModal==='function')node.showModal();else node.setAttribute('open','');return()=>{if(node.open&&typeof node.close==='function')node.close();};},[embedded]);
  useEffect(()=>onLegalTargetsChange?.(targets),[onLegalTargetsChange,targets]);
  useEffect(()=>onPlacementPreview?.(selected?{itemId:selected.id,component:selected.component,sectorId:selected.sectorId,legalSectorIds:targets,items:draft.items,selectedItemId:selected.id}:null),[draft.items,onPlacementPreview,selected,targets]);
  useEffect(()=>{if(!placementRequest||handledPlacement.current===placementRequest.serial)return;handledPlacement.current=placementRequest.serial;if(selected&&targets.includes(placementRequest.sectorId))setDraft(current=>placeBuildItem(current,selected.id,placementRequest.sectorId));},[placementRequest,selected,setDraft,targets]);
  if(!own)return null;
  const technologies: readonly string[]=researchedTechnologyIds(own), total=draft.items.length, action=analysis.command;
  const plans=total&&analysis.unplacedCount===0?fundingOptions(view,action):[], funded=draft.fundingKey?plans.find(plan=>JSON.stringify(plan.trades)===draft.fundingKey):plans[0];
  const retainedFunding=funded?null:retainedBuildFunding(draft.fundingKey,action);
  const command:GameCommand=analysis.cost>own.resources.materials&&funded?funded.command:action;
  const turnReason=own.eliminated?'This civilization has been eliminated.':view.waitingFor||view.pendingDecision?'Resolve the pending decision first.':view.phase!=='action'||view.activeSeatId!==own.id?'Wait for your action turn.':view.actionProgress&&(!continuesAction(view,'build'))?'Finish your current action first.':!view.actionProgress&&own.influenceOnTrack<1?'No influence discs remain.':analysis.limit<1?'No Build activations remain.':null;
  const valid=total>0&&!turnReason&&analysis.issues.length===0&&(analysis.cost<=own.resources.materials||!!funded), preview=valid?previewCommand(view,command):null;
  const componentReason=(type:BuildComponent):string|null=>{
    if(type==='starbase'&&getFaction(own.faction).special?.cannotBuildStarbases)return `${getFaction(own.faction).name} cannot build Starbases.`;
    if(isShip(type)&&getFaction(own.faction).componentSupply?.[type]===0)return `${getFaction(own.faction).name} does not build ${name(type)}s.`;
    if(['starbase','orbital','monolith'].includes(type)&&!technologies.includes(type))return `Research ${name(type)} first.`;
    const sample={...draft,items:[...draft.items,{id:'candidate',component:type,sectorId:null}]} as BuildOrderDraft;
    if(analyzeBuildOrder(view,sample).legalSectorIdsByItem.candidate.length===0)return type==='orbital'||type==='monolith'?`No sector can hold another ${type}.`:`All ${type}s are deployed.`;
    return total>=analysis.limit?'Build activation limit reached.':null;
  };
  const addPiece=(type:BuildComponent)=>{setDraft(current=>{const added=addBuildItem(current,type),item=added.items.at(-1);if(!item||!defaultPlacementSectorId)return added;const next=analyzeBuildOrder(view,added);return next.legalSectorIdsByItem[item.id]?.includes(defaultPlacementSectorId)?placeBuildItem(added,item.id,defaultPlacementSectorId):added;});setCatalogOpen(false);};
  const confirmBuild=()=>{if(!disabled&&!guard.stale&&valid){guard.markSubmitted(command);onSubmit(command);}};
  const content=<>
    {embedded?<h2 id="build-planner-title" className="dg-build-accessible-title">Assemble your build order</h2>:<header className="dg-build-header"><h2 id="build-planner-title">Assemble your build order</h2><button type="button" aria-label="Close build planner" onClick={onClose}>Close</button></header>}
    <section className="dg-build-order" aria-label="Current build order">{draft.items.length===0?<span className="dg-build-empty">Add a piece</span>:<div className="dg-build-tray" aria-label="Build order tray">{draft.items.map((item,index)=><article key={item.id} className={item.id===selected?.id?'is-selected':''}><button type="button" className="dg-build-order-piece" aria-pressed={item.id===selected?.id} onClick={()=>{setDraft(current=>({...current,selectedItemId:item.id}));setCatalogOpen(false);}}><b>{item.id===selected?.id&&<span aria-hidden="true">✓ </span>}{index+1}. {name(item.component)}</b><span>{item.sectorId&&!analysis.legalSectorIdsByItem[item.id]?.includes(item.sectorId)?'Choose another sector':item.sectorId?`Sector ${view.sectors.find(sector=>sector.id===item.sectorId)?.tileId??item.sectorId}`:'Needs a sector'}</span></button><button type="button" aria-label={`Remove ${item.component} from order`} onClick={()=>setDraft(current=>removeBuildItem(current,item.id))}>×</button></article>)}</div>}{total>0&&compact&&<button type="button" aria-expanded={stage==='catalog'} onClick={()=>setCatalogOpen(open=>!open)}>{stage==='catalog'?'Return to placement':'Add piece'}</button>}</section>
    <div className="dg-build-body"><div className="dg-build-workspace"><ActionDraftNotice/>{!embedded&&total===0&&turnReason&&<p role="status">{turnReason}</p>}
      {selected&&(!compact||stage==='placement')&&<div className="dg-build-targets"><details open={embedded?undefined:true}><summary>Choose from sector list</summary><div>{view.sectors.filter(sector=>targets.includes(sector.id)).map(sector=><button key={sector.id} type="button" aria-label={`Place ${selected.component} in sector ${sector.tileId}`} className={selected.sectorId===sector.id?'is-selected':''} onClick={()=>setDraft(current=>placeBuildItem(current,selected.id,sector.id))}>Sector {sector.tileId}</button>)}</div></details>{selected.sectorId&&<button type="button" onClick={()=>setDraft(current=>placeBuildItem(current,selected.id,null))}>Return to tray</button>}</div>}
      {(!compact||stage==='catalog')&&<section aria-labelledby="build-capabilities"><h3 id="build-capabilities">Choose pieces</h3><div className="dg-build-cards">{BUILD_COMPONENTS.filter(type=>!(own.faction==='exiles'&&type==='starbase')).map(type=>{
        const reason=componentReason(type), blueprint=isShip(type)?own.blueprints.find(candidate=>candidate.shipType===type):null, orbitalBlueprint=type==='orbital'&&own.faction==='exiles'?own.blueprints.find(candidate=>candidate.shipType==='starbase'):null, stats=(blueprint||orbitalBlueprint)?deriveBlueprintStats(own.faction,publicBlueprint((blueprint||orbitalBlueprint)!)):null;
        const remaining=isShip(type)?Math.max(0,(getFaction(own.faction).componentSupply?.[type]??BASE_COMPONENTS.perColor[type])-view.ships.filter(ship=>ship.owner===own.id&&ship.type===type).length-draft.items.filter(item=>item.component===type).length):null;
        return <article key={type} className={`dg-build-card${reason?' dg-build-unavailable':''}`} aria-label={name(type)}><div className="dg-build-piece"><BuildPieceSilhouette component={type} faction={own.faction}/></div><h4>{name(type)}</h4><span className="dg-build-price"><TradeResourceIcon resource="materials"/>{constructionCostForSeat(own,type)}</span>{orbitalBlueprint&&<small className="dg-build-capability">Adds a Money / Science population space. Colonize it to activate its defending ship.<br/>Orbital blueprint: {effectiveBlueprintParts(own.faction,publicBlueprint(orbitalBlueprint)).filter((part):part is NonNullable<typeof part>=>part!==null).map(part=>getShipPart(part).name).join(' · ')}.</small>}{stats?<><details className="dg-build-capabilities"><summary aria-label={`Inspect ${name(type)} capabilities`}><ShipCapabilities stats={stats} showEnergy={false} showWeapons omitZero/></summary><p>{stats.hull+1} damage to destroy · {stats.movement} {stats.movement===1?'sector':'sectors'} per activation. Initiative {stats.initiative} · {describeWeapons(stats)}.</p></details>{remaining!==null&&<small className="dg-build-supply">{remaining} in supply</small>}</>:<small className="dg-build-capability">{type==='orbital'?'Adds a money / science population space':'Worth 3 victory points'}</small>}<button type="button" aria-label={`Add ${type}`} title={reason??`Add ${type} to order`} disabled={disabled||!!turnReason||!!reason} onClick={()=>addPiece(type)}>Add to order</button>{reason&&<small className="dg-build-reason">{reason}</small>}</article>;
      })}</div></section>}

    </div>{total>0&&<aside className="dg-build-summary" aria-label="Build funding">{turnReason&&<p role="status">{turnReason}</p>}{analysis.unplacedCount===0&&analysis.cost>own.resources.materials&&!funded&&<p role="status">{draft.fundingKey?(plans.length?'Your selected payment is no longer available. Choose a payment below.':'Your selected payment is no longer available. Change the order or restore enough resources.'):'Not enough materials or convertible resources for this order.'}</p>}{total>analysis.limit&&<p role="status">Remove {total-analysis.limit} {total-analysis.limit===1?'piece':'pieces'} · {analysis.limit} Build activations available.</p>}{analysis.unplacedCount===0&&analysis.cost>own.resources.materials&&(plans.length>0||retainedFunding)&&<FundingPlanSelector view={view} selected={!!funded||!!retainedFunding} command={retainedFunding??(funded??plans[0]).command} disabled={disabled} onChange={choice=>setDraft(current=>({...current,fundingKey:JSON.stringify(choice.trades)}))}/>}</aside>}</div>
    {total>0&&<CommitBar className="dg-build-footer" summary={preview?<ActionEconomy view={view} action="build" preview={preview} omitResources={['materials']}/>:undefined}><button type="button" className="sd-primary" data-queued={queuedCommit} disabled={disabled||guard.stale||!valid} aria-label={commitLabel(`${command.type==='trade-and-act'?'Convert & ':''}Build ${total} ${draft.items.every(item=>isShip(item.component))?(total===1?'ship':'ships'):(total===1?'piece':'pieces')} · ${analysis.cost} materials`)} onClick={confirmBuild}>{commitLabel(`${command.type==='trade-and-act'?'Convert & ':''}Build ${total} ${draft.items.every(item=>isShip(item.component))?(total===1?'ship':'ships'):(total===1?'piece':'pieces')}`)} · <span className="dg-build-commit-price"><TradeResourceIcon resource="materials"/>{analysis.cost}</span></button></CommitBar>}

  </>;
  return embedded?<section className="dg-build-planner is-embedded" data-build-stage={stage} aria-labelledby="build-planner-title">{content}</section>:<dialog ref={dialog} className="dg-build-dialog" aria-labelledby="build-planner-title" onCancel={event=>{event.preventDefault();onClose();}}>{content}</dialog>;
}
