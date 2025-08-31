export type EconMods = { credits: number; materials: number };
let ECON_MOD: EconMods = { credits: 1, materials: 1 };

export function setEconomyModifiers(mod:{credits?:number; materials?:number}){
  ECON_MOD = {
    credits: mod.credits ?? 1,
    materials: mod.materials ?? 1,
  };
}

export function getEconomyModifiers(){ return ECON_MOD; }
