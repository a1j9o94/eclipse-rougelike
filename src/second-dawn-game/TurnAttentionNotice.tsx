import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {PlayerView} from '../../shared/eclipse/types';
import {getFaction} from '../../shared/eclipse/catalog';
import GameDialog from './GameDialog';
import FactionSymbol from './FactionSymbol';
import {seatColor} from './factionColors';
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

/** Explicitly acknowledge an incoming turn; callbacks only navigate, never submit commands. */
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
 return <GameDialog title={upkeep?'Upkeep is ready':'Your turn'} onClose={dismiss} dismissOnBackdrop={false} closeLabel={upkeep?'Dismiss upkeep notice':'Dismiss turn notice'} className="dg-turn-attention" focusPrimary>
  {seat&&<div className="dg-turn-attention-civilization">
   <span className="dg-turn-attention-emblem" style={{color:seatColor(seat)}}><FactionSymbol faction={seat.faction}/></span>
   <div><small>Round {view.round} / 8</small><strong>{getFaction(seat.faction).name}</strong></div>
  </div>}
  <p>{upkeep?'Review your production and upkeep, then confirm when you are ready.':seat?.passed?'You have passed. Choose a reaction or continue passing.':'Choose your next action and lead your civilization forward.'}</p>
  <button type="button" className="dg-primary dg-turn-attention-action" onClick={()=>{dismiss();if(upkeep)onReviewUpkeep();else onOpenTurn();}}>{upkeep?'Review upkeep':'View turn'}</button>
 </GameDialog>;
}
