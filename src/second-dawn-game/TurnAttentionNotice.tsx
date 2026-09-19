import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {PlayerView} from '../../shared/eclipse/types';
import './turnAttentionNotice.css';

export interface TurnAttentionNoticeProps {
 view:PlayerView;
 matchScope?:string;
 connected?:boolean;
 /** Hide behind settings, history, recaps and inspection overlays. Keep this component mounted. */
 suppressed?:boolean;
 /** Navigation only: show the player's existing turn controls. */
 onOpenTurn:()=>void;
 /** Navigation only: open upkeep review; never submit finish-upkeep from this callback. */
 onReviewUpkeep:()=>void;
}
interface AttentionMessage {boundary:string;kind:'turn'|'upkeep'}
function subscribeVisibility(notify:()=>void):()=>void{
 document.addEventListener('visibilitychange',notify);
 return()=>document.removeEventListener('visibilitychange',notify);
}
const foreground=()=>!document.hidden;

/** A cosmetic attention cue, independent of commands, private choices and native notifications. */
export default function TurnAttentionNotice({view,matchScope='current-match',connected=true,suppressed=false,onOpenTurn,onReviewUpkeep}:TurnAttentionNoticeProps){
 const visible=useSyncExternalStore(subscribeVisibility,foreground,()=>false);
 const seat=view.seats.find(candidate=>candidate.id===view.viewerSeatId);
 const kind=view.phase==='upkeep'?'upkeep':'turn';
 const effectiveOwner=view.waitingFor?.owner??view.pendingDecision?.owner??view.activeSeatId;
 const ownsTurn=seat?.controller==='human'&&!seat.eliminated&&effectiveOwner===view.viewerSeatId&&(view.phase==='action'||view.phase==='upkeep');
 const decisionActive=Boolean(view.pendingDecision||view.waitingFor);
 const actionInProgress=view.actionProgress?.owner===view.viewerSeatId;
 const ownDecision=view.pendingDecision?.owner===view.viewerSeatId||view.waitingFor?.owner===view.viewerSeatId;
 const boundary=JSON.stringify([matchScope,view.viewerSeatId,view.round,view.phase,view.actionTurnSerial??null]);
 const previous=useRef({boundary:'',ownsTurn:false});
 const acknowledged=useRef(false);
 const [message,setMessage]=useState<AttentionMessage|null>(null);
 useEffect(()=>{
  const newTurn=previous.current.boundary!==boundary||ownsTurn&&!previous.current.ownsTurn;
  previous.current={boundary,ownsTurn};
  if(newTurn)acknowledged.current=false;
  // A deliberate choice already owns the player's attention; don't announce it again afterward.
  if(ownDecision||actionInProgress)acknowledged.current=true;
  if(!ownsTurn||!visible||!connected||suppressed||decisionActive||acknowledged.current){setMessage(null);return;}
  setMessage(current=>current?.boundary===boundary&&current.kind===kind?current:{boundary,kind});
 },[boundary,ownsTurn,ownDecision,actionInProgress,decisionActive,visible,connected,suppressed,kind]);
 const dismiss=()=>{acknowledged.current=true;setMessage(null);};
 // Guard the render too: an obsolete CTA must disappear before effects observe the next view.
 if(!message||message.boundary!==boundary||!ownsTurn||!visible||!connected||suppressed||decisionActive)return null;
 const upkeep=message.kind==='upkeep';
 return <aside className="dg-turn-attention" aria-label={upkeep?'Upkeep notification':'Turn notification'}>
  <span className="dg-turn-attention-symbol" aria-hidden="true">{upkeep?'◈':'✦'}</span>
  <div className="dg-turn-attention-copy">
   <div role="status" aria-live="polite" aria-atomic="true">
    <strong>{upkeep?'Upkeep is ready':'Your turn'}</strong>
    <p>{upkeep?'Review production and upkeep before continuing.':seat?.passed?'Your reaction turn is ready.':'Your civilization is ready for its next action.'}</p>
   </div>
   <button type="button" className="dg-turn-attention-action" onClick={()=>{dismiss();if(upkeep)onReviewUpkeep();else onOpenTurn();}}>{upkeep?'Review upkeep':'View turn'}</button>
  </div>
  <button type="button" className="dg-turn-attention-dismiss" aria-label={upkeep?'Dismiss upkeep notice':'Dismiss turn notice'} onClick={dismiss}>×</button>
 </aside>;
}
