import {gameRules} from '../../shared/eclipse/gameRules';
import {seatColor} from './factionColors';
import type {CSSProperties} from 'react';
import {getFaction} from '../../shared/eclipse/catalog';
import {rankScores,type ScoreBreakdown} from '../../shared/eclipse/scoring';
import type {PlayerView} from '../../shared/eclipse/types';
import type {PublicScoreCategory} from './publicInspection';
import FactionSymbol from './FactionSymbol';
import './scoreWorkspace.css';

const categories:{id:PublicScoreCategory;label:string;color:string;path:string}[]=[
 {id:'sectors',label:'Sectors',color:'#87c5e0',path:'M12 2 21 7v10l-9 5-9-5V7Z M3 7l9 5 9-5 M12 12v10'},
 {id:'research',label:'Research',color:'#b6a0e1',path:'M9 2h6 M10 2v7l-7 11q-1 2 2 2h14q3 0 2-2L14 9V2 M6 16h12'},
 {id:'reputation',label:'Reputation',color:'#e4bc72',path:'M12 2 21 7v10l-9 5-9-5V7Z M12 6l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z'},
 {id:'discoveries',label:'Discoveries',color:'#d6d493',path:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z'},
 {id:'ambassadors',label:'Ambassadors',color:'#82cbb0',path:'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 22v-4c0-6 16-6 16 0v4'},
 {id:'minorSpecies',label:'Minor Species',color:'#b7c994',path:'M12 2 21 7v10l-9 5-9-5V7Z M8 10a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M7 20v-2c0-5 10-5 10 0v2'},
 {id:'monoliths',label:'Monoliths',color:'#a2b4ce',path:'M8 3 16 1v20l-8 2Z M8 3l5 2v17 M13 5l3-4'},
 {id:'portals',label:'Portals',color:'#80cad0',path:'M7 12a5 10 0 1 0 10 0a5 10 0 1 0-10 0 M1 12h22 M18 8l5 4-5 4'},
 {id:'species',label:'Faction bonus',color:'#dfa884',path:'M12 2 22 12 12 22 2 12Z M7 12l5-5 5 5-5 5Z'},
 {id:'variant',label:'Variant bonuses',color:'#b8dab2',path:'M12 2 22 12 12 22 2 12Z M8 12h8 M12 8v8'},
 {id:'traitor',label:'Traitor',color:'#eb979c',path:'M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6Z M8 8l8 8 M16 8l-8 8'},
];
interface Props {
 view:PlayerView;scores:readonly ScoreBreakdown[];playerNames:Record<string,string>;
 onInspect:(seatId:string,category:PublicScoreCategory)=>void;
 onHome:()=>void;onPlayAgain:()=>void;onGalaxy:()=>void;
}
export default function ScoreWorkspace({view,scores,playerNames,onInspect,onHome,onPlayAgain,onGalaxy}:Props){
 const final=view.phase==='finished';
 const publicReputation=final||gameRules(view).publicReputation;
 const visibleCategories=categories.filter(category=>(category.id!=='variant'||gameRules(view).explorationRules||gameRules(view).discoveryVariant||gameRules(view).technologyVariant)&&(category.id!=='minorSpecies'||view.minorSpecies||view.seats.some(seat=>seat.minorSpecies?.length)));
 const ranks=rankScores(scores);
 const sorted=ranks.flatMap(rank=>rank.players.map(id=>({score:scores.find(score=>score.playerId===id)!,rank})));
 const winners=ranks[0]?.players??[];
 const name=(id:string)=>getFaction(view.seats.find(seat=>seat.id===id)!.faction).name;
 return <div className="sd-workspace dg-score-workspace">
  <header className="dg-score-heading">
   <div><p className="sd-eyebrow">{final?`THE FINAL DAWN · ROUND ${view.round}`:'YOUR EMPIRE’S PROGRESS'}</p><h1>{final?'Final standings':'Public victory points'}</h1>
    <p>{final?'Every discovery, alliance and conquest has left its mark.':(publicReputation?'All reputation and variant bonuses are public.':'Your empire, one achievement at a time. Reputation stays hidden until the game ends.')}</p>
   </div>
   {final&&<div className="dg-endgame-actions"><button className="sd-primary" onClick={onPlayAgain}>Play again</button><button onClick={onHome}>Return home</button><button onClick={onGalaxy}>View final galaxy</button></div>}
  </header>
  {final&&winners.length>0&&<div className="dg-victory-banner">
   <div className="dg-victory-emblems">{winners.map(id=><FactionSymbol key={id} faction={view.seats.find(seat=>seat.id===id)!.faction}/>)}</div>
   <div><span className="sd-eyebrow">{winners.length>1?'SHARED VICTORY':'VICTORY'}</span><strong>{winners.map(name).join(' & ')}</strong><p>Reputation revealed · remaining resources break VP ties.</p></div>
  </div>}
  <section aria-label="Standings" className="dg-score-cards">
   {sorted.map(({score,rank})=>{
    const seat=view.seats.find(seat=>seat.id===score.playerId)!;const faction=getFaction(seat.faction);
    const positiveTotal=visibleCategories.reduce((sum,c)=>sum+Math.max(0,c.id==='reputation'&&!publicReputation?0:score[c.id]??0),0);
    const winner=final&&rank.place===1;
    return <article key={seat.id} className={`dg-score-card${winner?' dg-score-winner':''}`} aria-label={`${faction.name} score`} style={{'--score-faction':seatColor(seat)} as CSSProperties}>
     <header className="dg-score-card-heading">
      <div className="dg-score-crest"><FactionSymbol faction={seat.faction}/><span aria-label={`Rank ${rank.place}`}>{rank.place}</span></div>
      <div className="dg-score-civilization"><h2>{faction.name}</h2><small>{seat.id===view.viewerSeatId?'You':playerNames[seat.id]??(seat.controller==='ai'?'Computer':'Player')}{seat.eliminated?' · eliminated':''}</small>{winner&&<span className="dg-score-winner-label">{rank.players.length>1?'Joint winner':'Winner'}</span>}</div>
      <div className="dg-score-medallion" aria-label={`${final?'Final':'Public'} score: ${score.total} VP`}><strong>{score.total}</strong><span>VP</span></div>
     </header>
     <div className="dg-score-contributions" aria-hidden="true">{visibleCategories.filter(c=>(c.id!=='reputation'||publicReputation)&&(score[c.id]??0)>0).map(c=><span key={c.id} style={{flex:(score[c.id]??0)/Math.max(1,positiveTotal),background:c.color}} title={`${c.label}: ${score[c.id]} VP`}/>)}</div>
     <div className="dg-score-tokens">{visibleCategories.map(c=>{
      const hidden=c.id==='reputation'&&!publicReputation,value=score[c.id]??0;
      return <button key={c.id} className={`dg-score-token${hidden?' dg-score-secret':value<0?' dg-score-penalty':value===0?' dg-score-zero':''}`} style={{'--score-category':c.color} as CSSProperties} aria-label={`${c.label}: ${hidden?'Hidden until game end':`${value} VP`}`} onClick={()=>onInspect(seat.id,c.id)}>
       <svg viewBox="0 0 24 24" aria-hidden="true"><path d={c.path}/></svg><strong>{hidden?'?':value<0?`−${Math.abs(value)}`:value}</strong><span>{c.label}</span>{hidden&&<small>Hidden</small>}
      </button>;
     })}</div>
     <footer><span>{final?`${score.resourceTotal} resources`:'Public points only'}</span><small>{final?'Tiebreak':publicReputation?'Reputation included':'Reputation excluded'} · select a symbol for details</small></footer>
    </article>;
   })}
  </section>
 </div>;
}
