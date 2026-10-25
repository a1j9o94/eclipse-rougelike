import type {PlayerView} from '../../shared/eclipse/types';
import {incomeForPopulationAway} from '../../shared/eclipse/tracks';
import {upkeepForecast} from './upkeepForecast';
import {TradeResourceIcon} from './TradePanel';

export default function UpkeepSettlement({view,disabled,onCollect,onColonize}:{view:PlayerView;disabled:boolean;onCollect:()=>void;onColonize?:()=>void}) {
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 const forecast=upkeepForecast(view);
 return <section className="dg-upkeep-settlement" aria-label="Upkeep settlement">
  <header><h2>Collect income</h2><span>Round {view.round}</span></header>
  <div className="dg-settlement-balances">{(['money','science','materials'] as const).map(resource=>{
   const income=incomeForPopulationAway(own.populationTracks[resource]);
   const upkeep=resource==='money'?forecast.upkeep:0;
   return <div key={resource}><TradeResourceIcon resource={resource}/><strong>{own.resources[resource]+income-upkeep}</strong><small>{own.resources[resource]} + {income} income{upkeep?` − ${upkeep} upkeep`:''}</small></div>;
  })}</div>
  {forecast.balance<0&&<p className="dg-danger">{Math.abs(forecast.balance)} money short. Collect income to resolve the shortfall.</p>}
  <footer>{onColonize&&<button disabled={disabled} onClick={onColonize}>Colonize · {own.colonyShipsAvailable} colony ships</button>}<button className="sd-primary" disabled={disabled} onClick={onCollect}>Collect income</button></footer>
 </section>;
}
