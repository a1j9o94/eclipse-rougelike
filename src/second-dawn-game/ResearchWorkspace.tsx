import {useCommitLabel} from './commitContext';
import {availableTechnologyMarket} from '../../shared/eclipse/scifiActions';
import {factionRulesMode} from '../../shared/eclipse/gameRules';
import {gameRules} from '../../shared/eclipse/gameRules';
import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import {tradeQuote} from '../../shared/eclipse/catalog';
import {fundingOptions} from '../../shared/eclipse/funding';
import {TradeResourceIcon} from './TradePanel';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import {TECHNOLOGIES,type TechnologyId,type Technology} from '../../shared/eclipse/technologies';
import {researchCostForSeat} from '../../shared/eclipse/minorSpecies';
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import GameDialog from './GameDialog';
import type {GameCommand,PlayerView,Track} from '../../shared/eclipse/types';
import {ChoiceCards} from './DecisionChoicePrimitives';
import FundingPlanSelector from './FundingPlanSelector';
import ActionEconomy from './ActionEconomy';
import {describeTechnology} from './itemDescriptions';
import ResearchCost,{ScienceBudget} from './ResearchCost';
import ResearchedTechnologies from './ResearchedTechnologies';
import TechnologyStats from './TechnologyStats';
import AdvancedPopulationPreview from './AdvancedPopulationPreview';
import {DEVELOPMENTS,developmentAvailable,quantumResearchCost} from '../../shared/eclipse/developments';
import {legalCommands} from '../../shared/eclipse/legal';
import ShrineWorkspace from './ShrineWorkspace';
import type {LegalCommandCandidate} from '../../shared/eclipse/legal';
import './researchWorkspace.css';

type Candidate={command:GameCommand;label:string;description:string};
type Draft=Candidate|null;
const tracks:Track[]=['military','grid','nano'];
const commandOf=(candidate:Candidate|undefined)=>candidate?.command.type==='trade-and-act'?candidate.command.action:candidate?.command;
const techIdOf=(candidate:Candidate|undefined)=>{const command=commandOf(candidate);return command?.type==='research'||command?.type==='quantum-research'?command.tileId:null;};
const humanize=(value:string)=>value.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());

interface PurchaseResearchProps {view:PlayerView;purchases:Candidate[];selected:TechnologyId|null;draft:Draft;disabled:boolean;stale:boolean;stillLegal:boolean;acquired:TechnologyId|null;onSelect:(id:TechnologyId,owned:boolean)=>void;onDraft:(draft:Draft)=>void;onSubmit:(command:GameCommand)=>void}
interface RewardResearchProps {mode:'reward';decisionId:string;technologyIds:readonly string[];view?:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void}

export default function ResearchWorkspace(props:PurchaseResearchProps|RewardResearchProps){
 return 'mode' in props?<RewardResearchWorkspace {...props}/>:<PurchaseResearchWorkspace {...props}/>;
}

function TechnologyContents({technology,view,price,children}:{technology:Technology;view?:PlayerView;price?:ReactNode;children?:ReactNode}){
 return <>{children}{price}<TechnologyStats technology={technology}/>{view&&<AdvancedPopulationPreview view={view} technology={technology}/>}</>;
}

