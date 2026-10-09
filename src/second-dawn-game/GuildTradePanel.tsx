import {useState} from 'react';
import {useActionDraftState,useActionDraftGuard} from './actionDraftContext';
import {getFaction} from '../../shared/eclipse/catalog';
import type {GameCommand,GuildOffer,PlayerView,Resource} from '../../shared/eclipse/types';
import type {LegalCommandCandidate} from '../../shared/eclipse/legal';
const resources:Resource[]=['money','science','materials'];
export default function GuildTradePanel({view,candidates,disabled,onSubmit}:{view:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const [give,setGive]=useActionDraftState('guildGive','materials');
 const [receive,setReceive]=useActionDraftState('guildReceive','science');
 const [amount,setAmount]=useActionDraftState('guildAmount',1);
 const guard=useActionDraftGuard();
 const own=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const offers=view.guildOffers??[];
 if(own.faction!=='spacing-guild'&&!offers.length)return null;
 const post=candidates.some(c=>c.command.type==='guild-offer'&&c.command.give===give&&c.command.receive===receive);
 return <section className="dg-trade-panel" aria-label="Guild resource exchange"><h3>Guild resource exchange · 1 : 1</h3><p>Both players exchange actual resources. No action disc. Posted outgoing resources are reserved until traded, cancelled, or returned before upkeep.</p>{own.faction==='spacing-guild'&&<div><label>You give<select value={give} disabled={disabled} onChange={e=>setGive(e.target.value as Resource)}>{resources.map(r=><option key={r} value={r}>{r}</option>)}</select></label><label>You receive<select value={receive} disabled={disabled} onChange={e=>setReceive(e.target.value as Resource)}>{resources.map(r=><option key={r} value={r}>{r}</option>)}</select></label><label>Offer volume<input aria-label="Guild offer volume" type="number" min="1" max={Math.min(16,own.resources[give])} value={amount} disabled={disabled} onChange={e=>setAmount(Number(e.target.value))}/></label><p>{own.resources[give]} {give} available; this offer reserves {amount}.</p><button disabled={disabled||guard.stale||!post||give===receive||!Number.isInteger(amount)||amount<1||amount>Math.min(16,own.resources[give])} onClick={()=>onSubmit({type:'guild-offer',give,receive,amount})}>Post offer</button></div>}{offers.map(offer=><GuildOfferRow key={offer.id} offer={offer} view={view} candidates={candidates} disabled={disabled} onSubmit={onSubmit}/>)}{!offers.length&&<p>No resource offers are posted.</p>}</section>;
}

function GuildOfferRow({offer,view,candidates,disabled,onSubmit}:{offer:GuildOffer;view:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const guild=view.seats.find(s=>s.id===offer.owner);
 const accepts=candidates.flatMap(c=>c.command.type==='accept-guild-offer'&&c.command.offerId===offer.id?[c.command]:[]);
 const maxAmount=Math.max(0,...accepts.map(c=>c.amount));
 const [quantity,setQuantity]=useState(maxAmount||1);
 const amount=Math.min(quantity,maxAmount);
 const canCancel=candidates.some(c=>c.command.type==='cancel-guild-offer'&&c.command.offerId===offer.id);
 return <article><strong>{guild?getFaction(guild.faction).name:'Guild'} gives {offer.give}; receives {offer.receive}</strong><p>{offer.remaining} units available · {offer.remaining} {offer.give} reserved</p>{offer.owner===view.viewerSeatId?<button disabled={disabled||!canCancel} onClick={()=>onSubmit({type:'cancel-guild-offer',offerId:offer.id})}>Cancel offer · return {offer.remaining} {offer.give}</button>:<div className="dg-ability-options">{maxAmount>0?<><label>Exchange quantity<input aria-label={`Exchange quantity for ${offer.id}`} type="number" min="1" max={maxAmount} value={amount} disabled={disabled} onChange={e=>setQuantity(Number(e.target.value))}/></label><button disabled={disabled||!Number.isInteger(amount)||amount<1} onClick={()=>onSubmit({type:'accept-guild-offer',offerId:offer.id,amount})}>Pay {amount} {offer.receive} · receive {amount} {offer.give}</button></>:<small>Available on your active turn if you can afford the exchange.</small>}</div>}</article>;
}
