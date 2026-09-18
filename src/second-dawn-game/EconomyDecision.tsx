import {useState} from 'react';
import type {ReactNode} from 'react';
import type {DecisionChoice,GameCommand,PendingDecision,PlayerView,Resource,Track} from '../../shared/eclipse/types';
import type {LegalCommandCandidate} from '../../shared/eclipse/legal';
import {getFaction} from '../../shared/eclipse/catalog';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from '../../shared/eclipse/tracks';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import {sectorDefinition} from '../../shared/eclipse/sectors';
import {ChoiceCards,ResourceChoiceChips} from './DecisionChoicePrimitives';
import {TradeResourceIcon} from './TradePanel';
import TradePanel from './TradePanel';
import TechnologyStats from './TechnologyStats';
import SectorPlanets from './SectorPlanets';
import SectorFleet from './SectorFleet';
import GalaxyBoard from './GalaxyBoard';
import ActionEconomy from './ActionEconomy';
import {StatIcon} from './ShipPartStats';
import './economyDecision.css';

export type EconomyChoice = Extract<PendingDecision,{kind:'control'|'bankruptcy'|'portal-placement'|'free-technology'|'population-return'|'resource-reward'|'diplomacy'|'diplomacy-window'|'reputation'}>;
export interface EconomyDecisionProps {decision:EconomyChoice;view?:PlayerView;candidates:readonly LegalCommandCandidate[];reputation:number[];disabled:boolean;onSubmit:(command:GameCommand)=>void}
const resources:Resource[]=['money','science','materials'];
const names:Record<Resource,string>={money:'Money',science:'Science',materials:'Materials'};
function DecisionFrame({title,children,choice,label,valid=true,...props}:EconomyDecisionProps&{title:string;children:ReactNode;choice:DecisionChoice;label:string;valid?:boolean}){
 return <section className="dg-economy-decision" aria-label={title}><header><small>SAVED DECISION</small><h2>{title}</h2></header><div className="dg-economy-decision-body">{children}</div><footer><button className="sd-primary" disabled={props.disabled||!valid} onClick={()=>props.onSubmit({type:'resolve',decisionId:props.decision.id,choice})}>{label}</button><small>Your choices stay editable until confirmation.</small></footer></section>;
}

function ResourceAllocation(props:EconomyDecisionProps&{decision:Extract<EconomyChoice,{kind:'population-return'|'resource-reward'}>}){
 const {decision,view,disabled}=props,seat=view?.seats.find(s=>s.id===decision.owner);
 const [counts,setCounts]=useState<Record<Resource,number>>({money:0,science:0,materials:0});
 const allowed=decision.kind==='population-return'?decision.resources:resources;
 const total=resources.reduce((sum,r)=>sum+counts[r],0),isReturn=decision.kind==='population-return';
 const countLimit=(r:Resource)=>isReturn&&decision.destination!=='graveyard'&&seat?seat.populationTracks[r]+1:decision.count;
 const valid=total===decision.count&&resources.every(r=>counts[r]<=countLimit(r));
 const choice:DecisionChoice={kind:decision.kind,resources:resources.flatMap(r=>Array.from({length:counts[r]},()=>r))};
 return <DecisionFrame {...props} title={isReturn?'Return population':'Allocate resource reward'} label={isReturn?'Confirm population return':'Confirm reward'} valid={valid} choice={choice}>
  <div className="dg-allocation-pool" aria-label="Unassigned choices"><StatIcon kind="population"/><strong>{decision.count-total}</strong><span>of {decision.count} {isReturn?'cubes':'rewards'} remaining</span></div>
  {isReturn&&<p>{decision.destination==='graveyard'?'Returned cubes go to your graveyard.':'Place each cube back on an eligible population track. This changes future income.'}</p>}
  <div className="dg-resource-bins">{allowed.map(r=><section key={r} aria-label={`${names[r]} allocation`}><TradeResourceIcon resource={r}/><h3>{names[r]}</h3><div className="dg-allocation-stepper"><button aria-label={`Remove ${r} allocation`} disabled={disabled||counts[r]===0} onClick={()=>setCounts(c=>({...c,[r]:c[r]-1}))}>−</button><output>{counts[r]}</output><button aria-label={`Add ${r} allocation`} disabled={disabled||total>=decision.count||counts[r]>=countLimit(r)} onClick={()=>setCounts(c=>({...c,[r]:c[r]+1}))}>+</button></div>{!isReturn?<><strong>+{counts[r]*decision.perChoice} {r}</strong>{seat&&<small>{seat.resources[r]} → {seat.resources[r]+counts[r]*decision.perChoice} held</small>}</>:seat&&decision.destination!=='graveyard'?<small>Income {incomeForPopulationAway(seat.populationTracks[r])} → {incomeForPopulationAway(Math.max(-1,seat.populationTracks[r]-counts[r]))}</small>:<small>{counts[r]} cubes to graveyard</small>}</section>)}</div>
 </DecisionFrame>;
}

