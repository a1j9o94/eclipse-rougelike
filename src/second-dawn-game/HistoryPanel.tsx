import {useLayoutEffect,useRef} from 'react';
import type {HistoryFeed} from '../second-dawn-session/useMatchHistory';
import './history.css';
import {CombatVolleyResult} from './CombatDecisionVisuals';
import {usePublicInspection} from './PublicInspectionContext';
import {historyPresentationLines} from './publicInspection';
export default function HistoryPanel({feed}:{feed:HistoryFeed}){
 const scroll=useRef<HTMLDivElement>(null);const previous=useRef({first:0,height:0});
 const inspection=usePublicInspection();
 useLayoutEffect(()=>{const node=scroll.current;if(!node)return;const first=feed.entries[0]?.revision??0;if(previous.current.first&&first!==previous.current.first&&node.scrollTop>0)node.scrollTop+=node.scrollHeight-previous.current.height;previous.current={first,height:node.scrollHeight};},[feed.entries]);
 return <section className="dg-history-panel"><header><h2>Action history</h2><p>Updates live · newest first</p></header><div ref={scroll} className="dg-history-scroll" role="log" aria-label="Match actions" aria-live="off" tabIndex={0}>
 {feed.loading&&<p>Loading saved actions…</p>}{!feed.loading&&!feed.entries.length&&<p>No actions yet. Human and AI actions will appear here.</p>}
 <ol>{feed.entries.map(entry=>{const volleys=entry.combatVolleys??(entry.combatVolley?[entry.combatVolley]:[]),presentation=historyPresentationLines(entry);return <li key={entry.revision}><div className="dg-history-byline"><strong>{entry.actorName}</strong><small>{entry.round===null?'':`Round ${entry.round} · `}#{entry.revision}</small></div><p>{entry.summary}</p>{presentation.length>0&&<p className="dg-history-presentation">{presentation.join(' · ')}</p>}{volleys.map((volley,index)=><CombatVolleyResult key={index} volley={volley}/>)} {inspection&&<button className="dg-history-inspect" onClick={()=>inspection.request({kind:'history',entry})}>Inspect public reference</button>}{entry.details.length>0&&<details><summary>Details</summary>{entry.details.map((detail,i)=><p key={i}>{detail}</p>)}</details>}</li>;})}</ol>
 {feed.error&&<p role="alert">{feed.error}</p>}{feed.hasOlder&&<button disabled={feed.loadingOlder} onClick={feed.loadOlder}>{feed.loadingOlder?'Loading earlier actions…':'Load earlier actions'}</button>}
 </div></section>;
}
