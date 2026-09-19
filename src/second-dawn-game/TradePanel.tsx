import FactionActionBenefit from './FactionActionBenefit';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { tradeQuote, tradeRates } from '../../shared/eclipse/catalog';
import { tradeResources } from '../../shared/eclipse/economy';
import type { LegalCommandCandidate } from '../../shared/eclipse/legal';
import type { GameCommand, PlayerView, Resource } from '../../shared/eclipse/types';
import { PlanetIcon } from './SectorPlanets';
import './tradePanel.css';
export interface TradePanelProps {
  view: PlayerView;
  candidates: readonly LegalCommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
const RESOURCES:readonly Resource[]=['money','science','materials'];
const title=(resource:Resource)=>resource[0].toUpperCase()+resource.slice(1);
export function TradeResourceIcon({resource}:{resource:Resource}) {
 return <svg className={`dg-trade-icon dg-trade-${resource}`} viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={resource}/></svg>;
}
export default function TradePanel({view,candidates,disabled,onSubmit}:TradePanelProps) {
 const pairs=candidates.flatMap(candidate=>candidate.command.type==='trade'?[candidate.command]:[]);
 const [to,setTo]=useActionDraftState('tradeTo',pairs.some(pair=>pair.to==='science')?'science':pairs[0]?.to??'science',{enabled:!view.pendingDecision});
 const [from,setFrom]=useActionDraftState('tradeFrom',pairs.find(pair=>pair.to===to)?.from??'money',{enabled:!view.pendingDecision});
 const [amount,setAmount]=useActionDraftState('tradeAmount',1,{enabled:!view.pendingDecision});
 const draftGuard=useActionDraftGuard();
 const seat=view.seats.find(candidate=>candidate.id===view.viewerSeatId);
 if(!seat)return <p role="alert">Reconnect to restore your resources.</p>;
 const rates=tradeRates(seat.faction,from,to);
 const minimum=Math.min(...rates.map(rate=>rate.output));
 const received=tradeQuote(seat.faction,from,to,amount)?amount:Number.isFinite(minimum)?minimum:1;
 const quote=tradeQuote(seat.faction,from,to,received);
 const nextAmount=Array.from({length:Math.max(1,...rates.map(rate=>rate.output))},(_,i)=>received+i+1).find(value=>{const q=tradeQuote(seat.faction,from,to,value);return q&&q.input<=seat.resources[from];});
 const previousAmount=Array.from({length:Math.min(received-1,Math.max(1,...rates.map(rate=>rate.output)))},(_,i)=>received-i-1).find(value=>tradeQuote(seat.faction,from,to,value));
 const legalPair=pairs.some(pair=>pair.from===from&&pair.to===to);

 const result=tradeResources(seat.resources,seat.faction,from,to,received);
 const canSubmit=!disabled&&(!draftGuard.stale||!!view.pendingDecision)&&legalPair&&result.ok;
 const chooseOutput=(resource:Resource)=>{setTo(resource);setFrom(pairs.find(pair=>pair.to===resource&&pair.from===from)?.from??pairs.find(pair=>pair.to===resource)?.from??from);setAmount(1);};
 return <section className="dg-trade-panel" aria-label="Convert resources">
  <header><h3>Convert resources</h3><span>{rates.map(rate=>`${rate.input} : ${rate.output}`).join(" / ")}</span></header>
  <p>No action disc · Your turn continues</p><FactionActionBenefit factionId={seat.faction} action="trade"/>
  <fieldset><legend>Receive</legend><div className="dg-trade-choices">{RESOURCES.map(resource=><button key={resource} type="button" aria-label={`Receive ${resource}`} aria-pressed={to===resource} disabled={disabled||!pairs.some(pair=>pair.to===resource)} onClick={()=>chooseOutput(resource)}><TradeResourceIcon resource={resource}/><span>{title(resource)}</span>{to===resource&&<small aria-hidden="true">✓</small>}</button>)}</div></fieldset>
  <fieldset><legend>Pay with</legend><div className="dg-trade-choices">{RESOURCES.filter(resource=>resource!==to).map(resource=><button key={resource} type="button" aria-label={`Pay with ${resource}`} aria-pressed={from===resource} disabled={disabled||!pairs.some(pair=>pair.to===to&&pair.from===resource)} onClick={()=>{setFrom(resource);setAmount(1);}}><TradeResourceIcon resource={resource}/><span>{title(resource)}</span><small>{seat.resources[resource]} held{from===resource?' ✓':''}</small></button>)}</div></fieldset>
  <div className="dg-trade-quantity"><button type="button" aria-label="Decrease received amount" disabled={disabled||previousAmount===undefined} onClick={()=>setAmount(previousAmount??received)}>−</button><span><strong>{received}</strong><small>{to} received</small></span><button type="button" aria-label="Increase received amount" disabled={disabled||!legalPair||nextAmount===undefined} onClick={()=>setAmount(nextAmount??received)}>+</button></div>
  <div className="dg-trade-swap" aria-live="polite"><div role="img" aria-label={`Spend ${quote?.input??0} ${from}`}><TradeResourceIcon resource={from}/><strong>−{quote?.input??0}</strong><small>{from}</small></div><span aria-hidden="true">→</span><div role="img" aria-label={`Receive ${received} ${to}`}><TradeResourceIcon resource={to}/><strong>+{received}</strong><small>{to}</small></div></div>
  <div className="dg-trade-balance" aria-label="Resources after conversion">{RESOURCES.map(resource=><span key={resource}><TradeResourceIcon resource={resource}/>{title(resource)}: {seat.resources[resource]} → {result.ok?result.resources[resource]:seat.resources[resource]}</span>)}</div>
  {!legalPair?<p role="status">No affordable conversion is available now.</p>:!result.ok?<p role="status">{result.message}</p>:null}
  <button className="sd-button primary dg-trade-confirm" type="button" disabled={!canSubmit} onClick={()=>{if(canSubmit)onSubmit({type:'trade',from,to,amount:received});}}>Confirm conversion</button>
 </section>;
}
