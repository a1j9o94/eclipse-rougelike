import './reputationSummary.css';
/** Read-only version of the gold reputation tokens used on the diplomacy board. */
export default function ReputationTile({points,selected=false}:{points:number;selected?:boolean}){
 return <span className={`dg-reputation-result-tile${selected?' is-selected':''}`} role="img" aria-label={`${points} VP reputation${selected?', selected':''}`}>
  <svg viewBox="0 0 60 68" aria-hidden="true"><circle className="dg-reputation-tile-outline" cx="30" cy="34" r="27"/><circle className="dg-reputation-tile-inset" cx="30" cy="34" r="23"/><path className="dg-reputation-tile-star" d="m30 10 2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z"/></svg>
  <strong>{points}</strong><small>VP</small>{selected&&<b aria-hidden="true">✓</b>}
 </span>;
}
