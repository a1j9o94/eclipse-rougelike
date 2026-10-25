import {useState} from 'react';
import CommitBar from './CommitBar';
import {useCommitLabel} from './commitContext';
import GuildTradePanel from './GuildTradePanel';
import {factionRulesMode} from '../../shared/eclipse/gameRules';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { tradeQuote, tradeRates } from '../../shared/eclipse/catalog';
import { tradeResources } from '../../shared/eclipse/economy';
import type { LegalCommandCandidate } from '../../shared/eclipse/legal';
import type { GameCommand, PlayerView, Resource } from '../../shared/eclipse/types';
import TradeResourceIcon from './TradeResourceIcon';
import ResourceExchangeChoices from './ResourceExchangeChoices';
export {default as TradeResourceIcon} from './TradeResourceIcon';
import './tradePanel.css';
export interface TradePanelProps {
  exchangeMode?:'bank'|'guild';
  onExchangeModeChange?:(mode:'bank'|'guild')=>void;
  view: PlayerView;
  candidates: readonly LegalCommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
const RESOURCES:readonly Resource[]=['money','science','materials'];
const title=(resource:Resource)=>resource[0].toUpperCase()+resource.slice(1);
export default function TradePanel({view,candidates,disabled,onSubmit,exchangeMode,onExchangeModeChange}:TradePanelProps) {
 const commitLabel=useCommitLabel();
 const [localMode,setLocalMode]=useState<'bank'|'guild'>('bank');
 const mode=exchangeMode??localMode;
 const chooseMode=(next:'bank'|'guild')=>{setLocalMode(next);onExchangeModeChange?.(next);};
 const pairs=candidates.flatMap(candidate=>candidate.command.type==='trade'?[candidate.command]:[]);
 const [to,setTo]=useActionDraftState('tradeTo',pairs.some(pair=>pair.to==='science')?'science':pairs[0]?.to??'science',{enabled:!view.pendingDecision});
 const [from,setFrom]=useActionDraftState('tradeFrom',pairs.find(pair=>pair.to===to)?.from??'money',{enabled:!view.pendingDecision});
 const initialSeat=view.seats.find(candidate=>candidate.id===view.viewerSeatId);
 const initialRates=initialSeat?tradeRates(initialSeat.faction,from,to,factionRulesMode(view)):[];
 const [amount,setAmount]=useActionDraftState('tradeAmount',initialRates.length?Math.min(...initialRates.map(rate=>rate.output)):1,{enabled:!view.pendingDecision});
 const draftGuard=useActionDraftGuard();
 const seat=view.seats.find(candidate=>candidate.id===view.viewerSeatId);
 if(!seat)return <p role="alert">Reconnect to restore your resources.</p>;
 const rates=tradeRates(seat.faction,from,to,factionRulesMode(view));
 const received=amount;
 const quote=tradeQuote(seat.faction,from,to,received,factionRulesMode(view));
 const nextAmount=Array.from({length:Math.max(1,...rates.map(rate=>rate.output))},(_,i)=>received+i+1).find(value=>{const q=tradeQuote(seat.faction,from,to,value,factionRulesMode(view));return q&&q.input<=seat.resources[from];});
 const previousAmount=Array.from({length:Math.min(received-1,Math.max(1,...rates.map(rate=>rate.output)))},(_,i)=>received-i-1).find(value=>tradeQuote(seat.faction,from,to,value,factionRulesMode(view)));
 let maximum=Math.max(0,...rates.map(rate=>Math.floor(seat.resources[from]*rate.output/rate.input)));
 while(maximum>0){const maxQuote=tradeQuote(seat.faction,from,to,maximum,factionRulesMode(view));if(maxQuote&&maxQuote.input<=seat.resources[from])break;maximum--;}
 const legalPair=pairs.some(pair=>pair.from===from&&pair.to===to);

 const result=tradeResources(seat.resources,seat.faction,from,to,received,factionRulesMode(view));
 const canSubmit=!disabled&&(!draftGuard.stale||!!view.pendingDecision)&&legalPair&&result.ok;
 return <section className="dg-trade-panel" aria-label="Convert resources">
  {(seat.faction==='spacing-guild'||!!view.guildOffers?.length||mode==='guild')&&<nav className="dg-exchange-tabs" aria-label="Exchange type"><button type="button" aria-pressed={mode==='bank'} onClick={()=>chooseMode('bank')}>Bank conversion</button><button type="button" aria-pressed={mode==='guild'} onClick={()=>chooseMode('guild')}>Guild exchange</button></nav>}
  {mode==='guild'?<GuildTradePanel view={view} candidates={candidates} disabled={disabled} onSubmit={onSubmit}/>:<><div className="dg-trade-body"><header><h3>Convert resources</h3><span>{rates.map(rate=>`${rate.input} : ${rate.output}`).join(" / ")}</span></header>

  <ResourceExchangeChoices label="Pay with" selected={from} onSelect={setFrom} disabled={disabled} available={resource=>resource!==to&&pairs.some(pair=>pair.to===to&&pair.from===resource)} balances={seat.resources}/>
  <ResourceExchangeChoices label="Receive" selected={to} onSelect={setTo} disabled={disabled} available={resource=>pairs.some(pair=>pair.to===resource)}/>
  <div className="dg-trade-quantity"><button type="button" aria-label="Decrease received amount" disabled={disabled||previousAmount===undefined} onClick={()=>setAmount(previousAmount??received)}>−</button><label><input type="number" min="1" aria-label={`${title(to)} to receive`} value={received} disabled={disabled} onChange={event=>{const value=Number(event.target.value);if(Number.isSafeInteger(value)&&value>0)setAmount(value);}}/><small>{to} received</small></label><button type="button" aria-label="Increase received amount" disabled={disabled||!legalPair||nextAmount===undefined} onClick={()=>setAmount(nextAmount??received)}>+</button><button type="button" disabled={disabled||!legalPair||maximum<1} onClick={()=>setAmount(maximum)}>Max</button></div>
  <div className="dg-trade-swap" aria-live="polite"><div role="img" aria-label={`Spend ${quote?.input??'—'} ${from}`}><TradeResourceIcon resource={from}/><strong>−{quote?.input??'—'}</strong><small>{from}</small></div><span aria-hidden="true">→</span><div role="img" aria-label={`Receive ${received} ${to}`}><TradeResourceIcon resource={to}/><strong>+{received}</strong><small>{to}</small></div></div>
  <div className="dg-trade-balance" aria-label="Resources after conversion">{RESOURCES.filter(resource=>resource===from||resource===to).map(resource=><span key={resource}><TradeResourceIcon resource={resource}/>{title(resource)}: {seat.resources[resource]} → {result.ok?result.resources[resource]:seat.resources[resource]}</span>)}</div>
  {!result.ok?<p role="status">{quote&&quote.input>seat.resources[from]?`Need ${quote.input} ${from}; ${seat.resources[from]} available.`:result.message}</p>:!legalPair?<p role="status">This conversion is unavailable during the current action.</p>:null}
  </div><CommitBar><button className="sd-button primary dg-trade-confirm" type="button" disabled={!canSubmit} onClick={()=>{if(canSubmit)onSubmit({type:'trade',from,to,amount:received});}}>{commitLabel('Confirm conversion')}</button></CommitBar></>}
 </section>;
}
