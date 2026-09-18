import type { HistoryFeed } from '../second-dawn-session/useMatchHistory';
import './activityRecap.css';
interface Props {
 baseline:number|null; throughRevision:number; feed:HistoryFeed; disabled:boolean; saving:boolean;
 error:string|null; onDismiss:()=>void;
}
export default function ActivityRecap({baseline,throughRevision,feed,disabled,saving,error,onDismiss}:Props){
 const entries=feed.entries.filter(entry=>entry.revision>(baseline??0)&&entry.revision<=throughRevision);
 const oldest=feed.entries.at(-1)?.revision;
 const incomplete=feed.hasOlder&&(oldest===undefined||oldest>(baseline??0)+1);
 return <section className="sd-activity-recap" data-through-revision={throughRevision} aria-label="Return to your game">
  <p className="sd-eyebrow">WELCOME BACK</p>
  <h2>{baseline===null?'Recent activity':'Since you last played'}</h2>
  <p>{baseline===null?'Here are the latest public actions in this game.':'Catch up on the public actions you missed.'}</p>
  {feed.loading?<p role="status">Loading saved activity…</p>:<ol>{entries.map(entry=><li key={entry.revision}>
   <div><strong>{entry.actorName}</strong><small>{entry.round!==null?`Round ${entry.round}`:''}</small></div>
   <p>{entry.summary}</p>{entry.details.length>0&&<details><summary>Action details</summary>{entry.details.map((detail,index)=><p key={index}>{detail}</p>)}</details>}
  </li>)}</ol>}
  {!feed.loading&&!entries.length&&<p>No actions in this interval are loaded yet.</p>}
  {incomplete&&<button disabled={feed.loadingOlder} onClick={feed.loadOlder}>{feed.loadingOlder?'Loading…':'Load earlier activity'}</button>}
  {(error||feed.error)&&<p role="alert">{error??feed.error}</p>}
  <footer><button className="sd-primary" disabled={disabled||saving||feed.loading} onClick={onDismiss}>{saving?'Saving…':'Continue game'}</button><small>Your other devices will remember you’ve caught up.</small></footer>
 </section>;
}
