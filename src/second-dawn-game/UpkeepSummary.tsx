import {useRef,useState} from 'react';
import type {PlayerView} from '../../shared/eclipse/types';
import {affordableActionCapacity,upkeepForecast} from './upkeepForecast';
import './upkeep.css';
import './activityPrimitives.css';
export default function UpkeepSummary({view,onOpenTracks}:{view:PlayerView;onOpenTracks?:()=>void}){
 const [open,setOpen]=useState(false);
 const summaryRef=useRef<HTMLElement>(null);
 if(view.phase==='finished')return null;
 const f=upkeepForecast(view),capacity=affordableActionCapacity(f);
 const actions=`${capacity.actions} ${capacity.actions===1?'action':'actions'} affordable`;
 const label=view.phase!=='action'?(view.phase==='combat'?'Combat':view.phase==='upkeep'?'Upkeep':'Round end')
  :capacity.status==='passed'?'Passed':capacity.status==='eliminated'?'Eliminated':capacity.status==='no-discs'?'No action discs':actions;
 const description=label===actions?`${capacity.actions} more ${capacity.actions===1?'action':'actions'} affordable this round`:label;
 return <details className="dg-upkeep-summary dg-cost-inspect" open={open} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);summaryRef.current?.focus();}}}>
  <summary ref={summaryRef} aria-label={`${description}. Double-click for income and upkeep details`} title="Double-click for income and upkeep details. Keyboard: Enter or Space."
   onClick={event=>{event.preventDefault();if(event.detail===0)setOpen(current=>!current);}}
   onDoubleClick={event=>{event.preventDefault();setOpen(current=>!current);}}
   onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setOpen(current=>!current);}}}>
   <strong className={f.balance<0?'dg-danger':''}>{label}</strong>
  </summary>
  <div><h3>Round-end balance</h3><dl><dt>Held</dt><dd>{f.money}</dd><dt>Income</dt><dd>+{f.income}</dd><dt>Upkeep</dt><dd>−{f.upkeep}</dd><dt>After upkeep</dt><dd>{f.balance}</dd>{capacity.status==='affordable'&&<><dt>Extra action discs covered</dt><dd>{capacity.actions}</dd></>}</dl><small>Purchase costs and later income changes also affect this balance.</small>{onOpenTracks&&<button onClick={onOpenTracks}>Inspect economy tracks</button>}</div>
 </details>;
}
