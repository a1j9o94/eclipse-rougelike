import {useEffect,useState} from 'react';
import type {MultiplayerTimerPublic} from '../../shared/eclipse/multiplayer';
import './room.css';
export type TurnClockTimer=Pick<MultiplayerTimerPublic,'status'|'deadlineAt'|'upkeepRound'>&{error?:string|null};
function formatTimeRemaining(milliseconds:number):string{
 const seconds=Math.max(0,Math.ceil(milliseconds/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60;
 return hours?`${hours}h ${minutes.toString().padStart(2,'0')}m`:`${minutes}:${rest.toString().padStart(2,'0')}`;
}
export default function TurnClock({timer,actorName,onRetry,disabled=false}:{timer:TurnClockTimer|null;actorName:string;onRetry?:()=>void;disabled?:boolean}){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const interval=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(interval);},[]);
 if(!timer||timer.status==='finished')return null;
 const expired=timer.deadlineAt<=now;
 return <div className={`dg-turn-clock ${expired?'is-expired':''}`} aria-label="Turn timer" title={`${timer.upkeepRound!==undefined?'Everyone’s upkeep':actorName} · AI finishes this turn if time runs out. Deadline ${new Date(timer.deadlineAt).toLocaleString()}`}>
  {timer.status==='failed'?<><span>AI takeover paused</span>{onRetry&&<button disabled={disabled} title={timer.error??undefined} onClick={onRetry}>Retry takeover</button>}</>:timer.status==='timed-out'?<span>AI finishing {actorName==='You'?'your turn':`${actorName}’s turn`}</span>:expired?<span>Time expired · waiting for AI</span>:<><time dateTime={new Date(timer.deadlineAt).toISOString()}>{formatTimeRemaining(timer.deadlineAt-now)}</time><span title={actorName}>{timer.upkeepRound!==undefined?'upkeep deadline':actorName==='You'?'your clock':actorName}</span></>}
 </div>;
}
