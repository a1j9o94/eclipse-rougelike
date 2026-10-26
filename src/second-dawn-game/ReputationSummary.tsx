import type {PlayerView} from '../../shared/eclipse/types';
import ReputationTile from './ReputationTile';
import './reputationSummary.css';
export interface ReputationSummaryProps {view:PlayerView;onDismiss:()=>void;compact?:boolean}
/** Nonblocking private feedback. The engine already selected the tile; this submits no command. */
export default function ReputationSummary({view,onDismiss,compact=false}:ReputationSummaryProps){
 const summary=view.private.reputationSummary;
 if(view.private.seatId!==view.viewerSeatId||!summary)return null;
 const sector=view.sectors.find(sector=>sector.id===summary.sectorId);
 const selectedIndex=summary.selected===null?-1:summary.drawn.indexOf(summary.selected);
 const outcome=summary.selected===null?(summary.kept.length?'No improvement':'No new tile kept'):`Kept ${summary.selected} VP`;
 const drawn=<div className="dg-reputation-draw"><small>Drew</small><div role="group" aria-label="Reputation drawn">{summary.drawn.map((points,index)=><ReputationTile key={index} points={points} selected={index===selectedIndex}/>)}</div></div>;
 const retained=<details><summary>Your reputation · {summary.kept.reduce((total,points)=>total+points,0)} VP</summary><div className="dg-reputation-kept" role="group" aria-label="Your retained reputation">{summary.kept.map((points,index)=><ReputationTile key={index} points={points}/>)}{!summary.kept.length&&<span>No reputation tiles held.</span>}</div><small>Visible only to you until the game ends.</small></details>;
 if(compact)return <section className="dg-reputation-summary is-compact" aria-label="Your reputation result">
  <details className="dg-reputation-disclosure"><summary>{summary.selected!==null&&<ReputationTile points={summary.selected} selected/>}<span><strong role="status">{outcome}</strong><small>Private reputation · details</small></span></summary>
   <div className="dg-reputation-result-body">{drawn}</div>{retained}
  </details>
 </section>;
 return <section className="dg-reputation-summary" aria-label="Your reputation result">
  <header><div><span className="dg-reputation-private"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3"/></svg>PRIVATE REPUTATION</span><small>Round {summary.round}{sector?` · Sector ${sector.tileId}`:''}</small></div><button type="button" onClick={onDismiss} aria-label="Dismiss reputation result">×</button></header>
  <div className="dg-reputation-result-body">{drawn}
   <div className="dg-reputation-outcome"><strong role="status">{outcome}</strong></div>
  </div>
  {retained}
 </section>;
}
