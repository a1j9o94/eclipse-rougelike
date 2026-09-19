import type {PlayerView} from '../../shared/eclipse/types';
import {affordableActionCapacity,upkeepForecast} from './upkeepForecast';
import './upkeep.css';
export default function UpkeepSummary({view}:{view:PlayerView}){
 if(view.phase==='finished')return <div className="sd-upkeep"><small>Game complete</small><strong>Final</strong></div>;
 const f=upkeepForecast(view),capacity=affordableActionCapacity(f);const progress=view.actionProgress?.owner===view.viewerSeatId?view.actionProgress:null;
 const reactionsOnly=view.phase==='action'&&f.passed&&!f.eliminated;
 const reactionExplanation='Upgrade, Build or Move: one activation, without an influence disc. Resource costs, available pieces and blueprint slots still apply.';
 const balanceLabel=(amount:number)=>amount<0?`${-amount} short`:`${amount} left`;
 const capacityLabel=capacity.status==='affordable'?`${capacity.actions} more ${capacity.actions===1?'action':'actions'} affordable this round`:capacity.status==='unfunded'?`${capacity.shortfall} money short at round end`:capacity.status==='no-discs'?'No influence discs for another ordinary action':capacity.status==='passed'?(reactionsOnly?'Reactions only · Upgrade, Build or Move':'Passed · no ordinary actions remain'):'Eliminated · no ordinary actions remain';
 const compactLabel=capacity.status==='affordable'?`${capacity.actions} ${capacity.actions===1?'action':'actions'} affordable`:capacity.status==='unfunded'?`${capacity.shortfall} money short`:capacity.status==='no-discs'?'No discs left':capacity.status==='passed'?(reactionsOnly?'Reactions only':'Passed'):'Eliminated';
 const nextActionLabel=view.phase==='action'&&!f.passed&&!f.eliminated&&f.nextUpkeep!==null?`${progress?'Next new action':'Next action'}: ${f.nextUpkeep} upkeep · ${balanceLabel(f.nextBalance!)}`:null;
 const hoverBreakdown=`${capacityLabel}. ${reactionsOnly?reactionExplanation+' ':''}${f.influenceDiscs} influence discs · ${f.money} money + ${f.income} income − ${f.upkeep} upkeep = ${balanceLabel(f.balance)}. ${nextActionLabel??''}`;
 return <details className="dg-upkeep-summary">
  <summary aria-label={capacityLabel} title={hoverBreakdown}><span>This round <span aria-hidden="true">▾</span></span><strong className={capacity.status==='unfunded'?'dg-danger':''}>{compactLabel}</strong></summary>
  <div className="dg-upkeep-explanation"><h3>{reactionsOnly?'Reaction turns':'Affordable-action forecast'}</h3>{reactionsOnly&&<p>{reactionExplanation}</p>}<p aria-label={`Current upkeep: ${f.upkeep} money; ${f.balance<0?`${-f.balance} money short`:`${f.balance} money left`} at round end`}><span>Round-end upkeep</span> · {f.upkeep} money · {balanceLabel(f.balance)}</p>{nextActionLabel&&<p className={f.nextBalance!==null&&f.nextBalance<0?'dg-danger':''}>{nextActionLabel}</p>}<p>{f.money} money + {f.income} income − {f.upkeep} upkeep = {balanceLabel(f.balance)}</p><p>{f.influenceDiscs} influence discs remain. Starting an ordinary action moves one disc off your track; the newly uncovered number is your round-end upkeep bill, not an immediate money payment.</p>{progress&&<p>Your remaining {progress.action[0].toUpperCase()+progress.action.slice(1)} activation uses no additional disc.</p>}<p>Forecast assumes no further trading, direct spending, territory or income changes, or special effects.</p><p>Taking control of a sector also uses a disc. Research and construction have separate science or material costs. A shortfall explains risk; it does not block a legal action.</p></div>
 </details>;
}
