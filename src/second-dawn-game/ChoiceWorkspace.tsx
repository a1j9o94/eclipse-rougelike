import {useEffect,useRef,type ReactNode} from 'react';
import type {PendingDecision} from '../../shared/eclipse/types';

import {choiceLabel} from './choiceLabels';

/** Stay mounted when hidden: the child owns uncommitted allocations and selections. */
export default function ChoiceWorkspace({decision,open,onMinimize,children}:{decision:PendingDecision;open:boolean;onMinimize:()=>void;children:ReactNode}){
 const minimize=useRef<HTMLButtonElement>(null),label=choiceLabel(decision);
 const diplomacy=decision.kind==='diplomacy'||decision.kind==='diplomacy-window';
 useEffect(()=>{if(open)minimize.current?.focus({preventScroll:true});},[open,decision.id]);
 return <div className={`dg-choice-workspace${decision.kind==='exploration'?' dg-choice-placement':''}`} hidden={!open} role="dialog" aria-modal="false" aria-label={`${label[0].toUpperCase()}${label.slice(1)} choice`} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onMinimize();}}}>
  <header className="dg-choice-header"><div><span className="sd-eyebrow">YOUR CHOICE</span><strong>{label[0].toUpperCase()+label.slice(1)}</strong></div><button ref={minimize} onClick={onMinimize} aria-label={diplomacy?'View galaxy':`Minimize ${label}`} title="Keep your selections and inspect the galaxy">{diplomacy?'View galaxy':'− Minimize'}</button></header>
  <div className="dg-choice-body">{children}</div>
 </div>;
}
