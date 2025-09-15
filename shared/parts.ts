import type { EffectfulPart } from './effects';

export type TechTrack = 'Military' | 'Grid' | 'Nano';
export type PartCategory = 'Source' | 'Drive' | 'Weapon' | 'Computer' | 'Shield' | 'Hull';

export type DieFace = {
  roll?: number;
  dmg?: number;
  self?: number;
};

export type Part = {
  id: string;
  name: string;
  desc?: string;
  powerProd?: number;
  powerCost?: number;
  init?: number;
  dice?: number;
  dmgPerHit?: number;
  riftDice?: number;
  faces?: DieFace[];
  shieldTier?: number;
  extraHull?: number;
  aim?: number;
  initLoss?: number;
  regen?: number;
  slots?: number;
  tier: number;
  cost: number;
  tech_category: TechTrack;
  cat: PartCategory;
  rare?: boolean;
};

export type PartCatalog = {
  sources: EffectfulPart[];
  drives: EffectfulPart[];
  weapons: EffectfulPart[];
  computers: EffectfulPart[];
  shields: EffectfulPart[];
  hull: EffectfulPart[];
  rare: EffectfulPart[];
}

export const RIFT_FACES: DieFace[] = [
  { dmg: 1 },
  { dmg: 2 },
  { dmg: 3, self: 1 },
  { self: 1 },
  {},
  {},
] as const;

export const RARE_PARTS: EffectfulPart[] = [
  { id: "spike_launcher", name: "Spike Launcher", dice: 1, dmgPerHit: 3, faces: [ { roll: 0 }, { roll: 0 }, { roll: 0 }, { roll: 0 }, { roll: 0 }, { dmg: 3 } ], powerCost: 1, tier: 1, cost: 30, cat: "Weapon", tech_category: "Nano", rare: true, desc: "One die: only a 6 hits for 3 damage. Aim and computers don't help." },
  { id: "rift_cannon", name: "Rift Cannon", riftDice: 1, faces: RIFT_FACES, powerCost: 2, tier: 2, cost: 65, cat: "Weapon", tech_category: "Nano", rare: true, desc: "Rolls one Rift die for 1-3 damage. A 3 also deals 1 damage to you. Aim and computers don't help." },
  { id: "sentient_hull", name: "Sentient Hull", extraHull: 1, aim: 1, powerCost: 0, tier: 2, cost: 50, cat: "Computer", tech_category: "Nano", rare: true, desc: "Adds 1 hull and +1 Aim with no power cost." },
  { id: "absorption", name: "Absorption Shield", shieldTier: 1, powerProd: 4, tier: 2, cost: 65, cat: "Shield", tech_category: "Nano", rare: true, desc: "Shield tier 1 that also generates 4 power."},
  { id: "quantum_cpu", name: "Quantum Computer", aim: 2, powerCost: 1, tier: 2, cost: 70, cat: "Computer", tech_category: "Grid", rare: true, desc: "Adds +2 Aim for only 1 power."},
  { id: "rift_conductor", name: "Rift Conductor", extraHull: 1, riftDice: 1, powerCost: 1, tier: 2, cost: 40, cat: "Hull", tech_category: "Nano", rare: true, desc: "Adds 1 hull and rolls a Rift die (1-3 damage; a 3 also hits you for 1). Aim and computers don't help."},
  { id: "disruptor", name: "Disruptor Beam", dice: 1, dmgPerHit: 0, faces: [ { roll: 6 } ], powerCost: 1, tier: 2, cost: 80, cat: "Weapon", tech_category: "Nano", initLoss: 1, rare: true, desc: "Always hits and lowers enemy initiative by 1 without dealing damage." },
  { id: "disruptor_cannon", name: "Disruptor Cannon", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 90, cat: "Weapon", tech_category: "Nano", initLoss: 1, rare: true, desc: "Rolls 1 die; hits deal 1 damage and lower enemy initiative by 1." },
  { id: "reflective_armor", name: "Reflective Armor", extraHull: 1, shieldTier: 1, powerCost: 0, tier: 2, cost: 45, cat: "Hull", tech_category: "Nano", rare: true, desc: "+1 hull and shield tier 1. When this ship blocks with shields, roll a die; on 6, deal 1 damage back.", effects: [{ hook: 'onBlock', effect: { kind: 'retaliateOnBlockDamage', dieThreshold: 6, dmg: 1 } }] },
  { id: "auto_repair", name: "Auto-Repair Hull", extraHull: 2, regen: 1, powerCost: 1, tier: 2, cost: 80, cat: "Hull", tech_category: "Nano", rare: true, desc: "Adds 2 hull and regenerates 1 each round; uses 1 power." },
];

