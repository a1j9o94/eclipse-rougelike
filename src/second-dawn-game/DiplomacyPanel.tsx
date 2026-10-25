import CommitBar from './CommitBar';
import {useCommitLabel} from './commitContext';
import {useState,type CSSProperties} from 'react';
import {getFaction} from '../../shared/eclipse/catalog';
import {reputationCapacity} from '../../shared/eclipse/battleEngine';
import {gameRules} from '../../shared/eclipse/gameRules';
import {ambassadorCapacityForSeat} from '../../shared/eclipse/minorSpecies';
import type {GameCommand,PlayerView,Seat} from '../../shared/eclipse/types';
import type {CommandCandidate} from './SecondDawnBoard';
import {useActionDraftState} from './actionDraftContext';
import {seatColor} from './factionColors';
import FactionSymbol from './FactionSymbol';
import {AcquiredMinorSpecies} from './MinorSpeciesMarket';
import DiplomacyExchangePreview from './DiplomacyExchangePreview';
import {diplomacyOfferIssue} from './diplomacyPreview';
import './diplomacy.css';

interface Props {inspectedSeatId?:string;view:PlayerView;candidates:CommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void}
function ReputationRack({view,seat}:{view:PlayerView;seat:Seat}){
 const exposed=gameRules(view).publicReputation?view.lessRandom?.reputationBySeat[seat.id]:undefined;
 const count=view.hiddenTileCounts.find(item=>item.seatId===seat.id)?.reputation??0;
 return <div className="dg-reputation-row">{exposed?exposed.map((vp,index)=><div key={index} className="dg-reputation-token" aria-label={`Public reputation: ${vp} VP`}><strong>{vp}</strong><small>VP</small></div>):Array.from({length:count},(_,index)=><div key={index} className="dg-reputation-back" aria-label="Face-down reputation tile">◇</div>)}<small>{exposed?`${exposed.length} public reputation tiles`:`${count} private reputation ${count===1?'tile':'tiles'}`}</small></div>;
}
function Ambassadors({view,seat}:{view:PlayerView;seat:Seat}){
 return <div className="dg-ambassador-row">{seat.ambassadors.map(id=>{
  const partner=view.seats.find(item=>item.id===id);if(!partner)return null;
  const resource=seat.ambassadorResources?.find(item=>item.from===id)?.resource;
  return <div key={id} className="dg-ambassador-token" aria-label={`${seat.id===view.viewerSeatId?'Your ambassador':'Ambassador'} from ${getFaction(partner.faction).name}`} style={{'--diplomat-color':seatColor(partner)} as CSSProperties}><FactionSymbol faction={partner.faction}/><div><strong>{getFaction(partner.faction).name}</strong><small>{resource?`${resource} cube · `:''}1 VP</small></div></div>;
 })}</div>;
}
export default function DiplomacyPanel({view,inspectedSeatId,candidates,disabled,onSubmit}:Props){
 const commitLabel=useCommitLabel();
 const [intent,setIntent]=useState<'relationship'|'reputation'>('relationship');
 const viewer=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 const inspected=view.seats.find(seat=>seat.id===inspectedSeatId)??viewer;
 const own=inspected.id===viewer.id;
 const privateMatches=view.private.seatId===viewer.id;
 const [selectedPartner,setSelectedPartner]=useActionDraftState('diplomacyPartner',null);
 const [chosenResources,setChosenResources]=useActionDraftState('diplomacyResources',{});
 const [selectedReputation,setSelectedReputation]=useState<{index:number;value:number}|null>(null);
 const partner=own?view.seats.find(seat=>seat.id===selectedPartner):inspected;
 const offers=candidates.flatMap(candidate=>candidate.command.type==='offer-diplomacy'?[candidate.command]:[]);
 const partnerOffers=offers.filter(command=>command.to===partner?.id);
 const choices=partnerOffers.map(command=>command.resource);
 const resource=partner?(chosenResources[partner.id]??(choices.length===1?choices[0]:undefined)):undefined;
 const chosen=partnerOffers.find(command=>command.resource===resource);
 const returns=candidates.flatMap(candidate=>candidate.command.type==='discard-reputation'?[candidate.command]:[]);
 const retainedCount=privateMatches?view.private.reputation.length:view.hiddenTileCounts.find(item=>item.seatId===viewer.id)?.reputation??0;
 const capacity=reputationCapacity(viewer),capabilities=getFaction(viewer.faction).capabilities;
 const emptyRackSpaces=Math.max(0,capabilities.reputationSlots+capabilities.dedicatedAmbassadorSlots-viewer.ambassadors.length-(viewer.minorSpecies?.length??0)-retainedCount);
 const emptyAmbassadorSpaces=Math.min(emptyRackSpaces,Math.max(0,ambassadorCapacityForSeat(viewer)-viewer.ambassadors.length-(viewer.minorSpecies?.length??0)),Math.max(0,capabilities.ambassadorSupply-viewer.ambassadors.length));
 const selectedReturn=selectedReputation&&privateMatches&&view.private.reputation[selectedReputation.index]===selectedReputation.value?returns.find(command=>command.values.length===1&&command.values[0]===selectedReputation.value):undefined;
 return <div className="dg-diplomacy-panel">
  <h1>{own?'Diplomacy':`${getFaction(inspected.faction).name} diplomacy`}</h1>
  {own&&<nav className="dg-relationship-overview" aria-label="Relationships">{view.seats.filter(seat=>seat.id!==viewer.id).map(seat=><button key={seat.id} type="button" aria-label={`Select relationship with ${getFaction(seat.faction).name}`} aria-pressed={selectedPartner===seat.id} onClick={()=>{setSelectedPartner(seat.id);setIntent('relationship');}}><FactionSymbol faction={seat.faction}/><strong>{getFaction(seat.faction).name}</strong><small>{viewer.ambassadors.includes(seat.id)?'Ambassadors exchanged':seat.traitor?'Traitor':offers.some(command=>command.to===seat.id)?'Exchange available':'No relation'}</small></button>)}</nav>}
  {partner&&<section className="dg-diplomatic-rack dg-partner-rack" aria-label={`${getFaction(partner.faction).name} diplomatic rack`}>
   <header className="dg-rack-heading"><h2>{getFaction(partner.faction).name}</h2></header>
   <Ambassadors view={view} seat={partner}/><ReputationRack view={view} seat={partner}/>
   {partner.traitor&&<p className="dg-traitor">Traitor card · {getFaction(partner.faction).special?.ignoresTraitorPenalty?'0':'−2'} VP. Cannot form new diplomatic relations.</p>}
   {partnerOffers.length>0?<div className="dg-diplomacy-offer"><h3>Form a relation · 1 VP ambassador</h3><DiplomacyExchangePreview seat={viewer} partner={partner} resources={choices} resource={resource} onResourceChange={next=>setChosenResources(current=>({...current,[partner.id]:next}))} disabled={disabled}/>{intent==='relationship'&&<CommitBar><button className="sd-primary" disabled={disabled||!chosen} aria-label={commitLabel(`Offer ambassador exchange to ${getFaction(partner.faction).name}`)} onClick={()=>{if(chosen&&!disabled)onSubmit(chosen);}}>{commitLabel('Offer ambassador exchange')}</button></CommitBar>}</div>:<p role="status">{diplomacyOfferIssue(view,viewer,partner)??'No legal ambassador exchange is available.'}</p>}
   {(partner.minorSpecies?.length??0)>0&&<details><summary>Recruited Minor Species</summary><AcquiredMinorSpecies seat={partner}/></details>}
  </section>}
  {own&&<>
   <section className="dg-diplomatic-rack" aria-label="Your diplomatic rack">
    <header className="dg-rack-heading"><h2>Your ambassadors</h2><span>{viewer.ambassadors.length} / {capabilities.ambassadorSupply} retained</span></header>
    <Ambassadors view={view} seat={viewer}/>
    <div className="dg-ambassador-row">{Array.from({length:emptyAmbassadorSpaces},(_,index)=><div key={index} className="dg-ambassador-empty">{view.minorSpecies?'Empty shared space':'Empty ambassador slot'}</div>)}</div>
    <div className="dg-rack-heading"><h2>Reputation</h2><span>{retainedCount} / {capacity} spaces</span></div>
    {privateMatches?<div className="dg-reputation-row">{view.private.reputation.map((vp,index)=><button key={index} type="button" className="dg-reputation-token" aria-label={`Your reputation: ${vp} VP`} aria-pressed={selectedReputation?.index===index&&selectedReputation.value===vp} disabled={disabled||!returns.some(command=>command.values.length===1&&command.values[0]===vp)} onClick={()=>{setSelectedReputation({index,value:vp});setIntent('reputation');}}><strong>{vp}</strong><small>VP</small></button>)}</div>:<ReputationRack view={view} seat={viewer}/>}
    {intent==='reputation'&&selectedReputation&&privateMatches&&<div className="dg-reputation-returns"><CommitBar summary={`Free 1 rack space · lose ${selectedReputation.value} VP`}><button className="sd-primary" disabled={disabled||!selectedReturn} onClick={()=>{if(selectedReturn&&!disabled)onSubmit(selectedReturn);}}>Return selected reputation · lose {selectedReputation.value} VP</button></CommitBar>{!selectedReturn&&<p role="status">This tile can no longer be returned. Select an available tile.</p>}</div>}
    {viewer.traitor&&<p className="dg-traitor">Traitor card · {getFaction(viewer.faction).special?.ignoresTraitorPenalty?'0':'−2'} VP. Cannot form new diplomatic relations.</p>}
    <details><summary>Rack capacity and diplomacy rules</summary><p className="dg-rack-note">{capabilities.dedicatedAmbassadorSlots>0?'This faction has one dedicated ambassador space. Further ambassadors occupy shared reputation spaces.':'Ambassadors share space with reputation tiles on your faction’s track.'}</p>{(viewer.minorSpecies?.length??0)>0&&<p className="dg-rack-note">{viewer.minorSpecies!.length} Minor Species {viewer.minorSpecies!.length===1?'tile occupies':'tiles occupy'} this diplomatic rack. {emptyRackSpaces} empty spaces remain.</p>}<p>{gameRules(view).publicReputation?'Reputation is public in this game.':'Your reputation values stay private.'}</p><p>Ending an action with ships in a partner’s territory or sharing a sector breaks that relation. Both ambassadors return and you take the Traitor card.</p></details>
    {(viewer.minorSpecies?.length??0)>0&&<details><summary>Recruited Minor Species</summary><AcquiredMinorSpecies seat={viewer}/></details>}
   </section>
  </>}
 </div>;
}
