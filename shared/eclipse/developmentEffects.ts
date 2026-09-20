import type { DiscoveryEffect } from './discoveries';
import { queueDecision, uniqueId } from './rulesState';
import type { GameState, Seat } from './types';

/** Effects shared by ordinary discovery rewards and the variant's public market. */
export function applyVariantDiscoveryEffect(state:GameState,seat:Seat,effect:DiscoveryEffect):void {
  if(effect.kind==='choice-resources') {
    seat.resources.money+=effect.money;
    queueDecision(state,{id:uniqueId(state,'resource-reward'),owner:seat.id,kind:'resource-reward',count:1,perChoice:effect.amount});
  }
  if(effect.kind==='end-game-bonus') (seat.discoveryBonuses??=[]).push(effect.bonus);
}
