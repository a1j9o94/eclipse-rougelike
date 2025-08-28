import { nextTierCost } from '../config/economy'

export function researchLabel(track:'Military'|'Grid'|'Nano', research:{Military:number, Grid:number, Nano:number}){
  const curr = research[track]||1; if(curr>=3) return `${track} 3 (max)`; const nxt = curr+1; const cost = nextTierCost(curr)!; return `${track} ${curr}→${nxt} (${cost.c}¢ + ${cost.s}🔬)`;
}

export function canResearch(track:'Military'|'Grid'|'Nano', research:{Military:number, Grid:number, Nano:number}, resources:{credits:number, science:number}){
  const curr = research[track]||1; if(curr>=3) return false; const cost = nextTierCost(curr)!; return resources.credits>=cost.c && resources.science>=cost.s;
}


