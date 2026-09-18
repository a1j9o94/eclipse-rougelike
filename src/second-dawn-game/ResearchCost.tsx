import { PlanetIcon } from './SectorPlanets';
import './researchCost.css';
export interface ResearchCostProps {
  /** Effective cost after the selected track's discounts; null when no track is legal. */
  cost: number | null;
  available: number;
  owned?: boolean;
  /** Use when rare technology has several legal tracks with different prices. */
  from?: boolean;
}
function ScienceSymbol(){return <svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource="science"/></svg>;}
export function ScienceBudget({available}:{available:number}) {
  return <div role="img" aria-label={`Science available: ${available}`} className="dg-science-budget"><ScienceSymbol/><strong>{available}</strong><span>Science available</span></div>;
}
export default function ResearchCost({cost,available,owned=false,from=false}:ResearchCostProps) {
  if(owned)return <span className="dg-research-cost-state">Researched</span>;
  if(cost===null)return <span className="dg-research-cost-state">Track unavailable</span>;
  const shortfall=Math.max(0,cost-available);
  const explanation=`Research cost: ${from?'from ':''}${cost} science after discounts. ${available} available. ${shortfall?`Need ${shortfall} more science.`:'Within science budget.'}`;
  return <span className={`dg-research-price ${shortfall?'dg-research-shortfall':''}`} role="img" aria-label={explanation} title={explanation}><span className="dg-research-price-value"><ScienceSymbol/>{from&&<small>from</small>}<strong>{cost}</strong><small>science</small></span><span className="dg-research-affordability">{shortfall?`Need ${shortfall} more`:'Within budget'}</span></span>;
}
