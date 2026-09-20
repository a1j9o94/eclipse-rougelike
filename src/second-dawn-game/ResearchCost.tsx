import { PlanetIcon } from './SectorPlanets';
import './researchCost.css';
export interface ResearchCostProps {
  /** Effective cost after the selected track's discounts; null when no track is legal. */
  cost: number | null;
  available: number;
  owned?: boolean;
  /** Use when rare technology has several legal tracks with different prices. */
  from?: boolean;
  /** Printed tile prices and the full authoritative discount, before the minimum floor. */
  pricing?: {base:number;minimum:number;discount:number|null};
}
function ScienceSymbol(){return <svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource="science"/></svg>;}
export function ScienceBudget({available}:{available:number}) {
  return <div role="img" aria-label={`Science available: ${available}`} className="dg-science-budget"><ScienceSymbol/><strong>{available}</strong><span>Science available</span></div>;
}
export default function ResearchCost({cost,available,owned=false,from=false,pricing}:ResearchCostProps) {
  if(owned)return <span className="dg-research-cost-state">Researched</span>;
  const breakdown=pricing&&<span className="dg-research-cost-breakdown"><span>Base {pricing.base}</span><span>Minimum {pricing.minimum}</span>{pricing.discount!==null&&<span>{from?'Best discount':'Discount'} −{pricing.discount}</span>}</span>;
  if(cost===null)return <span className="dg-research-cost-details">{breakdown}<span className="dg-research-cost-state">Track unavailable</span></span>;
  const shortfall=Math.max(0,cost-available);
  const explanation=`Research cost: ${from?'from ':''}${cost} science after discounts. ${available} available. ${shortfall?`Need ${shortfall} more science.`:'Within science budget.'}`;
  const atMinimum=pricing&&pricing.discount!==null&&pricing.discount>0&&cost===pricing.minimum;
  return <span className="dg-research-cost-details">{breakdown}<span className={`dg-research-price ${shortfall?'dg-research-shortfall':''}`} role="img" aria-label={explanation} title={explanation}><span className="dg-research-price-value"><small>Pay</small>{from&&<small>from</small>}<ScienceSymbol/><strong>{cost}</strong><small>science</small></span><span className="dg-research-affordability">{shortfall?`Need ${shortfall} more`:'Within budget'}</span></span>{atMinimum&&<span className="dg-research-minimum-note">Minimum price reached</span>}</span>;
}
