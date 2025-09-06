import { type Part, ALL_PARTS, RARE_PARTS } from '../../shared/parts'
import { nextTierCost, ECONOMY } from '../../shared/economy'
import { getEconomyModifiers, type EconMods, applyEconomyModifiers } from './economy'

let RARE_TECH_CHANCE = 0.1;
export function setRareTechChance(ch:number){ RARE_TECH_CHANCE = ch; }
export function getRareTechChance(){ return RARE_TECH_CHANCE; }

export function tierCap(research:{Military:number, Grid:number, Nano:number}): Record<'Military'|'Grid'|'Nano', number>{
  return {
    Military: Math.max(1, Math.min(3, Math.floor(research.Military || 1))),
    Grid: Math.max(1, Math.min(3, Math.floor(research.Grid || 1))),
    Nano: Math.max(1, Math.min(3, Math.floor(research.Nano || 1))),
  };
}

export function rollInventory(research:{Military:number, Grid:number, Nano:number}, count: number = ECONOMY.shop.itemsBase){
  const capByCat = tierCap(research);

  // Filter parts pool to only include parts within research tier limits and exclude rares
  const pool = ALL_PARTS.filter((p:Part) =>
    !p.rare && p.tier === capByCat[p.tech_category as 'Military'|'Grid'|'Nano']
  );

  const items:Part[] = [];

  const available = [...pool];
  const rareAvailable = [...RARE_PARTS];
  while(items.length < count){
    const useRare = Math.random() < RARE_TECH_CHANCE;
    if(useRare && rareAvailable.length > 0){
      const ridx = Math.floor(Math.random() * rareAvailable.length);
      items.push(rareAvailable[ridx]);
      rareAvailable.splice(ridx,1);
      continue;
    }
    if(available.length > 0){
      const idx = Math.floor(Math.random() * available.length);
      const part = available[idx];
      items.push(part);
      available.splice(idx,1);
    } else if(pool.length > 0){
      const idx = Math.floor(Math.random() * pool.length);
      const part = pool[idx];
      items.push(part);
    } else break;
  }
  return items;
}

// Legacy version using global state (for single-player compatibility)
export function doRerollAction(resources:{credits:number}, rerollCost:number, research:{Military:number, Grid:number, Nano:number}){
  if(resources.credits < rerollCost) return { ok:false as const };
  const items:Part[] = rollInventory(research, ECONOMY.shop.itemsBase);
  const mod = getEconomyModifiers();
  const nextDelta = Math.max(1, Math.floor(ECONOMY.reroll.increment * mod.credits));
  return { ok:true as const, delta:{ credits: -rerollCost }, items, nextRerollCostDelta: nextDelta };
}

// New version accepting economy modifiers as parameter (for multiplayer isolation)
export function doRerollActionWithMods(resources:{credits:number}, rerollCost:number, research:{Military:number, Grid:number, Nano:number}, economyMods: EconMods){
  if(resources.credits < rerollCost) return { ok:false as const };
  const items:Part[] = rollInventory(research, ECONOMY.shop.itemsBase);
  const nextDelta = applyEconomyModifiers(ECONOMY.reroll.increment, economyMods, 'credits');
  return { ok:true as const, delta:{ credits: -rerollCost }, items, nextRerollCostDelta: nextDelta };
}

// Legacy version using global state (for single-player compatibility)
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

// New version accepting economy modifiers as parameter (for multiplayer isolation)
export function researchActionWithMods(track:'Military'|'Grid'|'Nano', resources:{credits:number, science:number}, research:{Military:number, Grid:number, Nano:number}, economyMods: EconMods){
  const curr = research[track]||1; if(curr>=3) return { ok:false as const };
  const base = nextTierCost(curr); if(!base) return { ok:false as const };
  const creditCost = applyEconomyModifiers(base.c, economyMods, 'credits');
  if(resources.credits < creditCost || resources.science < base.s) return { ok:false as const };
  const nextTier = curr + 1;
  const items:Part[] = rollInventory({ ...research, [track]: nextTier } as {Military:number, Grid:number, Nano:number}, ECONOMY.shop.itemsBase);
  const nextDelta = applyEconomyModifiers(ECONOMY.reroll.increment, economyMods, 'credits');
  return { ok:true as const, nextTier, delta:{ credits: -creditCost, science: -base.s }, items, nextRerollCostDelta: nextDelta };
}
