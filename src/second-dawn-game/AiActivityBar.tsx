import type {ReactNode} from 'react';
import {getFaction} from '../../shared/eclipse/catalog';
import type {Seat} from '../../shared/eclipse/types';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import './aiActivity.css';
interface Props {children?:ReactNode;takeover?:boolean;thinking?:boolean;following?:boolean;onFollowChange?:(enabled:boolean)=>void;paused?:boolean;humanDecision?:boolean;actor:Seat|null;recent:PublicHistoryEntry|null;humanTurn:boolean;finished:boolean;motionEnabled:boolean;onMotionChange:(enabled:boolean)=>void;onWatch:()=>void}
export default function AiActivityBar({children,takeover=false,thinking=false,following=true,onFollowChange,humanDecision=false,paused=false,actor,recent,humanTurn,finished,motionEnabled,onMotionChange,onWatch}:Props){
 return <div className={`dg-ai-activity${actor?' is-computer-turn':''}${motionEnabled?' has-motion':''}`}>
  <div role="status" aria-live="polite" aria-atomic="true"><span className="dg-ai-signal" aria-hidden="true"/><strong>{finished?'Game complete':paused?'AI paused':takeover?`AI takeover · ${thinking?'thinking…':'finishing turn'}`:actor?`${getFaction(actor.faction).name} · ${thinking?'Thinking…':'AI turn'}`:humanTurn?(humanDecision?'Your decision':'Your turn'):'Waiting for another player'}</strong><span className="dg-ai-summary" key={recent?.revision??'waiting'}>{paused?'Use AI paused · retry to continue.':thinking?'Comparing plans…':recent?<><b>{recent.actorName}</b> · {recent.summary}</>:actor?'Choosing an action…':humanTurn?(humanDecision?'Resolve the current choice.':'Choose your next action.'):''}</span></div>
  {children}{(actor||recent)&&<button className="dg-ai-watch" onClick={onWatch}>Watch AI</button>}{onFollowChange&&<button aria-label="Follow AI" aria-pressed={following} onClick={()=>onFollowChange(!following)}>Follow AI {following?'on':'off'}</button>}<button className="dg-ai-motion" aria-label="Animations" aria-pressed={motionEnabled} onClick={()=>onMotionChange(!motionEnabled)}>Animations {motionEnabled?'on':'off'}</button>
 </div>;
}
