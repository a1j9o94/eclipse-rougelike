import { getFaction } from '../../shared/eclipse/catalog';
import { incomeForPopulationAway } from '../../shared/eclipse/tracks';
import type { Resource, Seat } from '../../shared/eclipse/types';
import { TradeResourceIcon } from './TradePanel';
import FactionSymbol from './FactionSymbol';
import './diplomacy.css';

interface Props {
 seat:Seat;
 partner:Seat;
 resources:readonly Resource[];
 resource?:Resource;
 onResourceChange:(resource:Resource)=>void;
 disabled:boolean;
 offeredResource?:Resource;
}
const names:Record<Resource,string>={money:'Money',science:'Science',materials:'Materials'};
/** Offer and response use the same controlled cube choice and public consequence preview. */
export default function DiplomacyExchangePreview({seat,partner,resources,resource,onResourceChange,disabled,offeredResource}:Props){
 const partnerName=getFaction(partner.faction).name;
 const legal=resource!==undefined&&resources.includes(resource);
 return <section className="dg-diplomacy-exchange-preview" aria-label={`Ambassador exchange with ${partnerName}`}>
  <div className="dg-exchange-civilizations"><FactionSymbol faction={seat.faction}/><span>⇄</span><FactionSymbol faction={partner.faction}/></div>
  {resources.length>1&&<div className="dg-diplomacy-cube-choices" role="group" aria-label={`Your population cube for ${partnerName}`}>
   {(['money','science','materials'] as const).map(choice=>{
    const available=resources.includes(choice),before=incomeForPopulationAway(seat.populationTracks[choice]);
    return <button key={choice} type="button" className={`dg-diplomacy-cube${resource===choice?' is-selected':''}`} aria-label={available?`Choose ${choice} population for ${partnerName}`:`${names[choice]} population unavailable for ${partnerName}`} aria-pressed={resource===choice} disabled={disabled||!available} onClick={()=>onResourceChange(choice)}><TradeResourceIcon resource={choice}/><span><strong>{names[choice]}</strong><small>{available?`Income ${before} → ${incomeForPopulationAway(seat.populationTracks[choice]+1)}`:'No available cube'}</small></span></button>;
   })}
  </div>}
  {resource&&<div className="dg-exchange-cube-path" aria-label={`Your ${resource} cube goes to ${partnerName}`}><TradeResourceIcon resource={resource}/><span>Your {resource} track → {partnerName} ambassador</span></div>}
  {legal&&resource&&<p className="dg-diplomacy-exchange" aria-label={`Your ${resource} income: ${incomeForPopulationAway(seat.populationTracks[resource])} → ${incomeForPopulationAway(seat.populationTracks[resource]+1)}`}>{names[resource]} income {incomeForPopulationAway(seat.populationTracks[resource])} → {incomeForPopulationAway(seat.populationTracks[resource]+1)}</p>}
  {resource&&!legal&&<p role="alert">Your selected {resource} cube is no longer available. Choose another population resource.</p>}
  {offeredResource&&<div className="dg-exchange-cube-path"><TradeResourceIcon resource={offeredResource}/><span>{partnerName} {offeredResource} cube → your ambassador</span></div>}
  <p className="dg-exchange-rack-preview">1 ambassador · +1 VP · uses 1 rack space on each side</p>
 </section>;
}
