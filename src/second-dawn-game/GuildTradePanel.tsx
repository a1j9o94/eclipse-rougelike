import CommitBar from './CommitBar';
import {useContext} from 'react';
import {CommitContext} from './commitContext';
import {useActionDraftState,useActionDraftGuard} from './actionDraftContext';
import {getFaction} from '../../shared/eclipse/catalog';
import type {GameCommand,GuildOffer,PlayerView} from '../../shared/eclipse/types';
import type {LegalCommandCandidate} from '../../shared/eclipse/legal';
import ResourceExchangeChoices from './ResourceExchangeChoices';
import TradeResourceIcon from './TradeResourceIcon';
import './tradePanel.css';
export default function GuildTradePanel({view,candidates,disabled,onSubmit}:{view:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const queued=useContext(CommitContext);
 const [selectedOffer,setSelectedOffer]=useActionDraftState('guildOfferSelection',null);
 const [give,setGive]=useActionDraftState('guildGive','materials');
 const [receive,setReceive]=useActionDraftState('guildReceive','science');
 const [amount,setAmount]=useActionDraftState('guildAmount',1);
 const guard=useActionDraftGuard();
 const own=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const offers=view.guildOffers??[];
 if(own.faction!=='spacing-guild'&&!offers.length&&selectedOffer===null)return null;
 const post=candidates.some(c=>c.command.type==='guild-offer'&&c.command.give===give&&c.command.receive===receive);
 return <section className="dg-trade-panel" aria-label="Guild resource exchange" tabIndex={-1}><h3>Guild resource exchange · 1 : 1</h3>{selectedOffer!==null&&!offers.some(offer=>offer.id===selectedOffer)&&<p role="status">The selected offer is no longer available.</p>}{queued&&<p role="status">Guild exchanges cannot be queued. Use them during your turn.</p>}<p className="dg-exchange-reservation">Resources stay reserved until traded, cancelled or upkeep.</p>{own.faction==='spacing-guild'&&selectedOffer!==null&&<button type="button" onClick={()=>setSelectedOffer(null)}>Create an offer</button>}{own.faction==='spacing-guild'&&selectedOffer===null&&<div><ResourceExchangeChoices label="Give in offer" selected={give} onSelect={setGive} disabled={disabled} balances={own.resources}/><ResourceExchangeChoices label="Receive for offer" selected={receive} onSelect={setReceive} disabled={disabled}/><label>Offer volume<input aria-label="Guild offer volume" type="number" min="1" max={Math.min(16,own.resources[give])} value={amount} disabled={disabled} onChange={e=>setAmount(Number(e.target.value))}/></label><button type="button" disabled={disabled||own.resources[give]<1} onClick={()=>setAmount(Math.min(16,own.resources[give]))}>Max</button><div className="dg-trade-swap" aria-label="Guild offer preview"><span><TradeResourceIcon resource={give}/>{amount} {give}</span><span aria-hidden="true">→</span><span><TradeResourceIcon resource={receive}/>{amount} {receive}</span></div><p>{own.resources[give]-amount} {give} available after reserving {amount}.</p>{give===receive&&<p role="status">Choose different resources for the exchange.</p>}{amount>own.resources[give]&&<p role="status">Need {amount} {give}; {own.resources[give]} available.</p>}<CommitBar><button className="sd-primary" disabled={disabled||queued||guard.stale||!post||give===receive||!Number.isInteger(amount)||amount<1||amount>Math.min(16,own.resources[give])} onClick={()=>onSubmit({type:'guild-offer',give,receive,amount})}>Post offer</button></CommitBar></div>}{offers.map(offer=><GuildOfferRow key={offer.id} selected={selectedOffer===offer.id} onSelect={()=>setSelectedOffer(offer.id)} offer={offer} view={view} candidates={candidates} disabled={disabled||queued} onSubmit={onSubmit}/>)}{!offers.length&&<p>No resource offers are posted.</p>}</section>;
}

function GuildOfferRow({offer,view,candidates,disabled,onSubmit,selected,onSelect}:{selected:boolean;onSelect:()=>void;offer:GuildOffer;view:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const guild=view.seats.find(s=>s.id===offer.owner);
 const accepts=candidates.flatMap(c=>c.command.type==='accept-guild-offer'&&c.command.offerId===offer.id?[c.command]:[]);
 const maxAmount=Math.max(0,...accepts.map(c=>c.amount));
 const [quantities,setQuantities]=useActionDraftState('guildOfferAmounts',{});
 const amount=quantities[offer.id]??1;
 const setQuantity=(value:number)=>{if(Number.isSafeInteger(value)&&value>0)setQuantities(current=>({...current,[offer.id]:value}));};
 const canCancel=candidates.some(c=>c.command.type==='cancel-guild-offer'&&c.command.offerId===offer.id);
 return <article className={`dg-guild-offer${selected?' is-selected':''}`}><strong>{guild?getFaction(guild.faction).name:'Guild'} gives {offer.give}; receives {offer.receive}</strong><p>{offer.remaining} units available · {offer.remaining} {offer.give} reserved</p>{offer.owner!==view.viewerSeatId&&<button type="button" aria-label={`Select offer: receive ${offer.give} for ${offer.receive}`} aria-pressed={selected} onClick={onSelect}>Receive {offer.give} <span aria-hidden="true">⇄</span> Pay {offer.receive}</button>}{offer.owner===view.viewerSeatId?<button disabled={disabled||!canCancel} onClick={()=>onSubmit({type:'cancel-guild-offer',offerId:offer.id})}>Cancel offer · return {offer.remaining} {offer.give}</button>:selected&&<div className="dg-ability-options"><><label>Exchange quantity<input aria-label={`Exchange quantity for ${offer.id}`} type="number" min="1" max={maxAmount} value={amount} disabled={disabled} onChange={e=>setQuantity(Number(e.target.value))}/></label><button type="button" disabled={disabled||maxAmount<1} onClick={()=>setQuantity(maxAmount)}>Max</button><CommitBar><button className="sd-primary" disabled={disabled||!Number.isInteger(amount)||amount<1||amount>maxAmount} onClick={()=>onSubmit({type:'accept-guild-offer',offerId:offer.id,amount})}>Pay {amount} {offer.receive} · receive {amount} {offer.give}</button></CommitBar>{amount>maxAmount&&<p role="status">Only {maxAmount} units are available for this exchange.</p>}</></div>}</article>;
}
