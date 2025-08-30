import { type Part } from '../config/parts'
import { nextTierCost, ECONOMY } from '../config/economy'
import { rollInventory, getEconomyModifiers } from './index'

export function doRerollAction(resources:{credits:number}, rerollCost:number, research:{Military:number, Grid:number, Nano:number}){
  if(resources.credits < rerollCost) return { ok:false as const };
  const items:Part[] = rollInventory(research, ECONOMY.shop.itemsBase);
  const mod = getEconomyModifiers();
  const nextDelta = Math.max(1, Math.floor(ECONOMY.reroll.increment * mod.credits));
  return { ok:true as const, delta:{ credits: -rerollCost }, items, nextRerollCostDelta: nextDelta };
}

export function researchAction(track:'Military'|'Grid'|'Nano', resources:{credits:number, science:number}, research:{Military:number, Grid:number, Nano:number}){
  const curr = research[track]||1; if(curr>=3) return { ok:false as const };
  const base = nextTierCost(curr); if(!base) return { ok:false as const };
  const mod = getEconomyModifiers();
  const creditCost = Math.max(1, Math.floor(base.c * mod.credits));
  if(resources.credits < creditCost || resources.science < base.s) return { ok:false as const };
  const nextTier = curr + 1;
  const items:Part[] = rollInventory({ ...research, [track]: nextTier } as {Military:number, Grid:number, Nano:number}, ECONOMY.shop.itemsBase);
  const nextDelta = Math.max(1, Math.floor(ECONOMY.reroll.increment * mod.credits));
  return { ok:true as const, nextTier, delta:{ credits: -creditCost, science: -base.s }, items, nextRerollCostDelta: nextDelta };
}


