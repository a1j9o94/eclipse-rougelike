import type {PlayerView} from '../../shared/eclipse/types';
import {affordableActionCapacity,upkeepForecast} from './upkeepForecast';
import TradeResourceIcon from './TradeResourceIcon';
import './upkeep.css';
import './activityPrimitives.css';
export default function UpkeepSummary({view,onOpenTracks}:{view:PlayerView;onOpenTracks?:()=>void}){
 if(view.phase==='finished')return null;
 const f=upkeepForecast(view),capacity=affordableActionCapacity(f);
 return <details className="dg-upkeep-summary dg-cost-inspect"><summary aria-label={`Round-end balance: ${f.balance} money`}><small>Round end</small><TradeResourceIcon resource="money"/><strong className={f.balance<0?'dg-danger':''}>{f.balance<0?`${-f.balance} short`:f.balance}</strong></summary><div><h3>Round-end balance</h3><dl><dt>Held</dt><dd>{f.money}</dd><dt>Income</dt><dd>+{f.income}</dd><dt>Upkeep</dt><dd>−{f.upkeep}</dd><dt>After upkeep</dt><dd>{f.balance}</dd>{capacity.status==='affordable'&&<><dt>Extra action discs covered</dt><dd>{capacity.actions}</dd></>}</dl><small>Purchase costs and later income changes also affect this balance.</small>{onOpenTracks&&<button onClick={onOpenTracks}>Inspect economy tracks</button>}</div></details>;
}
