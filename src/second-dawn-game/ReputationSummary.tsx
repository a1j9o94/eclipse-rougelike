import type {PlayerView} from '../../shared/eclipse/types';
import ReputationTile from './ReputationTile';
import './reputationSummary.css';
export interface ReputationSummaryProps {view:PlayerView;onDismiss:()=>void}
/** Nonblocking private feedback. The engine already selected the tile; this submits no command. */
export default function ReputationSummary({view,onDismiss}:ReputationSummaryProps){
 const summary=view.private.reputationSummary;
 if(view.private.seatId!==view.viewerSeatId||!summary)return null;
 const sector=view.sectors.find(sector=>sector.id===summary.sectorId);
 const selectedIndex=summary.selected===null?-1:summary.drawn.indexOf(summary.selected);
 return <section className="dg-reputation-summary" aria-label="Your reputation result">
  <header><div><span className="dg-reputation-private"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3"/></svg>PRIVATE REPUTATION</span><small>Round {summary.round}{sector?` · Sector ${sector.tileId}`:''}</small></div><button type="button" onClick={onDismiss} aria-label="Dismiss reputation result">×</button></header>
  <div className="dg-reputation-result-body"><div className="dg-reputation-draw"><small>Drew</small><div role="group" aria-label="Reputation drawn">{summary.drawn.map((points,index)=><ReputationTile key={index} points={points} selected={index===selectedIndex}/>)}</div></div>
   <div className="dg-reputation-outcome"><strong role="status">{summary.selected===null?(summary.kept.length?'No improvement':'No new tile kept'):`Selected ${summary.selected} VP`}</strong><p>{summary.selected===null?(summary.kept.length?'Your best reputation stays with you.':'No tile was added to your reputation.'):'Your highest-value result is kept.'}</p></div>
  </div>
  <details><summary>Your reputation · {summary.kept.reduce((total,points)=>total+points,0)} VP</summary><div className="dg-reputation-kept" role="group" aria-label="Your retained reputation">{summary.kept.map((points,index)=><ReputationTile key={index} points={points}/>)}{!summary.kept.length&&<span>No reputation tiles held.</span>}</div><small>Visible only to you until the game ends.</small></details>
 </section>;
}
