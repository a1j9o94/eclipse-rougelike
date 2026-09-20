import {useState} from 'react';
import {useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import type {LeaderboardRow,LeaderboardSort} from '../../shared/eclipse/ratings';
import {getFaction} from '../../shared/eclipse/catalog';
import FactionSymbol from './FactionSymbol';
import './leaderboard.css';
export function LeaderboardView({rows,sort,onSort,onClose}:{rows:LeaderboardRow[]|undefined;sort:LeaderboardSort;onSort:(sort:LeaderboardSort)=>void;onClose:()=>void}){
 return <div className="dg-leaderboard-page"><main className="dg-leaderboard"><header><div><p className="sd-eyebrow">MULTIPLAYER RECORDS</p><h1>Leaderboard</h1></div><button onClick={onClose}>Back to games</button></header>
  <p className="dg-leaderboard-scope">Finished games with at least two human players. Solo games do not count.</p>
  <div className="dg-leaderboard-sort" role="group" aria-label="Rank players by">{([['rating','Elo'],['wins','Wins'],['win-rate','Win %']] as const).map(([key,label])=><button key={key} aria-pressed={key===sort} onClick={()=>onSort(key)}>{label}</button>)}</div>
  {rows===undefined?<p role="status">Loading multiplayer records…</p>:rows.length===0?<p className="dg-leaderboard-empty">No completed multiplayer games yet.</p>:<ol className="dg-leaderboard-list">{rows.map((row,index)=><li key={row.playerId}><article aria-label={`${row.username} multiplayer record`}><div className="dg-leaderboard-player"><span className="dg-leaderboard-rank" aria-label={`Rank ${index+1}`}>{index+1}</span><h2>{row.username}</h2><span>{row.games} {row.games===1?'game':'games'}</span></div><dl className="dg-leaderboard-numbers"><div><dt>Elo</dt><dd>{Math.round(row.rating).toLocaleString('en-US')}</dd></div><div><dt>Wins</dt><dd>{row.wins}</dd></div><div><dt>Win %</dt><dd>{Math.round(row.winRate*100)}%</dd></div></dl><details className="dg-leaderboard-factions"><summary>Wins by faction</summary><div>{row.factionWins.map(record=><div key={record.faction}><FactionSymbol faction={record.faction}/><span><strong>{getFaction(record.faction).name}</strong><small>{record.wins} {record.wins===1?'win':'wins'} · {record.games} {record.games===1?'game':'games'}</small></span></div>)}</div></details></article></li>)}</ol>}
  <details className="dg-leaderboard-rules"><summary>How ratings work</summary><p>Everyone starts at 1,000 Elo. Each completed multiplayer game compares your finishing position with each human opponent; beating a higher-rated player earns more. The adjustment averages those comparisons, using K = 32. AI opponents have no Elo.</p><p>Wins use the final game ranking, including AI opponents and resource tiebreakers. Shared first place counts as a win for each tied winner. A resigned player receives a loss. Rewinding a completed game removes its recorded result and rating adjustment; later games keep the adjustments they already earned.</p><p>The leaderboard shows up to 100 players in the selected order. Win percentage includes all of each player’s completed multiplayer games.</p></details>
 </main></div>;
}
export default function Leaderboard({onClose}:{onClose:()=>void}){
 const [sort,setSort]=useState<LeaderboardSort>('rating');
 const result=useQuery(api.eclipseLeaderboard.getLeaderboard,{sort});
 return <LeaderboardView rows={result?.rows} sort={sort} onSort={setSort} onClose={onClose}/>;
}
