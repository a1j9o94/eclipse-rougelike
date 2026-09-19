import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import type {RollbackStatus} from '../../shared/eclipse/rollback';
import GameDialog from './GameDialog';
export interface RollbackDialogProps {
 verifying?:boolean;status:RollbackStatus;target:PublicHistoryEntry|null;viewerSeatId:string;seatNames:Record<string,string>;humanCount:number;disabled:boolean;error?:string;
 onClose:()=>void;onRequest:()=>void;onRespond:(approve:boolean)=>void;onCancel:()=>void;
}
export default function RollbackDialog({verifying=false,status,target,viewerSeatId,seatNames,humanCount,disabled,error,onClose,onRequest,onRespond,onCancel}:RollbackDialogProps){
 const pending=status.pending,revision=pending?.targetRevision??target?.revision;
 if(revision===undefined)return null;
 const needsVote=pending?.requiredSeatIds.includes(viewerSeatId)&&!pending.approvedSeatIds.includes(viewerSeatId);
 return <GameDialog title="Undo game actions" onClose={onClose}>
 <div className="dg-rollback-target"><small>Restore before action #{revision}</small><strong>{pending?.targetSummary??target?.summary}</strong>{target&&<p>{target.actorName} · Round {target.round??'—'}</p>}</div>
 <p>The current game will be replaced by this saved position, including its resources, fleets, combat and outstanding choices. This action and everything after it will be removed from History.</p>
 <p>Undo restores the saved draws and dice state. It cannot make players forget information already revealed.</p>
 {pending?<><p>The game is paused while players decide. AI agrees automatically.</p><ul className="dg-rollback-votes">{pending.requiredSeatIds.map(id=><li key={id}><span>{seatNames[id]??id}</span><strong>{pending.approvedSeatIds.includes(id)?'Approved':'Waiting'}</strong></li>)}</ul><div className="dg-game-control-actions">{needsVote&&<><button className="dg-primary" disabled={disabled} onClick={()=>onRespond(true)}>Approve undo</button><button disabled={disabled} onClick={()=>onRespond(false)}>Keep current game</button></>}{status.isHost&&<button disabled={disabled} onClick={onCancel}>Cancel undo request</button>}</div></>:<><p>{humanCount>1?'Every other human player must approve. AI agrees automatically.':'This is a solo game. Undo takes effect immediately; AI agrees automatically.'}</p><div className="dg-game-control-actions"><button onClick={onClose}>Keep current game</button><button className="dg-primary" disabled={disabled||!status.isHost||!target?.rollbackAvailable} onClick={onRequest}>{humanCount>1?'Request undo':'Undo now'}</button></div></>}
 {verifying&&<p role="status">Verifying earlier game history…</p>}
 {error&&<p role="alert">{error}</p>}
 </GameDialog>;
}
