import type {PlayerView} from '../../shared/eclipse/types';
import {incomeForPopulationAway} from '../../shared/eclipse/tracks';
import {upkeepForecast} from './upkeepForecast';
import {TradeResourceIcon} from './TradePanel';
import CommitBar from './CommitBar';
export default function UpkeepSettlement({view,disabled,onCollect,onColonize}:{view:PlayerView;disabled:boolean;onCollect:()=>void;onColonize?:()=>void}) {
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!,forecast=upkeepForecast(view);
 return <section className="dg-upkeep-settlement" aria-label="Upkeep settlement">
  <header><h2>Collect income</h2><span>Round {view.round}</span></header>
  <div className="dg-settlement-balances">{(['money','science','materials'] as const).map(resource=>{
   const after=own.resources[resource]+incomeForPopulationAway(own.populationTracks[resource])-(resource==='money'?forecast.upkeep:0);
   return <div key={resource} aria-label={`${resource}: ${own.resources[resource]} to ${after}`}><TradeResourceIcon resource={resource}/><span>{own.resources[resource]} →</span><strong>{after}</strong></div>;
  })}</div>
  {forecast.balance<0&&<p className="dg-danger">{Math.abs(forecast.balance)} money short</p>}
  <details><summary>Income & upkeep</summary><dl>{(['money','science','materials'] as const).map(resource=><div key={resource}><dt>{resource} income</dt><dd>+{incomeForPopulationAway(own.populationTracks[resource])}</dd></div>)}<div><dt>Money upkeep</dt><dd>−{forecast.upkeep}</dd></div></dl></details>
  {onColonize&&<button disabled={disabled} onClick={onColonize}>Colonize · {own.colonyShipsAvailable} colony ships</button>}
  <CommitBar><button className="sd-primary" disabled={disabled} onClick={onCollect}>Collect income</button></CommitBar>
 </section>;
}