function RewardResearchWorkspace({decisionId,technologyIds,view,candidates,disabled,onSubmit}:RewardResearchProps){
 const [selected,setSelected]=useState<string|null>(null);
 const [track,setTrack]=useState<Track|null>(null);
 const choices=candidates.flatMap(candidate=>candidate.command.type==='resolve'&&candidate.command.decisionId===decisionId&&candidate.command.choice.kind==='free-technology'?[candidate.command.choice]:[]);
 const options=choices.filter(choice=>choice.technologyId===selected);
 const tracks=[...new Set(options.map(choice=>choice.track))];
 const chosenTrack=track??(tracks.length===1?tracks[0]:null);
 const valid=selected!==null&&chosenTrack!==null&&tracks.includes(chosenTrack);
 const choose=(id:string)=>{
  const nextTracks=choices.filter(choice=>choice.technologyId===id).map(choice=>choice.track);
  setSelected(id);setTrack(current=>current&&nextTracks.includes(current)?current:nextTracks.length===1?nextTracks[0]:null);
 };
 return <section className="sd-workspace dg-research-workspace dg-research-reward" aria-label="Choose a free technology"><div className="dg-research-heading"><h2>Choose a free technology</h2><span className="dg-free-badge">FREE</span></div><div className="sd-tech-grid">{technologyIds.map(id=>{
  const technology=TECHNOLOGIES.find(item=>item.id===id);if(!technology)return null;
  const available=choices.some(choice=>choice.technologyId===id);
  return <article key={id} className={`dg-research-card${selected===id?' is-selected':''}`} aria-label={`${technology.name} technology`}><button type="button" className="sd-tech" aria-label={`Choose free ${technology.name}`} aria-pressed={selected===id} disabled={disabled} onClick={()=>choose(id)}><strong>{technology.name}</strong><TechnologyContents technology={technology} view={view}/>{!available&&<small>No eligible market copy or track space</small>}</button>{selected===id&&<section className="dg-research-local" aria-label={`Free ${technology.name}`}><p>{describeTechnology(technology)}</p>{!available&&<p role="alert">This technology no longer has an eligible market copy and track.</p>}{tracks.length>1?<ChoiceCards label="Research track" value={chosenTrack??''} disabled={disabled} onChange={value=>setTrack(value as Track)} options={tracks.map(value=>({value,label:humanize(value)}))}/>:tracks.length===1?<p>{humanize(tracks[0])} track · free</p>:null}{chosenTrack&&!tracks.includes(chosenTrack)&&<p role="alert">The selected {humanize(chosenTrack)} track is no longer available.{tracks.length===1&&<button type="button" onClick={()=>setTrack(tracks[0])}>Use {humanize(tracks[0])} track</button>}</p>}</section>}</article>;
 })}</div><button type="button" className="sd-primary" disabled={disabled||!valid} onClick={()=>{if(valid&&selected&&chosenTrack)onSubmit({type:'resolve',decisionId,choice:{kind:'free-technology',technologyId:selected,track:chosenTrack}});}}>Confirm free technology</button></section>;
}