export const PARTS: PartCatalog = {
  sources: [
    { id: "fusion_source", name: "Fusion Source", powerProd: 3, tier: 1, cost: 18, cat: "Source", tech_category: "Grid", desc: "Produces 3 power." },
    { id: "tachyon_source", name: "Tachyon Source", powerProd: 6, tier: 2, cost: 60, cat: "Source", tech_category: "Grid", desc: "Produces 6 power." },
    { id: "quantum_source", name: "Quantum Source", powerProd: 9, tier: 3, cost: 120, cat: "Source", tech_category: "Grid", desc: "Generates 9 power." },
    { id: "micro_fusion", name: "Micro Fusion", powerProd: 2, tier: 1, cost: 12, cat: "Source", tech_category: "Grid", desc: "Small reactor that makes 2 power." },
    { id: "zero_point", name: "Zero-Point Source", powerProd: 12, tier: 3, cost: 150, cat: "Source", tech_category: "Grid", desc: "Generates 12 power." },
  ],
  drives: [
    { id: "fusion_drive", name: "Fusion Drive", init: 1, powerCost: 1, tier: 1, cost: 18, cat: "Drive", tech_category: "Grid", desc: "Adds +1 initiative; uses 1 power." },
    { id: "tachyon_drive", name: "Tachyon Drive", init: 2, powerCost: 2, tier: 2, cost: 55, cat: "Drive", tech_category: "Grid", desc: "Adds +2 initiative; uses 2 power." },
    { id: "warp_drive", name: "Warp Drive", init: 3, powerCost: 3, tier: 2, cost: 95, cat: "Drive", tech_category: "Grid", desc: "Adds +3 initiative; uses 3 power." },
    { id: "ion_thruster", name: "Ion Thruster", init: 1, powerCost: 0, tier: 1, cost: 30, cat: "Drive", tech_category: "Grid", desc: "Adds +1 initiative with no power cost." },
    { id: "transition_drive", name: "Transition Drive", init: 3, powerCost: 2, tier: 3, cost: 120, cat: "Drive", tech_category: "Grid", desc: "Adds +3 initiative for 2 power." },
    { id: "overtuned_drive", name: "Overtuned Drive", init: 2, powerCost: 1, tier: 2, cost: 40, cat: "Drive", tech_category: "Grid", desc: "Adds +2 initiative for only 1 power. Experimental: 20% chance to lose 1 initiative on shop reroll (min +0).", effects: [{ hook: 'onShopReroll', effect: { kind: 'downgradeOnReroll', chancePct: 20, stat: 'init', min: 0 } }] },
  ],
  weapons: [
    { id: "plasma", name: "Plasma Cannon", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 1, cost: 25, cat: "Weapon", tech_category: "Nano", desc: "Rolls 1 die; hits deal 1 damage." },
    { id: "antimatter", name: "Antimatter Cannon", dice: 1, dmgPerHit: 2, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 2 } ], powerCost: 2, tier: 2, cost: 75, cat: "Weapon", tech_category: "Nano", desc: "Rolls 1 die; hits deal 2 damage." },
    { id: "singularity", name: "Singularity Cannon", dice: 1, dmgPerHit: 3, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 3 } ], powerCost: 3, tier: 3, cost: 120, cat: "Weapon", tech_category: "Nano", desc: "Rolls 1 die; hits deal 3 damage." },
    { id: "plasma_array", name: "Plasma Array", dice: 2, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 60, cat: "Weapon", tech_category: "Nano", desc: "Rolls 2 dice; each hit deals 1 damage." },
    { id: "plasma_battery", name: "Plasma Battery", dice: 3, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 3, tier: 3, cost: 140, cat: "Weapon", tech_category: "Nano", slots: 2, desc: "Rolls 3 dice; each hit deals 1 damage." },
    { id: "plasma_cluster", name: "Plasma Cluster", dice: 4, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 3, tier: 3, cost: 150, cat: "Weapon", tech_category: "Nano", slots: 2, desc: "Rolls 4 dice; each hit deals 1 damage." },
    { id: "antimatter_array", name: "Antimatter Array", dice: 2, dmgPerHit: 2, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 2 } ], powerCost: 4, tier: 3, cost: 150, cat: "Weapon", tech_category: "Nano", desc: "Rolls 2 dice; each hit deals 2 damage." },
    { id: "bargain_plasma", name: "Bargain Plasma", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 1, cost: 20, cat: "Weapon", tech_category: "Nano", desc: "Baseline plasma. While installed, shop prices are 10% lower.", effects: [{ hook: 'onShopPurchase', effect: { kind: 'econDiscount', percent: 10 } }] },
    { id: "rebound_blaster", name: "Rebound Blaster", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 1, cost: 35, cat: "Weapon", tech_category: "Nano", desc: "On miss: 25% chance to reroll.", effects: [{ hook: 'onMiss', effect: { kind: 'rerollOnMiss', chancePct: 25 } }] },
    { id: "volatile_cannon", name: "Volatile Cannon", riftDice: 1, faces: RIFT_FACES, powerCost: 2, tier: 2, cost: 55, cat: "Weapon", tech_category: "Nano", desc: "Rolls a Rift die. If it self-hits, all allies gain +1 Aim next round.", effects: [{ hook: 'onSelfHit', effect: { kind: 'aimBuffNextRoundFleet', amount: 1 } }] },
    { id: "fleetfire_array", name: "Fleetfire Array", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 70, cat: "Weapon", tech_category: "Nano", desc: "Gains +1 die per other ship in your fleet at the start of combat.", effects: [{ hook: 'onPreCombat', effect: { kind: 'gainDicePerShip', amount: 1 } }] },
    { id: "hexfire_projector", name: "Hexfire Projector", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 75, cat: "Weapon", tech_category: "Nano", desc: "Gains +1 die per different weapon type on this ship.", effects: [{ hook: 'onPreCombat', effect: { kind: 'gainDicePerUniqueWeapon', amount: 1 } }] },
    { id: "entropy_beam", name: "Entropy Beam", dice: 1, dmgPerHit: 0, faces: [ { roll: 6 } ], powerCost: 1, tier: 2, cost: 60, cat: "Weapon", tech_category: "Nano", desc: "Utility beam. Always hits; lowers enemy shield tier by 1 this round.", effects: [{ hook: 'onHit', effect: { kind: 'lowerShieldThisRound', amount: 1 } }] },
    { id: "volatile_array", name: "Volatile Array", dice: 3, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 3, cost: 85, cat: "Weapon", tech_category: "Nano", slots: 2, desc: "Overtuned triple array for only 1 power. 20% chance to disintegrate on purchase.", effects: [{ hook: 'onShopPurchase', effect: { kind: 'destroyOnPurchase', chancePct: 20 } }] },
    { id: "recursive_array_mk1", name: "Recursive Array Mk I", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 2, cost: 80, cat: "Weapon", tech_category: "Nano", desc: "On hit, immediately roll this weapon again with -1 damage (min 1).", effects: [{ hook: 'onHit', effect: { kind: 'chainOnHit', decay: 1, minDmg: 1 } }] },
  ],
  computers: [
    { id: "positron", name: "Positron Computer", aim: 1, powerCost: 1, tier: 1, cost: 25, cat: "Computer", tech_category: "Grid", desc: "Adds +1 Aim; costs 1 power." },
    { id: "gluon", name: "Gluon Computer", aim: 2, powerCost: 2, tier: 2, cost: 60, cat: "Computer", tech_category: "Grid", desc: "Adds +2 Aim; costs 2 power." },
    { id: "neutrino", name: "Neutrino Computer", aim: 3, powerCost: 3, tier: 3, cost: 100, cat: "Computer", tech_category: "Grid", desc: "Adds +3 Aim; costs 3 power." },
    { id: "sentient_ai", name: "Sentient AI", aim: 4, powerCost: 3, tier: 3, cost: 150, cat: "Computer", tech_category: "Grid", desc: "Adds +4 Aim; costs 3 power."},
  ],
  shields: [
    { id: "gauss", name: "Gauss Shield", shieldTier: 1, powerCost: 1, tier: 1, cost: 20, cat: "Shield", tech_category: "Nano", desc: "Shield tier 1; uses 1 power." },
    { id: "phase", name: "Phase Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 60, cat: "Shield", tech_category: "Nano", desc: "Shield tier 2; uses 2 power." },
    { id: "omega", name: "Omega Shield", shieldTier: 3, powerCost: 3, tier: 3, cost: 100, cat: "Shield", tech_category: "Nano", desc: "Shield tier 3; uses 3 power." },
    { id: "magnet_shield", name: "Magnet Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 70, cat: "Shield", tech_category: "Nano", desc: "Shield tier 2. Aggro: enemies must target this ship if possible.", effects: [{ hook: 'onPreCombat', effect: { kind: 'magnetize' } }] },
    { id: "unstable_shield", name: "Unstable Shield", shieldTier: 3, powerCost: 1, tier: 3, cost: 75, cat: "Shield", tech_category: "Nano", desc: "Overtuned tier-3 shield for 1 power. 15% chance to disintegrate when you purchase any item.", effects: [{ hook: 'onShopPurchase', effect: { kind: 'destroyOnPurchase', chancePct: 15 } }] },
  ],
  hull: [
    { id: "improved", name: "Improved Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 22, cat: "Hull", tech_category: "Nano", desc: "Adds 2 hull." },
    { id: "adamantine", name: "Adamantine Hull", extraHull: 3, powerCost: 1, tier: 3, cost: 110, cat: "Hull", tech_category: "Nano", desc: "Adds 3 hull; uses 1 power." },
    { id: "composite", name: "Composite Hull", extraHull: 1, powerCost: 0, tier: 1, cost: 15, cat: "Hull", tech_category: "Nano", desc: "Adds 1 hull." },
    { id: "monolith_plating", name: "Monolith Plating", extraHull: 4, powerCost: 2, tier: 3, cost: 160, cat: "Hull", tech_category: "Nano", desc: "Adds 4 hull; uses 2 power." },
    { id: "magnet_hull", name: "Magnet Hull", extraHull: 2, tier: 2, cost: 55, cat: "Hull", tech_category: "Nano", desc: "+2 hull. Aggro: enemies must target this ship if possible.", effects: [{ hook: 'onPreCombat', effect: { kind: 'magnetize' } }] },
    { id: "spite_plating", name: "Spite Plating", extraHull: 1, powerCost: 1, tier: 2, cost: 28, cat: "Hull", tech_category: "Nano", desc: "+1 hull. On destruction: roll a die; on 5–6, deal 1 damage to the attacker.", effects: [{ hook: 'onShipDeath', effect: { kind: 'retaliateOnDeathDamage', dieThreshold: 5, dmg: 1 } }] },
    { id: "reckless_hull", name: "Reckless Hull", extraHull: 3, powerCost: 0, tier: 2, cost: 60, cat: "Hull", tech_category: "Nano", desc: "+3 hull for 0 power. 15% chance to vanish on each shop reroll.", effects: [{ hook: 'onShopReroll', effect: { kind: 'destroyOnShopReroll', chancePct: 15 } }] },
  ],
  rare: RARE_PARTS,
} as const;

export const ALL_PARTS: Part[] = [
  ...PARTS.sources,
  ...PARTS.drives,
  ...PARTS.weapons,
  ...PARTS.computers,
  ...PARTS.shields,
  ...PARTS.hull,
  ...RARE_PARTS,
];

export const PART_EFFECT_FIELDS = [
  'powerProd', 'powerCost', 'init', 'dice', 'dmgPerHit', 'riftDice', 'shieldTier', 'extraHull', 'aim', 'initLoss', 'regen',
] as const;
export type PartEffectField = typeof PART_EFFECT_FIELDS[number];
export const PART_EFFECT_SYMBOLS: Record<PartEffectField, string> = {
  powerProd: '⚡+', powerCost: '⚡-', init: '🚀', dice: '🎲', dmgPerHit: '💥', riftDice: '🕳️', shieldTier: '🛡️', extraHull: '❤️', aim: '🎯', initLoss: '🚀-', regen: '❤️+',
} as const;

export function partEffects(p: Part) {
  const effects: string[] = [];
  const isBeam = p.name.toLowerCase().includes('beam');
  for (const key of PART_EFFECT_FIELDS) {
    if (key === 'dmgPerHit' || key === 'initLoss') continue;
    if (isBeam && key === 'dice') continue;
    const val = p[key as keyof Part];
    if (typeof val === 'number' && val !== 0) effects.push(`${PART_EFFECT_SYMBOLS[key]}${val}`);
  }
  const ePart = p as EffectfulPart;
  if (ePart.effects) {
    for (const { effect } of ePart.effects) {
      switch (effect.kind) {
        case 'magnetize':
          effects.push('🧲');
          break;
        case 'retaliateOnDeathDamage':
        case 'retaliateOnBlockDamage':
          effects.push('💥');
          break;
        case 'lowerShieldThisRound':
          effects.push(`🔆${PART_EFFECT_SYMBOLS.shieldTier}-${effect.amount}`);
          break;
        case 'reduceInit':
          effects.push(`🔆${PART_EFFECT_SYMBOLS.initLoss}${effect.amount}`);
          break;
      }
    }
  }
  if (p.initLoss) {
    effects.push(`${isBeam ? '🔆' : ''}${PART_EFFECT_SYMBOLS.initLoss}${p.initLoss}`);
  }
  if (isBeam && !effects.some(e => e.includes('🔆'))) effects.push('🔆');
  if (p.cat === 'Weapon') {
    const faces = p.faces || [];
    const maxDmg = Math.max(p.dmgPerHit || 0, ...faces.map(f => f.dmg || 0));
    if (maxDmg > 0) effects.push(`${PART_EFFECT_SYMBOLS.dmgPerHit}${maxDmg}`);
    if (faces.length > 0) {
      const hitFaces = faces.filter(f => f.dmg).length;
      if (hitFaces > 0) effects.push(`🎯${Math.round((hitFaces / faces.length) * 100)}%`);
    }
  } else if (typeof p.dmgPerHit === 'number' && p.dmgPerHit !== 0) {
    effects.push(`${PART_EFFECT_SYMBOLS.dmgPerHit}${p.dmgPerHit}`);
  }
  return effects;
}

export function partDescription(p: Part): string {
  if (p.desc) return p.desc;
  switch (p.cat) {
    case 'Source': return `Generates ${p.powerProd || 0} power.`;
    case 'Drive': return `+${p.init || 0} initiative; costs ${p.powerCost || 0} power.`;
    case 'Computer': return `Adds +${p.aim || 0} Aim.`;
    case 'Shield': return `Provides shield tier ${p.shieldTier || 0}.`;
    case 'Hull': return `+${p.extraHull || 0} hull${p.regen ? `; regenerates ${p.regen} each round` : ''}.`;
    case 'Weapon':
    default:
      if (p.riftDice) return `Rolls ${p.riftDice} Rift die${p.riftDice > 1 ? 's' : ''}.`;
      return `Rolls ${p.dice || 0} die for ${p.dmgPerHit || 0} damage each.`;
  }
}
