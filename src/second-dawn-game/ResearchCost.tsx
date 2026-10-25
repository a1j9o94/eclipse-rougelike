import {useState} from 'react';
import { PlanetIcon } from './SectorPlanets';
import './researchCost.css';
export interface ResearchCostProps {
 cost:number|null;available:number;owned?:boolean;from?:boolean;
 pricing?:{base:number;minimum:number;discount:number|null};
 inspectable?:boolean;inspectionOnly?:boolean;
}
function ScienceSymbol(){return <svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource="science"/></svg>;}
export function ScienceBudget({available}:{available:number}) {
 return <div role="img" aria-label={`Science available: ${available}`} className="dg-science-budget"><ScienceSymbol/><strong>{available}</strong><span>Science available</span></div>;
}
export default function ResearchCost({cost,available,owned=false,from=false,pricing,inspectable=true,inspectionOnly=false}:ResearchCostProps){
 const [inspecting,setInspecting]=useState(false);
 if(owned)return <span className="dg-research-cost-state">✓ Researched</span>;
 const shortfall=cost===null?0:Math.max(0,cost-available);
 return <span className="dg-research-cost-details">
  {!inspectionOnly&&(cost===null?<span className="dg-research-cost-state">Track unavailable</span>:<span className="dg-research-price" role="img" aria-label={`Research cost: ${from?'from ':''}${cost} science after discounts. ${available} available.`}><span className="dg-research-price-value">{from&&<small>from</small>}<ScienceSymbol/><strong>{cost}</strong><small>science</small></span>{shortfall>0&&<small>+{shortfall} needed</small>}</span>)}
  {inspectable&&pricing&&<><button type="button" className="dg-price-inspect" aria-label="Inspect research price" aria-expanded={inspecting} onClick={()=>setInspecting(value=>!value)}>Price details</button>{inspecting&&<span className="dg-price-arithmetic">{pricing.discount===null?'No eligible track':`Base ${pricing.base} − discount ${pricing.discount} · minimum ${pricing.minimum} → ${cost??'—'} science`}</span>}</>}
 </span>;
}
