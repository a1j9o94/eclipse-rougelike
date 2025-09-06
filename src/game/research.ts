import { nextTierCost } from '../../shared/economy';
import { getEconomyModifiers, type EconMods, applyEconomyModifiers } from './economy';

// Legacy versions using global state (for single-player compatibility)
export function researchLabel(track:'Military'|'Grid'|'Nano', research:{Military:number, Grid:number, Nano:number}){
  const curr = research[track]||1;
  if(curr>=3) return `${track} 3 (max)`;
  const nxt = curr+1;
  const base = nextTierCost(curr)!;
  const mod = getEconomyModifiers();
  const costC = Math.max(1, Math.floor(base.c * mod.credits));
  return `${track} ${curr}→${nxt} (${costC}¢ + ${base.s}🔬)`;
}

export function canResearch(track:'Military'|'Grid'|'Nano', research:{Military:number, Grid:number, Nano:number}, resources:{credits:number, science:number}){
  const curr = research[track]||1;
  if(curr>=3) return false;
  const base = nextTierCost(curr)!;
  const mod = getEconomyModifiers();
  const costC = Math.max(1, Math.floor(base.c * mod.credits));
  return resources.credits>=costC && resources.science>=base.s;
}

// New versions accepting economy modifiers as parameter (for multiplayer isolation)
export function researchLabelWithMods(track:'Military'|'Grid'|'Nano', research:{Military:number, Grid:number, Nano:number}, economyMods: EconMods){
  const curr = research[track]||1;
  if(curr>=3) return `${track} 3 (max)`;
  const nxt = curr+1;
  const base = nextTierCost(curr)!;
  const costC = applyEconomyModifiers(base.c, economyMods, 'credits');
  return `${track} ${curr}→${nxt} (${costC}¢ + ${base.s}🔬)`;
}

export function canResearchWithMods(track:'Military'|'Grid'|'Nano', research:{Military:number, Grid:number, Nano:number}, resources:{credits:number, science:number}, economyMods: EconMods){
  const curr = research[track]||1;
  if(curr>=3) return false;
  const base = nextTierCost(curr)!;
  const costC = applyEconomyModifiers(base.c, economyMods, 'credits');
  return resources.credits>=costC && resources.science>=base.s;
}
