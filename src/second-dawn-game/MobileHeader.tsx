import {gameRoundLimit} from '../../shared/eclipse/gameRules';
import type{ReactNode}from'react';
import type{PlayerView}from'../../shared/eclipse/types';
import{TradeResourceIcon}from'./TradePanel';
import{incomeForPopulationAway}from'../../shared/eclipse/tracks';
import {needsUpkeep} from './upkeepParticipation';
import UpkeepSummary from'./UpkeepSummary';
export default function MobileHeader({view,connected,busy,score,turnClock,onMenu,onScore,onSettings,onOpenTracks}:{view:PlayerView;connected:boolean;busy:boolean;score:number;turnClock?:ReactNode;onMenu:()=>void;onScore:()=>void;onSettings?:()=>void;onOpenTracks:()=>void}){
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 return <header className="dg-mobile-header">
  <div className="dg-mobile-turn"><div><strong>ROUND {view.round}/{gameRoundLimit(view)}</strong><span>{!connected?'Reconnecting…':view.phase==='finished'?'Game complete':view.pendingDecision?'Your decision':view.phase==='upkeep'?(needsUpkeep(view)?'Your upkeep':'Upkeep complete'):view.activeSeatId===own.id?'Your turn':'Opponent turn'}{busy?' · Saving…':''}</span></div>{turnClock}{onSettings&&<button aria-label="Game settings" onClick={onSettings}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M10 2h4l1 3 3 1 3 3-1 3 1 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 1-3-1-3 3-3 3-1Z"/></svg></button>}<button aria-label="Game menu" onClick={onMenu}>Menu</button></div>
  <div className="dg-mobile-resources">{(['money','science','materials']as const).map(resource=><span key={resource} aria-label={`${resource}: ${own.resources[resource]}, income ${incomeForPopulationAway(own.populationTracks[resource])}`}><TradeResourceIcon resource={resource}/><strong>{own.resources[resource]}</strong><small>+{incomeForPopulationAway(own.populationTracks[resource])}</small></span>)}<button onClick={onScore} aria-label={`Your ${view.phase==='finished'?'final':'public'} score: ${score} victory points`}>{score}<small>VP</small></button></div>
  <UpkeepSummary view={view} onOpenTracks={onOpenTracks}/>
 </header>;
}