function FreeTechnology(props:EconomyDecisionProps&{decision:Extract<EconomyChoice,{kind:'free-technology'}>}){
 const [selected,setSelected]=useState(''),[track,setTrack]=useState<Track>('military');
 const choices=props.candidates.flatMap(c=>c.command.type==='resolve'&&c.command.choice.kind==='free-technology'?[c.command.choice]:[]);
 const tracks=choices.filter(c=>c.technologyId===selected).map(c=>c.track);
 const chosenTrack=tracks.includes(track)?track:tracks[0];
 return <DecisionFrame {...props} title="Choose a free technology" label="Confirm free technology" valid={Boolean(selected&&chosenTrack)} choice={{kind:'free-technology',technologyId:selected,track:chosenTrack??'military'}}>
  <div className="dg-free-technologies">{props.decision.technologyIds.map(id=>{const tech=TECHNOLOGIES.find(t=>t.id===id);if(!tech)return null;return <button key={id} aria-label={`Choose free ${tech.name}`} aria-pressed={selected===id} disabled={props.disabled||!choices.some(c=>c.technologyId===id)} onClick={()=>setSelected(id)}><span className="dg-free-badge">FREE</span><strong>{tech.name}</strong><TechnologyStats technology={tech}/>{!choices.some(c=>c.technologyId===id)&&<small>No legal track space</small>}</button>;})}</div>
  {selected&&<section><h3>Place on your research board</h3><ChoiceCards label="Research track" value={chosenTrack??''} disabled={props.disabled} onChange={value=>setTrack(value as Track)} options={[...new Set(tracks)].map(value=>({value,label:value[0].toUpperCase()+value.slice(1),visual:<StatIcon kind="discovery"/>}))}/></section>}
 </DecisionFrame>;
}

function ReputationChoice(props:EconomyDecisionProps&{decision:Extract<EconomyChoice,{kind:'reputation'}>}){
 const [kept,setKept]=useState(()=>props.reputation.map((_,i)=>i));
 const tiles=[...props.reputation,...props.decision.drawn],existing=props.reputation.length;
 const toggle=(i:number)=>setKept(ids=>ids.includes(i)?ids.filter(id=>id!==i):[...ids,i]);
 return <DecisionFrame {...props} title="Choose reputation to keep" label="Confirm reputation" choice={{kind:'reputation',kept:kept.map(i=>tiles[i])}} valid={kept.length<=props.decision.capacity&&kept.filter(i=>i>=existing).length<=1}>
  <p>Private to you · {kept.length} / {props.decision.capacity} spaces used · keep at most one newly drawn tile.</p>
  {['Currently held reputation','Newly drawn reputation'].map((label,group)=><section key={label}><h3>{label}</h3><div className="dg-reputation-choice-tray" role="group" aria-label={label}>{tiles.map((points,i)=>(i<existing)===(group===0)?<button key={i} role="checkbox" aria-checked={kept.includes(i)} aria-label={`Keep ${points} VP reputation`} disabled={props.disabled||(!kept.includes(i)&&(kept.length>=props.decision.capacity||(i>=existing&&kept.some(id=>id>=existing))))} onClick={()=>toggle(i)}><StatIcon kind="discovery"/><strong>{points}</strong><small>VP</small>{kept.includes(i)&&<b>✓</b>}</button>:null)}</div></section>)}
 </DecisionFrame>;
}