function PurchaseResearchWorkspace({view,purchases,selected,draft,disabled,stale,stillLegal,acquired,onSelect,onDraft,onSubmit}:PurchaseResearchProps){
 const commitLabel=useCommitLabel();
 const detailRef=useRef<HTMLElement>(null);
 const [inspectedId,setInspectedId]=useState<TechnologyId|null>(null);
 const inspectedTech=TECHNOLOGIES.find(technology=>technology.id===inspectedId);
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const availableMarket=availableTechnologyMarket(view,seat.id);
 const owned=new Set(researchedTechnologyIds(seat));
 const shrineOptions=seat.faction==='lyra'?legalCommands(view).filter((candidate):candidate is Candidate&{command:Extract<GameCommand,{type:'place-shrine'}>}=>candidate.command.type==='place-shrine'):[];
 const canResearch=view.phase==='action'&&view.activeSeatId===seat.id&&!view.pendingDecision&&!view.waitingFor&&!seat.passed&&(view.actionProgress?view.actionProgress.owner===seat.id&&view.actionProgress.action==='research'&&view.actionProgress.remaining>0:seat.influenceOnTrack>0);
 const market=TECHNOLOGIES.filter(tech=>view.technologyMarket.includes(tech.id)).map(tech=>{
  const prices=tracks.flatMap(track=>{const cost=researchCostForSeat(tech.id,track,seat);return cost.ok?[cost]:[];}).sort((a,b)=>a.scienceCost-b.scienceCost||b.discount-a.discount);
  const costs=prices.map(price=>price.scienceCost);
  return {tech,costs,bestPrice:prices[0],sortCost:costs.length?Math.min(...costs):tech.baseCost};
 }).sort((a,b)=>a.sortCost-b.sortCost||a.tech.baseCost-b.tech.baseCost||a.tech.name.localeCompare(b.tech.name));
 const selectedTech=selected?TECHNOLOGIES.find(t=>t.id===selected):undefined;
 const draftId=techIdOf(draft??undefined) as TechnologyId|null;

 const options=selected? purchases.filter(candidate=>{const command=commandOf(candidate);return command?.type==='research'&&command.tileId===selected;}):[];
 const chosen=draftId===selected?commandOf(draft??undefined):undefined;
 const special=draft&&(draft.command.type==='place-shrine'||draft.command.type==='research-development')?draft:null;
 const specialPreview=special?previewCommand(view,special.command):null;
 const chosenCost=chosen?.type==='research'?researchCostForSeat(chosen.tileId as TechnologyId,chosen.track,seat):null;
 const preview=draft&&draftId===selected?previewCommand(view,draft.command):null;
 const scienceCost=chosen?.type==='quantum-research'?quantumResearchCost(seat,chosen.tileId as TechnologyId,chosen.track):chosenCost?.ok?chosenCost.scienceCost:null;
 const trackCosts=selected?tracks.flatMap(track=>{const cost=researchCostForSeat(selected,track,seat);return cost.ok?[cost.scienceCost]:[];}):[];
 const quantumOptions=selected?tracks.map(track=>({track,cost:quantumResearchCost(seat,selected,track)})).filter((option):option is {track:Track;cost:number}=>option.cost!==null):[];
 const hasPurchaseOption=options.length>0||purchases.some(candidate=>candidate.command.type==='quantum-research'&&candidate.command.tileId===selected);
 const unavailableReason=selectedTech?owned.has(selectedTech.id)?'Already researched. Inspect its active effect above.':!availableMarket.includes(selectedTech.id)?'No unreserved market copy remains. Choose another available technology.':view.pendingDecision?'Finish your pending decision before researching.':view.waitingFor?'Research is unavailable while another decision is being resolved.':view.activeSeatId!==seat.id?'Wait for your turn to research.':view.phase!=='action'?'Research is available during the action phase.':view.actionProgress&&view.actionProgress.action!=='research'?`Finish your current ${humanize(view.actionProgress.action)} action before researching.`:!view.actionProgress&&seat.influenceOnTrack<=0?'No influence disc is available to start a Research action.':trackCosts.length===0?'Every eligible research track for this technology is full.':!hasPurchaseOption&&seat.resources.science<Math.min(...trackCosts)?`Not enough science or convertible resources. This technology costs at least ${Math.min(...trackCosts)} science.`:!hasPurchaseOption?'No Research activation is available for this technology.':draft&&!stillLegal?draft.command.type==='trade-and-act'?'Your selected payment does not cover this purchase. Choose a payment below.':'This track or research activation is no longer available.':null:null;
 useLayoutEffect(()=>{if(!selected||!detailRef.current)return;detailRef.current.focus({preventScroll:true});},[selected]);
 const selectPurchase=(id:TechnologyId,preferredTrack?:Track)=>{
  const previous=commandOf(draft??undefined);
  const candidates=purchases.filter(candidate=>techIdOf(candidate)===id);
  const priorTrack=preferredTrack??(previous?.type==='research'||previous?.type==='quantum-research'?previous.track:undefined);
  const candidate=candidates.find(option=>{const action=commandOf(option);return (action?.type==='research'||action?.type==='quantum-research')&&action.type===previous?.type&&action.track===priorTrack;})??candidates.find(option=>{const action=commandOf(option);return (action?.type==='research'||action?.type==='quantum-research')&&action.track===priorTrack;})??candidates[0];
  onSelect(id,false);
  if(!candidate){onDraft(null);return;}
  const action=commandOf(candidate);
  if(previous?.type==='research'&&priorTrack&&TECHNOLOGIES.find(technology=>technology.id===id)?.track==='rare'&&action?.type==='research'&&action.track!==priorTrack){onDraft({...candidate,command:{type:'research',tileId:id,track:priorTrack}});return;}
  if(action?.type==='research'&&draft?.command.type==='trade-and-act'&&candidate.command.type==='trade-and-act'){
   const choices=fundingOptions(view,action);
   const priorTrades=draft.command.trades;
   const compatible=choices.find(option=>JSON.stringify(option.trades)===JSON.stringify(priorTrades))
    ??(priorTrades.length===1?choices.find(option=>option.trades.length===1&&option.trades[0].from===priorTrades[0].from):undefined);
   // Retain an incompatible payment visibly until the player changes it; never substitute another resource.
   onDraft({...candidate,command:compatible?.command??{type:'trade-and-act',action,trades:priorTrades}});
  }else onDraft(candidate);
 };
 const selectedPanel=!special&&selectedTech&&<section ref={detailRef} tabIndex={-1} className="dg-research-local" aria-label={`Research ${selectedTech.name}`}>
   {(owned.has(selectedTech.id)||!view.technologyMarket.includes(selectedTech.id))&&<header><div><p className="sd-eyebrow">SELECTED TECHNOLOGY</p><h2>{selectedTech.name}</h2></div><TechnologyStats technology={selectedTech}/></header>}
   {unavailableReason&&<p className="dg-research-blocker" role="alert">{unavailableReason}</p>}
   {selected!==null&&!owned.has(selected)&&(!draftId||draftId===selected)&&<>
    {gameRules(view).technologyVariant&&quantumOptions.length>0&&<div className="dg-research-commit"><p><strong>Quantum Labs</strong> can hold this technology outside a full track.</p>{quantumOptions.map(option=><button key={option.track} className="sd-primary" disabled={disabled||stale||!canResearch||seat.resources.science<option.cost||!view.technologyMarket.includes(selected)} aria-pressed={chosen?.type==='quantum-research'&&chosen.track===option.track} onClick={()=>onDraft({command:{type:'quantum-research',tileId:selected,track:option.track},label:`Research ${selectedTech.name} in Quantum Labs`,description:'Place in Quantum Labs instead of a research track.'})}>Use Quantum Labs · {option.cost} science · {humanize(option.track)}</button>)}</div>}
    {draft&&scienceCost!==null&&<div className="dg-research-commit">
     {draft.command.type==='trade-and-act'&&<p className="dg-research-conversion-summary"><strong>Convert these resources</strong><span>{draft.command.trades.map(trade=><span key={trade.from}><TradeResourceIcon resource={trade.from}/><b>{tradeQuote(seat.faction,trade.from,trade.to,trade.amount,factionRulesMode(view))?.input??0}</b><small>{trade.from}</small></span>)}</span></p>}
     {chosen?.type==='quantum-research'&&<p className="dg-research-track-summary">Place in <strong>Quantum Labs</strong> · {humanize(chosen.track)}</p>}
     {chosen?.type==='research'&&selectedTech.track==='rare'&&<p className="dg-research-track-summary">Research on the <strong>{humanize(chosen.track)}</strong> track</p>}
     {preview&&preview.moneyBalanceAfter<0&&<p className="dg-danger" role="alert">{Math.abs(preview.moneyBalanceAfter)} money short at upkeep after this action.</p>}
     <button className="sd-primary dg-research-buy" aria-label={commitLabel(`${draft.command.type==='trade-and-act'?'Convert & ':''}Research · ${scienceCost} science`)} disabled={disabled||stale||!stillLegal} onClick={()=>onSubmit(draft.command)}><span>{commitLabel(draft.command.type==='trade-and-act'?'Convert & research':'Research')}</span><span><TradeResourceIcon resource="science"/><strong>{scienceCost}</strong></span></button>
     <p className="dg-research-after"><strong>{preview?.resourcesAfter.science} science remaining</strong> after acquisition.</p>
     <button className="dg-research-cancel" onClick={()=>onDraft(null)}>Reset draft</button>{stale&&<p className="dg-danger">The game changed. Review this research choice before submitting again.</p>}
    </div>}
    {chosen?.type!=='quantum-research'&&options.length>1&&<ChoiceCards label="Research track" value={chosen?.type==='research'?chosen.track:''} disabled={disabled} onChange={track=>selected&&selectPurchase(selected,track as Track)} options={options.flatMap(candidate=>{const command=commandOf(candidate);return command?.type==='research'?[{value:command.track,label:humanize(command.track),description:`${seat.technologies[command.track].length} / 7 researched`}]:[];})}/>}
    {draft?.command.type==='trade-and-act'&&<details className="dg-research-options"><summary>Change conversion</summary><FundingPlanSelector view={view} command={draft.command} disabled={disabled} onChange={command=>onDraft({...draft,command})}/></details>}
    {draft&&<details className="dg-research-options"><summary>Action and upkeep details</summary><ActionEconomy view={view} action="research" preview={preview}/></details>}
   </>}
   <p className="dg-tech-effect">{describeTechnology(selectedTech)}</p><AdvancedPopulationPreview view={view} technology={selectedTech} detailed/>
  </section>;
 return <div className="sd-workspace dg-research-workspace">
  <p className="sd-eyebrow">AVAILABLE TECHNOLOGY</p>
  <div className="dg-research-heading"><h1>Research</h1><ScienceBudget available={seat.resources.science}/></div>
  {seat.faction==='lyra'&&<ShrineWorkspace view={view} candidates={shrineOptions} draft={draft} disabled={disabled||stale} onDraft={onDraft}/>}
  {acquired&&owned.has(acquired)&&<div className="dg-research-acquired" role="status"><strong>Acquired · {TECHNOLOGIES.find(t=>t.id===acquired)?.name}</strong><span>{describeTechnology(TECHNOLOGIES.find(t=>t.id===acquired)!)}</span></div>}

  {gameRules(view).technologyVariant&&<section className="dg-research-developments" aria-label="Developments"><h2>Developments</h2><p>These stay beside your research tracks.</p><div className="sd-tech-grid">{DEVELOPMENTS.map(development=>{const ownedDevelopment=seat.developments?.find(item=>item.id===development.id);return <article key={development.id} className="sd-tech-card"><h3>{development.name}</h3><p>{development.description}</p><p className="dg-development-price"><TradeResourceIcon resource={development.resource}/><strong> {development.cost}</strong></p>{ownedDevelopment?<small>{ownedDevelopment.technologyId?`Filled · ${TECHNOLOGIES.find(t=>t.id===ownedDevelopment.technologyId)?.name??ownedDevelopment.technologyId} · +1 VP`:'Acquired'}</small>:<button className="sd-primary" disabled={disabled||stale||!canResearch||seat.resources[development.resource]<development.cost||!developmentAvailable(view,development.id)} aria-pressed={special?.command.type==='research-development'&&special.command.developmentId===development.id} onClick={()=>onDraft({command:{type:'research-development',developmentId:development.id},label:`Acquire ${development.name} · ${development.cost} ${development.resource}`,description:development.description})}>Acquire</button>}</article>;})}</div></section>}
  {special&&<section className="dg-research-local" aria-label="Special research preview"><h2>{special.label}</h2><p>{special.description}</p>{specialPreview&&<div className="dg-research-conversion-summary">{(['money','science','materials'] as const).filter(resource=>seat.resources[resource]!==specialPreview.resourcesAfter[resource]).map(resource=><span key={resource}><TradeResourceIcon resource={resource}/>{seat.resources[resource]} → {specialPreview.resourcesAfter[resource]}</span>)}</div>}{!stillLegal&&<p role="alert">This placement or purchase is no longer available. Select another option.</p>}<button className="sd-primary" disabled={disabled||stale||!stillLegal} onClick={()=>onSubmit(special.command)}>{commitLabel(special.label)}</button><button onClick={()=>onDraft(null)}>Reset draft</button><details><summary>Action and upkeep details</summary><ActionEconomy view={view} action="research" preview={specialPreview}/></details></section>}
  {selectedTech&&(owned.has(selectedTech.id)||!view.technologyMarket.includes(selectedTech.id))&&selectedPanel}
  <h2 className="dg-market-heading">Available technologies</h2>
  <div className="sd-tech-grid">{['military','grid','nano','rare'].map(track=><section key={track}><h2>{humanize(track)}</h2>{market.filter(({tech})=>tech.track===track).map(({tech,costs,bestPrice})=>{const id=tech.id;
   const exactPrice=selected===id&&draftId===id&&chosenCost?.ok?chosenCost:null;
   const displayedPrice=exactPrice??bestPrice;
   const candidate=purchases.find(c=>techIdOf(c)===id);
   return <article className={`dg-research-card${selected===id&&!special?' is-selected':''}`} aria-label={`${tech.name} technology`} key={id}><button className="sd-tech" title={describeTechnology(tech)} aria-pressed={selected===id&&!special} key={id} onClick={()=>owned.has(id)?setInspectedId(id):selectPurchase(id)}><strong>{tech.name} ×{view.technologyMarket.filter(t=>t===id).length}</strong>{(view.technologyReservations??[]).filter(r=>r.tileId===id).map(r=><small key={r.owner}>1 copy reserved {r.owner===seat.id?'for you':'by a rival'} · expires next owner turn or round end</small>)}<ResearchCost cost={selected===id&&chosen?.type==='quantum-research'?scienceCost:displayedPrice?.scienceCost??null} available={seat.resources.science} owned={owned.has(id)} from={!exactPrice&&new Set(costs).size>1} pricing={{base:tech.baseCost,minimum:tech.minimumCost,discount:displayedPrice?.discount??null}}/><TechnologyContents technology={tech} view={view}/>{candidate?.command.type==='trade-and-act'&&<small className="dg-conversion-available">Conversion available</small>}</button>{selected===id&&!owned.has(id)&&selectedPanel}</article>;
  })}</section>)}</div>
  <ResearchedTechnologies view={view} seat={seat} defaultOpen={false}/>
  {inspectedTech&&<GameDialog title={inspectedTech.name} closeLabel="Close technology inspection" onClose={()=>setInspectedId(null)}><section aria-label={`Research ${inspectedTech.name}`}><TechnologyStats technology={inspectedTech}/><p>Already researched. Inspect its active effect above.</p><p>{describeTechnology(inspectedTech)}</p><AdvancedPopulationPreview view={view} technology={inspectedTech} detailed/></section></GameDialog>}
 </div>;
}
