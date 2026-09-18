import type {MatchSummary} from '../../convex/eclipseMatches';
import {roomInvitePath,type MultiplayerRoomLobby} from '../../shared/eclipse/multiplayer';
import './savedGames.css';
type SavedRoom=Pick<MultiplayerRoomLobby,'roomToken'|'status'|'settings'|'matchId'>;
interface Props {matches:readonly MatchSummary[]|undefined;rooms:readonly SavedRoom[]|undefined;onOpen:(match:MatchSummary)=>void}
export default function SavedGames({matches,rooms,onOpen}:Props){
 const completed=matches?.filter(match=>match.phase==='finished')??[];
 const active=matches?.filter(match=>match.phase!=='finished')??[];
 const completedIds=new Set(completed.map(match=>String(match.matchId)));
 const activeRooms=rooms?.filter(room=>room.status!=='finished'&&(!room.matchId||!completedIds.has(room.matchId)))??[];
 // Keep old rooms discoverable even if a corresponding match is not in the
 // current player's ownership list; avoid listing the same completed game twice.
 const completedRooms=rooms?.filter(room=>room.status==='finished'&&!matches?.some(match=>match.matchId===room.matchId))??[];
 const completeCount=completed.length+completedRooms.length;
 const matchCard=(match:MatchSummary,finished:boolean)=><button key={match.matchId} onClick={()=>onOpen(match)}><strong>{finished?'View results':`Continue · round ${match.round} / 8`}</strong><span>{match.playerCount} players · {finished?'Completed':match.phase} · {new Date(match.updatedAt).toLocaleDateString()}</span></button>;
 return <>
  {activeRooms.length>0&&<section className="dg-room-saves"><h2>Your game rooms</h2><div className="dg-saves">{activeRooms.map(saved=><a key={saved.roomToken} href={roomInvitePath(saved.roomToken)}><strong>{saved.status==='waiting'?'Open room':'Continue room game'}</strong><span> · {saved.settings.humanSeatCount} human players · {saved.settings.aiCount} AI · {saved.status}</span></a>)}</div></section>}
  <section aria-label="Active games"><h2>Active games</h2>{matches===undefined?<p>Looking for saves…</p>:active.length===0?<p>{completeCount?'No games in progress. Start a new galaxy when you’re ready.':'No saved Second Dawn games yet.'}</p>:<div className="dg-saves">{active.map(match=>matchCard(match,false))}</div>}</section>
  {completeCount>0&&<details className="dg-completed-games"><summary>Completed games ({completeCount})</summary><p>Your results stay saved here.</p><div className="dg-saves">{completed.map(match=>matchCard(match,true))}{completedRooms.map(room=><a key={room.roomToken} href={roomInvitePath(room.roomToken)}><strong>View room results</strong><span> · {room.settings.humanSeatCount} human players · {room.settings.aiCount} AI · Completed</span></a>)}</div></details>}
 </>;
}