function DiplomacyChoice(props:EconomyDecisionProps&{decision:Extract<EconomyChoice,{kind:'diplomacy'|'diplomacy-window'}>}){
 const {decision,view}=props;
 const [partner,setPartner]=useState('finish'),[response,setResponse]=useState('yes'),[resource,setResource]=useState<Resource>(decision.populationSources[0]??'money');
 const choices=props.candidates.flatMap(c=>c.command.type==='resolve'?[c.command.choice]:[]);
 const seat=view?.seats.find(s=>s.id===decision.owner);
 const factionName=(id:string)=>{const s=view?.seats.find(s=>s.id===id);return s?getFaction(s.faction).name:'Civilization';};
 const offering=decision.kind==='diplomacy-window'?partner!=='finish':response==='yes';
 const sources=decision.populationSources.filter(r=>!props.candidates.length||choices.some(c=>decision.kind==='diplomacy-window'?c.kind==='diplomacy-window'&&c.offerTo===partner&&c.resource===r:c.kind==='diplomacy'&&c.accept&&c.resource===r));
 const selectedResource=sources.includes(resource)?resource:sources[0]??resource;
 const choice:DecisionChoice=decision.kind==='diplomacy-window'?{kind:decision.kind,offerTo:partner==='finish'?null:partner,resource:selectedResource}:{kind:decision.kind,accept:response==='yes',resource:selectedResource};
 return <DecisionFrame {...props} title={decision.kind==='diplomacy'?'Ambassador exchange':'Post-combat diplomacy'} label={decision.kind==='diplomacy-window'?(offering?'Offer ambassadors':'Finish diplomacy'):(offering?'Accept ambassadors':'Decline offer')} choice={choice} valid={!offering||sources.length>0}>
  {decision.kind==='diplomacy-window'?<ChoiceCards label="Diplomacy partner" value={partner} onChange={setPartner} disabled={props.disabled} options={[{value:'finish',label:'Finish diplomacy',description:'No exchange',visual:<StatIcon kind="influence"/>},...decision.eligibleSeatIds.map(id=>({value:id,label:factionName(id),description:'Exchange ambassadors · 1 VP each',visual:<span className="dg-faction-choice-mark">{(view?.seats.findIndex(s=>s.id===id)??0)+1}</span>}))]}/>:<><p>{factionName(decision.proposer)} offers an ambassador{decision.proposerResource?` with a ${decision.proposerResource} population cube`:''}.</p><ChoiceCards label="Diplomatic response" value={response} onChange={setResponse} disabled={props.disabled} options={[{value:'yes',label:'Accept exchange',visual:<StatIcon kind="population"/>},{value:'no',label:'Decline exchange',visual:<StatIcon kind="shield"/>}]}/></>}
  {offering&&<section><h3>Choose your ambassador’s population cube</h3>{sources.length?<ResourceChoiceChips label="Ambassador population" resources={sources} value={selectedResource} disabled={props.disabled} onChange={setResource}/>:<p>Return reputation tiles to free an ambassador slot before accepting.</p>}{seat&&sources.length>0&&<p>{names[selectedResource]} income: {incomeForPopulationAway(seat.populationTracks[selectedResource])} → {incomeForPopulationAway(Math.min(11,seat.populationTracks[selectedResource]+1))} · 1 VP ambassador</p>}</section>}
  <p>Reputation values remain private. Betraying a partner later gives you the traitor card (−2 VP).</p>
 </DecisionFrame>;
}

