import type { EffectfulPart } from '../../shared/effects'
import type { Ship } from '../../shared/types'

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

export function applyFleetDiscounts(base: EconMods, fleet: Ship[]): EconMods {
  if (!fleet || fleet.length === 0) return { ...base };
  let discountMultiplier = 1;
  for (const ship of fleet) {
    if (!ship?.parts) continue;
    for (const part of ship.parts) {
      const ePart = part as EffectfulPart;
      const effects = ePart.effects;
      if (!effects) continue;
      for (const { effect } of effects) {
        if (effect.kind === 'econDiscount') {
          discountMultiplier *= Math.max(0, 1 - effect.percent / 100);
        }
      }
    }
  }
  return {
    credits: base.credits * discountMultiplier,
    materials: base.materials,
  };
}
