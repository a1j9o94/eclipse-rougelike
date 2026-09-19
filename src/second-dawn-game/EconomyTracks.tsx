import type {CSSProperties,ReactNode} from 'react';
import {BASE_ECONOMY_TRACKS,incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from '../../shared/eclipse/tracks';
import type {PlayerView,Resource} from '../../shared/eclipse/types';
import {TradeResourceIcon} from './TradePanel';
import {StatIcon} from './ShipPartStats';
import './economyTracks.css';

interface TrackStep {position:number;value:number;description:string}
export interface EconomyTrackProps {
 label:string;icon:ReactNode;tone:Resource|'influence';steps:readonly TrackStep[];position:number;
 summary:string;preview:string;showIncrease?:boolean;showNext?:boolean;
}
/** Shared, read-only track: the values and cursor come from authoritative public state. */
export function EconomyTrack({label,icon,tone,steps,position,summary,preview,showIncrease=false,showNext=true}:EconomyTrackProps){
 return <section className={`eo-track eo-${tone}`} aria-label={`${label} track`}>
  <header><h3>{icon}{label}</h3><strong>{summary}</strong><span>{preview}</span></header>
  <ol style={{'--track-count':steps.length,'--track-mobile-count':Math.ceil(steps.length/2)} as CSSProperties}>
   {steps.map((step,index)=>{
    const current=step.position===position,next=showNext&&step.position===position+1;
    const increase=index?step.value-steps[index-1].value:0;
    const state=current?'current':next?'next':showIncrease&&index?`increase ${increase}`:'';
    return <li key={step.position} aria-label={`${step.description}${state?`, ${state}`:''}`} aria-current={current?'step':undefined} className={`${current?'eo-track-current':next?'eo-track-next':step.position<position?'eo-track-past':''}`}>
     <strong>{step.value}</strong><small>{current?'Now':next?'Next':showIncrease?`+${increase}`:'\u00a0'}</small>
    </li>;
   })}
  </ol>
 </section>;
}
const resources:Resource[]=['money','science','materials'];
const names:Record<Resource,string>={money:'Money',science:'Science',materials:'Materials'};
export default function EmpireEconomyTracks({seat}:{seat:PlayerView['seats'][number]}){
 const used=Math.max(0,13-seat.influenceOnTrack),cost=upkeepForEmptyInfluenceSlots(used),hasNext=seat.influenceOnTrack>0&&!seat.eliminated;
 const nextPosition=hasNext?Math.max(0,14-seat.influenceOnTrack):used;
 const nextCost=upkeepForEmptyInfluenceSlots(nextPosition);
 const money=seat.resources.money,income=incomeForPopulationAway(seat.populationTracks.money);
 const forecasts=[{label:'With current upkeep',cost},...(hasNext?[{label:`After next ${seat.passed?'reaction':'new action'}`,cost:nextCost}]:[])];
 return <section className="eo-panel eo-economy-tracks" aria-label="Economy tracks">
  <header><div><p className="sd-eyebrow">PLAN YOUR NEXT STEPS</p><h2>Income & upkeep tracks</h2></div></header>
  {resources.map(resource=>{
   const position=seat.populationTracks[resource],income=incomeForPopulationAway(position);
   const values=BASE_ECONOMY_TRACKS.income.map((value,index)=>({position:index,value,description:`${index} cubes away: ${value} ${resource} income`}));
   if(position===-1)values.unshift({position:-1,value:0,description:`Returned cube covers base income: 0 ${resource} income`});
   return <EconomyTrack key={resource} tone={resource} label={`${names[resource]} income`} icon={<TradeResourceIcon resource={resource}/>} steps={values} position={position} summary={`+${income} / round`} preview={position<11?`Next cube: +${incomeForPopulationAway(position+1)-income} income`:'Maximum income · no cubes on track'}/>;
  })}
  <p className="eo-track-explanation">Each cube placed reveals the next income value. Income is collected during upkeep.</p>
  <EconomyTrack tone="influence" label="Influence upkeep" icon={<StatIcon kind="influence"/>} position={used}
   steps={BASE_ECONOMY_TRACKS.upkeep.map((value,position)=>({position,value,description:`${position} empty influence slots: ${value} money upkeep`}))}
   summary={`${cost} money / round`} showIncrease showNext={hasNext&&nextPosition>used}
   preview={seat.eliminated?'Eliminated':!hasNext?'No influence discs available':`Next ${seat.passed?'reaction':'new action'}: +${nextCost-cost} upkeep · ${nextCost} total`}/>
  {!seat.eliminated&&<section className="eo-upkeep-balances" aria-label="Money after upkeep">
   {forecasts.map(forecast=>{
    const balance=money+income-forecast.cost;
    return <div key={forecast.label} aria-label={forecast.label} className={balance<0?'eo-balance-short':'eo-balance-covered'}>
     <span>{forecast.label}</span>
     <strong>{balance<0?`${-balance} money short`:balance===0?'Exactly covered':`${balance} money left`}</strong>
     <small>{money} money + {income} income − {forecast.cost} upkeep</small>
    </div>;
   })}
   <p>Using current money and income, before spending or earning resources in the action.</p>
  </section>}
  <p className="eo-track-explanation">Each new action, reaction or sector claimed uses an influence disc. Remaining activations in an action use no extra disc. The track shows total round upkeep; + values show the increase per disc. Pay during upkeep, using money plus income.</p>
 </section>;
}
