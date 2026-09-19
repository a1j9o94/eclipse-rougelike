import {useState} from 'react';
import GameDialog from './GameDialog';
export interface GameMenuPanelProps {
 outcome?:'abandoned'|'resigned';disabled:boolean;error?:string;
 onHome:()=>void;onRoom?:()=>void;onClose:()=>void;onResign?:()=>void;
}
export default function GameMenuPanel({outcome,disabled,error,onHome,onRoom,onClose,onResign}:GameMenuPanelProps){
 const [confirming,setConfirming]=useState(false);
 const solo=outcome==='abandoned';
 return <GameDialog title="Game menu" onClose={onClose}>
 {confirming?<><h3>{solo?'Quit this game?':'Resign from this game?'}</h3><p>{solo?'This will end this solo run. Its board stays in your past games, but you cannot resume playing it.':'AI will take over your civilization permanently so the other players can continue. You can still view the game.'}</p><div className="dg-game-control-actions"><button onClick={()=>setConfirming(false)}>Keep playing</button><button className="dg-destructive" disabled={disabled} onClick={onResign}>{solo?'Confirm quit':'Confirm resignation'}</button></div></>:<><p>Your accepted actions are saved automatically. You can leave and return later.</p><div className="dg-game-control-actions"><button onClick={onHome}>Save &amp; return home</button>{onRoom&&<button onClick={onRoom}>Open game room</button>}{outcome&&onResign&&<button className="dg-destructive" onClick={()=>setConfirming(true)}>{solo?'Quit this game':'Resign from game'}</button>}</div></>}
 {error&&<p role="alert">{error}</p>}
 </GameDialog>;
}
