import { type Part } from '../config/parts'
import { nextTierCost, ECONOMY } from '../config/economy'
import { rollInventory } from './index'

export function doRerollAction(resources:{credits:number}, rerollCost:number, research:{Military:number, Grid:number, Nano:number}){
  if(resources.credits < rerollCost) return { ok:false as const };
  const items:Part[] = rollInventory(research, ECONOMY.shop.itemsBase);
  return { ok:true as const, delta:{ credits: -rerollCost }, items, nextRerollCostDelta: ECONOMY.reroll.increment };
}

export function researchAction(track:'Military'|'Grid'|'Nano', resources:{credits:number, science:number}, research:{Military:number, Grid:number, Nano:number}){
  const curr = research[track]||1; if(curr>=3) return { ok:false as const };
  const cost = nextTierCost(curr); if(!cost) return { ok:false as const };
  if(resources.credits < cost.c || resources.science < cost.s) return { ok:false as const };
  const nextTier = curr + 1;
  const items:Part[] = rollInventory({ ...research, [track]: nextTier } as {Military:number, Grid:number, Nano:number}, ECONOMY.shop.itemsBase);
  return { ok:true as const, nextTier, delta:{ credits: -cost.c, science: -cost.s }, items, nextRerollCostDelta: ECONOMY.reroll.increment };
}