function SectorDecision(props:EconomyDecisionProps&{decision:Extract<EconomyChoice,{kind:'control'|'bankruptcy'|'portal-placement'}>}){
 const {decision,view}=props;
 const eligible=decision.kind==='control'?[decision.sectorId]:decision.kind==='bankruptcy'?decision.abandonableSectorIds:decision.sectorIds;
 const [selected,setSelected]=useState(decision.kind==='control'?decision.sectorId:''),[accept,setAccept]=useState('');
 const sector=view?.sectors.find(s=>s.id===selected),seat=view?.seats.find(s=>s.id===decision.owner);
 const [trading,setTrading]=useState(false);
 const choice:DecisionChoice=decision.kind==='control'?{kind:'control',accept:accept==='yes'}:decision.kind==='bankruptcy'?{kind:'bankruptcy',abandonSectorId:selected}:{kind:'portal-placement',sectorId:selected};
 const choiceAllowed=props.candidates.some(c=>c.command.type==='resolve'&&JSON.stringify(c.command.choice)===JSON.stringify(choice));
 const preview=view&&decision.kind==='control'?previewCommand(view,{type:'resolve',decisionId:decision.id,choice}):null;
 const title=decision.kind==='control'?'Control this sector':decision.kind==='bankruptcy'?'Resolve upkeep shortfall':'Place your warp portal';
 const portalTargets=view?.sectors.filter(s=>s.id!==selected&&(s.portalVp!==undefined||sectorDefinition(Number(s.tileId))?.warpPortal))??[];
 const mapView=view&&decision.kind==='portal-placement'&&selected?{...view,sectors:view.sectors.map(s=>s.id===selected?{...s,portalVp:1 as const}:s)}:view;
 let abandonment:ReactNode=null;
 if(seat&&sector&&decision.kind==='bankruptcy'){
  const population={...seat.populationTracks};for(const cube of sector.population)population[cube.resource]--;
  const income=incomeForPopulationAway(Math.max(-1,population.money)),bill=upkeepForEmptyInfluenceSlots(Math.max(0,12-seat.influenceOnTrack)),balance=seat.resources.money+income-bill;
  const definition=sectorDefinition(Number(sector.tileId));
  const flexible=sector.population.some(c=>c.squareId==='orbital'||definition?.population[Number(c.squareId.slice(1))]?.resource==='gray');
  abandonment=<div className="dg-abandon-preview"><strong>{balance<0?`${-balance} money still short`:`${balance} money remaining`} after abandonment{flexible?' if cubes return to their current tracks':''}</strong><p>{sector.population.length} population cubes return · lose {definition?.victoryPoints ?? 0} sector VP{sector.orbital?' · Orbital remains in this sector':''}{sector.monolith?' · Monolith remains in this sector':''}</p><p>{seat.resources.money} money + {income} income − {bill} upkeep</p>{flexible&&<small>The following population-return choice can change this income.</small>}</div>;
 }
 return <DecisionFrame {...props} title={title} label={decision.kind==='control'?'Confirm control':decision.kind==='bankruptcy'?'Abandon selected sector':'Place warp portal'} choice={choice} valid={choiceAllowed&&Boolean(sector)&&(decision.kind!=='control'||Boolean(accept))}>
  {decision.kind==='portal-placement'&&selected&&<section aria-label="Preview portal connections" className="dg-portal-preview"><StatIcon kind="discovery"/><strong>Portal preview · sector {sector?.tileId}</strong><span>{portalTargets.length?`Links to sectors ${portalTargets.map(s=>s.tileId).join(', ')}`:'First portal · future portals will connect here'}</span><small>+1 VP · placement awaits confirmation</small></section>}
  {decision.kind==='bankruptcy'&&<div className="dg-bankruptcy-options"><strong>{decision.shortfall} money short</strong><button onClick={()=>setTrading(v=>!v)}>{trading?'Return to sector choices':'Trade to cover upkeep'}</button></div>}
  {trading&&view?<TradePanel view={view} candidates={props.candidates} disabled={props.disabled} onSubmit={props.onSubmit}/>:<div className="dg-map-decision-layout"><div className="dg-decision-map">{view?<GalaxyBoard initialFit targetLabel="eligible sector" view={mapView!} candidates={[]} selected={selected||null} legalTargetIds={eligible} onSelect={id=>{if(eligible.includes(id))setSelected(id);}} onExplore={()=>{}}/>:<p>Reconnect to restore the sector map.</p>}</div><section className="dg-decision-sector-details"><div className="dg-sector-target-strip" role="group" aria-label="Eligible sectors">{eligible.map(id=><button key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}><svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 2 27 9v13L15 29 3 22V9Z" fill="none" stroke="currentColor" strokeWidth="2"/></svg>{view?.sectors.find(s=>s.id===id)?.tileId??'Sector'}</button>)}</div>
  {sector&&view?<><h3>Sector {sector.tileId}</h3>{decision.kind==='control'&&<><ChoiceCards label="Control sector" value={accept} disabled={props.disabled} onChange={setAccept} options={[{value:'yes',label:'Place influence disc',disabled:!props.candidates.some(c=>c.command.type==='resolve'&&c.command.choice.kind==='control'&&c.command.choice.accept),visual:<StatIcon kind="influence"/>},{value:'no',label:'Leave uncontrolled',visual:<StatIcon kind="shield"/>}]}/><ActionEconomy view={view} action="resolve" preview={preview}/></>}{abandonment}{decision.kind==='portal-placement'&&<p>A warp portal links this sector to every other portal. This placement adds 1 VP here.</p>}<SectorPlanets view={view} sector={sector} candidates={[...props.candidates]}/><SectorFleet view={view} sectorId={sector.id}/></>:<p>Select a highlighted sector on the map.</p>}
  </section></div>}
 </DecisionFrame>;
}

export default function EconomyDecision(props:EconomyDecisionProps){
 switch(props.decision.kind){
  case 'population-return':case 'resource-reward':return <ResourceAllocation {...props} decision={props.decision}/>;
  case 'free-technology':return <FreeTechnology {...props} decision={props.decision}/>;
  case 'reputation':return <ReputationChoice {...props} decision={props.decision}/>;
  case 'diplomacy':case 'diplomacy-window':return <DiplomacyChoice {...props} decision={props.decision}/>;
  case 'control':case 'bankruptcy':case 'portal-placement':return <SectorDecision {...props} decision={props.decision}/>;
 }
}
