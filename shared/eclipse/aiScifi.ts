import {getFaction} from './catalog';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from './tracks';
import type {GameCommand,PlayerView,Resource} from './types';
/** Inventory-aware exchange value, with friction so reversing an exchange loses utility. */
export function scifiExchangeValue(view:PlayerView,command:Extract<GameCommand,{type:'accept-guild-offer'}>):number {
 const seat=view.seats.find(s=>s.id===view.viewerSeatId),offer=view.guildOffers?.find(o=>o.id===command.offerId);
 if(!seat||!offer)return -Infinity;
 const policy=getFaction(seat.faction).capabilities.ai;
 const balance=seat.resources.money+incomeForPopulationAway(seat.populationTracks.money)-upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack));
 const marginal=(resource:Resource,inventory:number)=>{
  const available=resource==='money'?balance+(inventory-seat.resources.money):inventory;
  const base=resource==='money'?1:resource==='science'?policy.scienceValue:policy.materialsValue;
  return base+(available<0?8:available<3?4:available<6?1:0);
 };
 let gain=0;
 for(let i=0;i<command.amount;i++)gain+=marginal(offer.give,seat.resources[offer.give]+i)-marginal(offer.receive,seat.resources[offer.receive]-i-1);
 return gain*4-2;
}
