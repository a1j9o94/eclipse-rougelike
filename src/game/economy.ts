export type EconMods = { credits: number; materials: number };

// Legacy global state for single-player mode
let ECON_MOD: EconMods = { credits: 1, materials: 1 };

export function setEconomyModifiers(mod:{credits?:number; materials?:number}){
  ECON_MOD = {
    credits: mod.credits ?? 1,
    materials: mod.materials ?? 1,
  };
}

export function getEconomyModifiers(){ return ECON_MOD; }

// New parameter-based functions for multiplayer isolation
export function getDefaultEconomyModifiers(): EconMods {
  return { credits: 1, materials: 1 };
}

export function applyEconomyModifiers(baseCost: number, modifiers: EconMods, type: 'credits' | 'materials'): number {
  return Math.max(1, Math.floor(baseCost * modifiers[type]));
}
