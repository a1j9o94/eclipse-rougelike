import {useEffect,useRef,useState} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import type {MatchPlayerView} from '../../convex/eclipseMatches';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import {getFaction} from '../../shared/eclipse/catalog';
import GameMenuPanel from './GameMenuPanel';
import RollbackDialog from './RollbackDialog';
interface Props {credential:string|null;matchId:Id<'eclipseMatchesV1'>|null;view:MatchPlayerView|null|undefined;connected:boolean;busy:boolean;onHome:()=>void;onRoom?:()=>void}
export function useGameRecoveryControls({credential,matchId,view,connected,busy,onHome,onRoom}:Props){
 const rollback=useQuery(api.eclipseRollback.getRollbackStatus,credential&&matchId?{credential,matchId}:'skip');
 const resign=useMutation(api.eclipseMatches.resignMatch),request=useMutation(api.eclipseRollback.requestRollback),respond=useMutation(api.eclipseRollback.respondRollback),cancel=useMutation(api.eclipseRollback.cancelRollback);
 const [menuOpen,setMenuOpen]=useState(false),[voteOpen,setVoteOpen]=useState(false),[target,setTarget]=useState<PublicHistoryEntry|null>(null),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [dismissedResolution,setDismissedResolution]=useState<number|null>(null);
 const resignationRequest=useRef<{commandId:string;expectedRevision:number}|null>(null);
 const scope=`${credential}:${matchId}`;
 const currentScope=useRef(scope);currentScope.current=scope;
 const pendingId=rollback?.pending?.id;
 useEffect(()=>{setMenuOpen(false);setVoteOpen(false);setTarget(null);setError('');setWorking(false);resignationRequest.current=null;setDismissedResolution(null);},[scope]);
 useEffect(()=>{if(pendingId){setVoteOpen(true);setTarget(null);setMenuOpen(false);setError('');}else setVoteOpen(false);},[pendingId]);
 const participation=view?.participation??'active';
 const blockedReason=view?.matchLifecycle==='abandoned'?'This solo run has ended.':participation==='resigned'?'You resigned. AI controls your civilization.':rollback?.pending?'Game paused for an undo request.':undefined;
 const disabled=!connected||busy||working;
 async function perform(action:(stillCurrent:()=>boolean)=>Promise<void>){if(disabled||!credential||!matchId||!view)return;const stillCurrent=()=>currentScope.current===scope;setWorking(true);setError('');try{await action(stillCurrent);}catch(cause){if(stillCurrent())setError(cause instanceof Error?cause.message:'Could not update the game. Please retry.');}finally{if(stillCurrent())setWorking(false);}}
 const openMenu=()=>{setError('');setMenuOpen(true);};
 const historyRollback={isHost:rollback?.isHost??false,disabled:disabled||!!blockedReason,onSelect:(entry:PublicHistoryEntry)=>{setError('');setTarget(entry);setMenuOpen(false);}};
 const closeDialog=()=>{setTarget(null);setVoteOpen(false);setError('');};
 const names=Object.fromEntries((view?.seats??[]).map(seat=>[seat.id,`${getFaction(seat.faction).name}${view?.playerNames?.[seat.id]?` · ${view.playerNames[seat.id]}`:''}`]));
 const resolution=rollback?.lastResolution;
 return {
  openMenu,historyRollback,blockedReason,working,rollbackRevision:resolution?.appliedRevision??0,
  banner:blockedReason?<div className="dg-recovery-banner" role="status"><span>{blockedReason}</span>{rollback?.pending?<button onClick={()=>{setTarget(null);setVoteOpen(true);}}>Review undo request</button>:<button onClick={onHome}>Return home</button>}</div>:resolution&&dismissedResolution!==resolution.resolvedAt?<div className="dg-recovery-banner" role="status"><span>{resolution.status==='applied'?`Game restored to before action #${resolution.targetRevision}.`:resolution.status==='rejected'?'Undo declined. The current game continues.':'Undo cancelled. The current game continues.'}</span><button aria-label="Dismiss undo result" onClick={()=>setDismissedResolution(resolution.resolvedAt)}>×</button></div>:null,
  dialogs:<>{menuOpen&&<GameMenuPanel outcome={view?.canResign?view.resignOutcome:undefined} disabled={disabled||!!rollback?.pending} error={error} onClose={()=>setMenuOpen(false)} onHome={()=>{setMenuOpen(false);onHome();}} onRoom={onRoom?()=>{setMenuOpen(false);onRoom();}:undefined} onResign={()=>{void perform(async(stillCurrent)=>{if(!credential||!matchId||!view)return;resignationRequest.current??={commandId:crypto.randomUUID(),expectedRevision:view.revision};const result=await resign({credential,matchId,...resignationRequest.current});if(!stillCurrent())return;if(!result.ok){resignationRequest.current=null;throw new Error(result.error.message);}resignationRequest.current=null;setMenuOpen(false);onHome();});}}/>}
  {rollback&&view&&(target||voteOpen&&rollback.pending)&&<RollbackDialog status={rollback} target={target} viewerSeatId={view.viewerSeatId} seatNames={names} humanCount={view.seats.filter(seat=>seat.controller==='human').length} disabled={disabled} error={error} onClose={closeDialog} onRequest={()=>{void perform(async(stillCurrent)=>{if(!credential||!matchId||!target||!view)return;await request({credential,matchId,targetRevision:target.revision,expectedRevision:view.revision});if(stillCurrent())setTarget(null);});}} onRespond={approve=>{void perform(async()=>{if(!credential||!matchId||!rollback.pending)return;await respond({credential,matchId,rollbackId:rollback.pending.id as Id<'eclipseRollbacksV1'>,approve});});}} onCancel={()=>{void perform(async()=>{if(!credential||!matchId||!rollback.pending)return;await cancel({credential,matchId,rollbackId:rollback.pending.id as Id<'eclipseRollbacksV1'>});});}}/>}</>,
 };
}
