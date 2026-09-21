import {useContext,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import GameDialog from './GameDialog';
import {ActionConfirmationContext} from './actionConfirmationContext';
import './turnAttentionNotice.css';
interface Props {
 ready:boolean;
 noticeKey:string;
 title:string;
 description:string;
 confirmLabel:string;
 onConfirm:()=>void;
 children?:ReactNode;
}
function subscribeVisibility(notify:()=>void){document.addEventListener('visibilitychange',notify);return()=>document.removeEventListener('visibilitychange',notify);}
const foreground=()=>!document.hidden;
/** A complete plan still needs the player's explicit commitment. */
export default function ActionConfirmationNotice({ready,noticeKey,title,description,confirmLabel,onConfirm,children}:Props){
 const context=useContext(ActionConfirmationContext);
 const local=useRef(new Set<string>());
 const acknowledged=context?.acknowledged??local.current;
 const [,refresh]=useState(0);
 const visible=useSyncExternalStore(subscribeVisibility,foreground,()=>false);
 const scopedKey=JSON.stringify([context?.key,noticeKey]);
 const dismiss=()=>{acknowledged.add(scopedKey);refresh(value=>value+1);};
 if(!ready||!visible||context?.suppressed||acknowledged.has(scopedKey))return null;
 return <GameDialog title={title} onClose={dismiss} closeLabel="Dismiss confirmation notice" dismissOnBackdrop={false} className="dg-turn-attention" focusPrimary>
  <p>{description}</p>
  {children}
  <button type="button" className="dg-primary dg-turn-attention-action" onClick={()=>{dismiss();onConfirm();}}>{confirmLabel}</button>
  <button type="button" className="dg-turn-attention-action" onClick={dismiss}>Keep editing</button>
 </GameDialog>;
}
