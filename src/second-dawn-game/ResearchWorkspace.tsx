import {factionRulesMode} from '../../shared/eclipse/gameRules';
import {gameRules} from '../../shared/eclipse/gameRules';
import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import {tradeQuote} from '../../shared/eclipse/catalog';
import {TradeResourceIcon} from './TradePanel';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import {TECHNOLOGIES,type TechnologyId} from '../../shared/eclipse/technologies';
import {researchCostForSeat} from '../../shared/eclipse/minorSpecies';
import {useLayoutEffect,useRef} from 'react';
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
import './researchWorkspace.css';

type Candidate={command:GameCommand;label:string;description:string};
type Draft=Candidate|null;
const tracks:Track[]=['military','grid','nano'];
const commandOf=(candidate:Candidate|undefined)=>candidate?.command.type==='trade-and-act'?candidate.command.action:candidate?.command;
const techIdOf=(candidate:Candidate|undefined)=>{const command=commandOf(candidate);return command?.type==='research'?command.tileId:null;};
const humanize=(value:string)=>value.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());

export default function ResearchWorkspace({view,purchases,selected,draft,disabled,stale,stillLegal,acquired,onSelect,onDraft,onSubmit}:{view:PlayerView;purchases:Candidate[];selected:TechnologyId|null;draft:Draft;disabled:boolean;stale:boolean;stillLegal:boolean;acquired:TechnologyId|null;onSelect:(id:TechnologyId,owned:boolean)=>void;onDraft:(draft:Draft)=>void;onSubmit:(command:GameCommand)=>void}){
 const detailRef=useRef<HTMLElement>(null);
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const owned=new Set(researchedTechnologyIds(seat));
 const canResearch=view.phase==='action'&&view.activeSeatId===seat.id&&!view.pendingDecision&&!view.waitingFor&&!seat.passed&&(view.actionProgress?view.actionProgress.owner===seat.id&&view.actionProgress.action==='research'&&view.actionProgress.remaining>0:seat.influenceOnTrack>0);
 const market=TECHNOLOGIES.filter(tech=>view.technologyMarket.includes(tech.id)).map(tech=>{
  const prices=tracks.flatMap(track=>{const cost=researchCostForSeat(tech.id,track,seat);return cost.ok?[cost]:[];}).sort((a,b)=>a.scienceCost-b.scienceCost||b.discount-a.discount);
  const costs=prices.map(price=>price.scienceCost);
  return {tech,costs,bestPrice:prices[0],sortCost:costs.length?Math.min(...costs):tech.baseCost};
 }).sort((a,b)=>a.sortCost-b.sortCost||a.tech.baseCost-b.tech.baseCost||a.tech.name.localeCompare(b.tech.name));
 const selectedTech=selected?TECHNOLOGIES.find(t=>t.id===selected):undefined;
 const draftId=techIdOf(draft??undefined) as TechnologyId|null;
 const purchaseTech=draftId?TECHNOLOGIES.find(t=>t.id===draftId):undefined;
 const options=selected? purchases.filter(candidate=>{const command=commandOf(candidate);return command?.type==='research'&&command.tileId===selected;}):[];
 const chosen=commandOf(draft??undefined);
 const chosenCost=chosen?.type==='research'?researchCostForSeat(chosen.tileId as TechnologyId,chosen.track,seat):null;
 const preview=draft?previewCommand(view,draft.command):null;
 const scienceCost=chosenCost?.ok?chosenCost.scienceCost:null;
 const trackCosts=selected?tracks.flatMap(track=>{const cost=researchCostForSeat(selected,track,seat);return cost.ok?[cost.scienceCost]:[];}):[];
 const quantumOptions=selected?tracks.map(track=>({track,cost:quantumResearchCost(seat,selected,track)})).filter((option):option is {track:Track;cost:number}=>option.cost!==null):[];
 const unavailableReason=selectedTech?owned.has(selectedTech.id)?'Already researched. Inspect its active effect above.':!view.technologyMarket.includes(selectedTech.id)?'No market copy remains. Choose another available technology.':view.pendingDecision?'Finish your pending decision before researching.':view.waitingFor?'Research is unavailable while another decision is being resolved.':view.activeSeatId!==seat.id?'Wait for your turn to research.':view.phase!=='action'?'Research is available during the action phase.':view.actionProgress&&view.actionProgress.action!=='research'?`Finish your current ${humanize(view.actionProgress.action)} action before researching.`:!view.actionProgress&&seat.influenceOnTrack<=0?'No influence disc is available to start a Research action.':trackCosts.length===0?'Every eligible research track for this technology is full.':options.length===0&&seat.resources.science<Math.min(...trackCosts)?`Not enough science or convertible resources. This technology costs at least ${Math.min(...trackCosts)} science.`:options.length===0?'No Research activation is available for this technology.':draft&&!stillLegal?'This research draft is no longer legal. Review the market, track, and funding choices.':null:null;
 useLayoutEffect(()=>{if(!selected||!detailRef.current)return;detailRef.current.focus({preventScroll:true});},[selected]);
 const selectedPanel=selectedTech&&<section ref={detailRef} tabIndex={-1} className="dg-research-local" aria-label={`Research ${selectedTech.name}`}>
   {(owned.has(selectedTech.id)||!view.technologyMarket.includes(selectedTech.id))&&<header><div><p className="sd-eyebrow">SELECTED TECHNOLOGY</p><h2>{selectedTech.name}</h2></div><TechnologyStats technology={selectedTech}/></header>}
   {unavailableReason&&<p className="dg-research-blocker" role="alert">{unavailableReason}</p>}
   {draftId&&draftId!==selected&&purchaseTech&&<div className="dg-research-draft-choice"><p>Your {purchaseTech.name} draft is still saved.</p><button onClick={()=>onSelect(draftId,false)}>Return to {purchaseTech.name} draft</button>{options[0]&&<button onClick={()=>onDraft(options[0])}>Research {selectedTech.name} instead</button>}<button onClick={()=>onDraft(null)}>Cancel saved draft</button></div>}
   {selected!==null&&!owned.has(selected)&&(!draftId||draftId===selected)&&<>
    {gameRules(view).technologyVariant&&quantumOptions.length>0&&<div className="dg-research-commit"><p><strong>Quantum Labs</strong> can hold this technology outside a full track.</p>{quantumOptions.map(option=><button key={option.track} className="sd-primary" disabled={disabled||stale||!canResearch||seat.resources.science<option.cost||!view.technologyMarket.includes(selected)} onClick={()=>onSubmit({type:'quantum-research',tileId:selected,track:option.track})}>Use Quantum Labs · {option.cost} science · {humanize(option.track)}</button>)}</div>}
    {draft&&scienceCost!==null&&<div className="dg-research-commit">
     {draft.command.type==='trade-and-act'&&<p className="dg-research-conversion-summary"><strong>Convert these resources</strong><span>{draft.command.trades.map(trade=><span key={trade.from}><TradeResourceIcon resource={trade.from}/><b>{tradeQuote(seat.faction,trade.from,trade.to,trade.amount,factionRulesMode(view))?.input??0}</b><small>{trade.from}</small></span>)}</span></p>}
     {chosen?.type==='research'&&selectedTech.track==='rare'&&<p className="dg-research-track-summary">Research on the <strong>{humanize(chosen.track)}</strong> track</p>}
     {preview&&preview.moneyBalanceAfter<0&&<p className="dg-danger" role="alert">{Math.abs(preview.moneyBalanceAfter)} money short at upkeep after this action.</p>}
     <button className="sd-primary dg-research-buy" aria-label={`${draft.command.type==='trade-and-act'?'Convert & ':''}Research · ${scienceCost} science`} disabled={disabled||stale||!stillLegal} onClick={()=>onSubmit(draft.command)}><span>{draft.command.type==='trade-and-act'?'Convert & research':'Research'}</span><span><TradeResourceIcon resource="science"/><strong>{scienceCost}</strong></span></button>
     <p className="dg-research-after"><strong>{preview?.resourcesAfter.science} science remaining</strong> after acquisition.</p>
     <button className="dg-research-cancel" onClick={()=>onDraft(null)}>Cancel draft</button>{stale&&<p className="dg-danger">The game changed. Review this research choice before submitting again.</p>}
    </div>}
    {options.length>1&&<ChoiceCards label="Research track" value={chosen?.type==='research'?chosen.track:''} disabled={disabled} onChange={track=>onDraft(options.find(candidate=>{const command=commandOf(candidate);return command?.type==='research'&&command.track===track;})??null)} options={options.flatMap(candidate=>{const command=commandOf(candidate);return command?.type==='research'?[{value:command.track,label:humanize(command.track),description:`${seat.technologies[command.track].length} / 7 researched`}]:[];})}/>}
    {draft?.command.type==='trade-and-act'&&<details className="dg-research-options"><summary>Change conversion</summary><FundingPlanSelector view={view} command={draft.command} disabled={disabled} onChange={command=>onDraft({...draft,command})}/></details>}
    {draft&&<details className="dg-research-options"><summary>Action and upkeep details</summary><ActionEconomy view={view} action="research" preview={preview}/></details>}
   </>}
   <p className="dg-tech-effect">{describeTechnology(selectedTech)}</p><AdvancedPopulationPreview view={view} technology={selectedTech} detailed/>
  </section>;
 return <div className="sd-workspace dg-research-workspace">
  <p className="sd-eyebrow">AVAILABLE TECHNOLOGY</p>
  <div className="dg-research-heading"><h1>Research</h1><ScienceBudget available={seat.resources.science}/></div>
  {acquired&&owned.has(acquired)&&<div className="dg-research-acquired" role="status"><strong>Acquired · {TECHNOLOGIES.find(t=>t.id===acquired)?.name}</strong><span>{describeTechnology(TECHNOLOGIES.find(t=>t.id===acquired)!)}</span></div>}
  <ResearchedTechnologies view={view} selectedId={selected} seat={seat} onInspect={id=>onSelect(id,true)}/>
  {gameRules(view).technologyVariant&&<section className="dg-research-developments" aria-label="Developments"><h2>Developments</h2><p>These stay beside your research tracks.</p><div className="sd-tech-grid">{DEVELOPMENTS.map(development=>{const ownedDevelopment=seat.developments?.find(item=>item.id===development.id);return <article key={development.id} className="sd-tech-card"><h3>{development.name}</h3><p>{development.description}</p><p className="dg-development-price"><TradeResourceIcon resource={development.resource}/><strong> {development.cost}</strong></p>{ownedDevelopment?<small>{ownedDevelopment.technologyId?`Filled · ${TECHNOLOGIES.find(t=>t.id===ownedDevelopment.technologyId)?.name??ownedDevelopment.technologyId} · +1 VP`:'Acquired'}</small>:<button className="sd-primary" disabled={disabled||stale||!canResearch||seat.resources[development.resource]<development.cost||!developmentAvailable(view,development.id)} onClick={()=>onSubmit({type:'research-development',developmentId:development.id})}>Acquire</button>}</article>;})}</div></section>}
  {selectedTech&&(owned.has(selectedTech.id)||!view.technologyMarket.includes(selectedTech.id))&&selectedPanel}
  <h2 className="dg-market-heading">Available technologies</h2>
  <div className="sd-tech-grid">{['military','grid','nano','rare'].map(track=><section key={track}><h2>{humanize(track)}</h2>{market.filter(({tech})=>tech.track===track).map(({tech,costs,bestPrice})=>{const id=tech.id;
   const exactPrice=selected===id&&draftId===id&&chosenCost?.ok?chosenCost:null;
   const displayedPrice=exactPrice??bestPrice;
   const candidate=purchases.find(c=>techIdOf(c)===id);
   return <article className={`dg-research-card${selected===id?' is-selected':''}`} aria-label={`${tech.name} technology`} key={id}><button className="sd-tech" title={describeTechnology(tech)} aria-pressed={selected===id} key={id} onClick={()=>{onSelect(id,false);if(!draftId||draftId===id)onDraft(candidate??null);}}><strong>{tech.name} ×{view.technologyMarket.filter(t=>t===id).length}</strong><ResearchCost cost={displayedPrice?.scienceCost??null} available={seat.resources.science} owned={owned.has(id)} from={!exactPrice&&new Set(costs).size>1} pricing={{base:tech.baseCost,minimum:tech.minimumCost,discount:displayedPrice?.discount??null}}/><TechnologyStats technology={tech}/><AdvancedPopulationPreview view={view} technology={tech}/>{candidate?.command.type==='trade-and-act'&&<small className="dg-conversion-available">Conversion available</small>}</button>{selected===id&&!owned.has(id)&&selectedPanel}</article>;
  })}</section>)}</div>
 </div>;
}
