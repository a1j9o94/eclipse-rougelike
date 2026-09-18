import type{ReactNode}from'react';
import type{PlayerView}from'../../shared/eclipse/types';
import{TradeResourceIcon}from'./TradePanel';
import{incomeForPopulationAway}from'../../shared/eclipse/tracks';
import UpkeepSummary from'./UpkeepSummary';
export default function MobileHeader({view,connected,busy,score,turnClock,onMenu,onScore}:{view:PlayerView;connected:boolean;busy:boolean;score:number;turnClock?:ReactNode;onMenu:()=>void;onScore:()=>void}){
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 return <header className="dg-mobile-header">
  <div className="dg-mobile-turn"><div><strong>ROUND {view.round}/8</strong><span>{!connected?'Reconnecting…':view.phase==='finished'?'Game complete':view.pendingDecision?'Your decision':view.activeSeatId===own.id?'Your turn':'Opponent turn'}{busy?' · Saving…':''}</span></div>{turnClock}<button aria-label="Game menu" onClick={onMenu}>Menu</button></div>
  <div className="dg-mobile-resources">{(['money','science','materials']as const).map(resource=><span key={resource} aria-label={`${resource}: ${own.resources[resource]}, income ${incomeForPopulationAway(own.populationTracks[resource])}`}><TradeResourceIcon resource={resource}/><strong>{own.resources[resource]}</strong><small>+{incomeForPopulationAway(own.populationTracks[resource])}</small></span>)}<button onClick={onScore} aria-label={`Your ${view.phase==='finished'?'final':'public'} score: ${score} victory points`}>{score}<small>VP</small></button></div>
  <UpkeepSummary view={view}/>
 </header>;
}
