import {gameRoundLimit} from '../../shared/eclipse/gameRules';
import type {ReactNode} from 'react';
import type {PlayerView} from '../../shared/eclipse/types';
import TradeResourceIcon from './TradeResourceIcon';
import {incomeForPopulationAway} from '../../shared/eclipse/tracks';
import {needsUpkeep} from './upkeepParticipation';
import {upkeepForecast} from './upkeepForecast';
export default function MobileHeader({view,connected,busy,score,turnClock,onMenu,onScore,onSettings,onOpenTracks,onTable,onCloseActivity,activityTools,activityLabel,activityControls}:{view:PlayerView;connected:boolean;busy:boolean;score:number;turnClock?:ReactNode;onMenu:()=>void;onScore:()=>void;onSettings?:()=>void;onOpenTracks:()=>void;onTable?:()=>void;onCloseActivity?:()=>void;activityTools?:ReactNode;activityLabel?:string;activityControls?:ReactNode}){
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!,forecast=upkeepForecast(view);
 return <header className="dg-mobile-header">
  {onCloseActivity&&<button className="dg-activity-back" aria-label="Close activity" onClick={onCloseActivity}>‹</button>}
  <div className="dg-mobile-turn"><strong title={`Round ${view.round} / ${gameRoundLimit(view)}`}>{activityLabel??`R${view.round}/${gameRoundLimit(view)}`}</strong><span>{!connected?'Reconnecting…':busy?'Saving…':view.phase==='finished'?'Complete':view.pendingDecision?'Your decision':view.phase==='upkeep'?(needsUpkeep(view)?'Your upkeep':'Waiting'):view.activeSeatId===own.id?'Your turn':'Opponent turn'}</span>{turnClock}</div>
  <button className="dg-mobile-resources" aria-label="Open income and upkeep tracks in Command Center" onClick={onOpenTracks}>{(['money','science','materials'] as const).map(resource=><span key={resource} aria-label={`${resource}: ${own.resources[resource]}, income ${incomeForPopulationAway(own.populationTracks[resource])}`}><TradeResourceIcon resource={resource}/><strong>{own.resources[resource]}</strong></span>)}{forecast.balance<0&&<small className="dg-header-shortfall">{Math.abs(forecast.balance)} short · round end</small>}</button>
  {activityControls?<div className="dg-header-activity-controls">{activityControls}</div>:<button className="dg-header-score" onClick={onScore} aria-label={`Your ${view.phase==='finished'?'final':'public'} score: ${score} victory points`}>{score}<small>VP</small></button>}
  <details className="dg-shell-menu"><summary aria-label="Game tools">•••</summary><div>{activityTools}{activityControls&&<button onClick={onScore}>Your score · {score} VP</button>}{onTable&&<button onClick={onTable}>Table & activity</button>}{onSettings&&<button onClick={onSettings}>Preferences</button>}<button onClick={onMenu}>Game menu</button></div></details>
 </header>;
}
