import type {PlayerView} from '../../shared/eclipse/types';
import {upkeepForecast} from './upkeepForecast';
import './upkeep.css';
export default function UpkeepSummary({view}:{view:PlayerView}){
 if(view.phase==='finished')return <div className="sd-upkeep"><small>Game complete</small><strong>Final</strong></div>;
 const f=upkeepForecast(view);const progress=view.actionProgress?.owner===view.viewerSeatId?view.actionProgress:null;
 const balanceLabel=(amount:number)=>amount<0?`${-amount} short`:`${amount} left`;
 return <details className="dg-upkeep-summary">
  <summary><span>Round-end upkeep</span><div aria-label={`Current upkeep: ${f.upkeep} money; ${f.balance<0?`${-f.balance} money short`:`${f.balance} money left`} at round end`}><strong>{f.upkeep}<small> money</small></strong><b className={f.balance<0?'dg-danger':''}>{balanceLabel(f.balance)}</b></div><small className={f.nextBalance!==null&&f.nextBalance<0?'dg-danger':''}>{f.nextUpkeep===null?'No discs for another action':`${progress?'Next new action':'Next action'}: ${f.nextUpkeep} upkeep · ${balanceLabel(f.nextBalance!)}`}</small></summary>
  <div className="dg-upkeep-explanation"><h3>Paid at the end of the round</h3><p>{f.money} money + {f.income} income − {f.upkeep} upkeep = {balanceLabel(f.balance)}</p><p>Starting an action moves one influence disc off your track. The newly uncovered number is your upkeep bill, not an immediate money payment.</p>{progress&&<p>Your remaining {progress.action[0].toUpperCase()+progress.action.slice(1)} activation uses no additional disc.</p>}<p>Taking control of a sector also uses a disc. Research and construction have separate science or material costs. Discoveries, population and other choices can change the forecast.</p></div>
 </details>;
}
