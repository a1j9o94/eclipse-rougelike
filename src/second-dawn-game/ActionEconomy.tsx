import {continuesAction} from './actionCapacity';
import type {Action,GameCommand,PlayerView,Resource} from '../../shared/eclipse/types';
import type {CommandPreview} from '../../shared/eclipse/commandPreview';
import {upkeepForecast} from './upkeepForecast';
import TradeResourceIcon from './TradeResourceIcon';
import './activityPrimitives.css';
const ordinary:readonly string[]=['explore','influence','research','upgrade','build','move'];
function Disc(){return <svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="11" rx="7" ry="5" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M3 8a7 5 0 0 1 14 0v3M3 8v3" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg>;}
export default function ActionEconomy({view,action,preview,omitResources=[]}:{view:PlayerView;action:GameCommand['type'];preview:CommandPreview|null;omitResources?:readonly Resource[]}){
 if(!preview)return null;
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 const base=upkeepForecast(view);
 const ordinaryAction=ordinary.includes(action)?action as Action:['research-development','quantum-research','reverse-engineer','place-shrine'].includes(action)?'research':null;
 const discCost=ordinaryAction&&!continuesAction(view,ordinaryAction)?1:action==='resolve'?Math.max(0,own.influenceOnTrack-preview.influenceAfter):0;
 const changes=(['money','science','materials'] as const).filter(resource=>!omitResources.includes(resource)&&preview.resourcesAfter[resource]!==own.resources[resource]);
 const spent=changes.filter(resource=>preview.resourcesAfter[resource]<own.resources[resource]);
 const gained=changes.filter(resource=>preview.resourcesAfter[resource]>own.resources[resource]);
 const upkeepChanged=preview.upkeepAfter!==base.upkeep,incomeChanged=preview.moneyIncomeAfter!==base.income;
 const shortfall=preview.moneyBalanceAfter<0&&(preview.moneyBalanceAfter<base.balance||upkeepChanged);
 if(!discCost&&!changes.length&&!upkeepChanged&&!incomeChanged&&!shortfall)return null;
 const values=(resources:readonly Resource[])=>resources.map(resource=><span className="dg-cost-value" key={resource} aria-label={`${Math.abs(preview.resourcesAfter[resource]-own.resources[resource])} ${resource}`}><TradeResourceIcon resource={resource}/><b>{Math.abs(preview.resourcesAfter[resource]-own.resources[resource])}</b></span>);
 return <section className="dg-cost-strip" aria-label="Action cost preview">
  {(discCost>0||spent.length>0)&&<div className="dg-cost-group"><small>Pay now</small>{discCost>0&&<span className="dg-cost-value" aria-label={`${discCost} influence ${discCost===1?'disc':'discs'}`}><Disc/><b>{discCost}</b></span>}{values(spent)}</div>}
  {gained.length>0&&<div className="dg-cost-group"><small>Receive</small>{values(gained)}</div>}
  {(upkeepChanged||incomeChanged)&&<div className="dg-cost-group"><small>Round end</small>{upkeepChanged&&<span className="dg-cost-value" aria-label={`Upkeep ${base.upkeep} to ${preview.upkeepAfter} money`}><TradeResourceIcon resource="money"/>{base.upkeep} → {preview.upkeepAfter}</span>}{incomeChanged&&<span className="dg-cost-value" aria-label={`Money income ${base.income} to ${preview.moneyIncomeAfter}`}><TradeResourceIcon resource="money"/>+{base.income} → +{preview.moneyIncomeAfter}{preview.populationChoiceMayChangeIncome?'*':''}</span>}</div>}
  {shortfall&&<span className="dg-cost-warning" role="status"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 19 18H1Z M10 7v5M10 14v1" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg>{Math.abs(preview.moneyBalanceAfter)} money short at round end</span>}
  {preview.populationChoiceMayChangeIncome&&<small>* Pending population choice</small>}
 </section>;
}
