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
  tier: number;
  cost: number;
  tech_category: TechTrack;
  cat: PartCategory;
  rare?: boolean;
};

export type PartCatalog = {
  sources: Part[];
  drives: Part[];
  weapons: Part[];
  computers: Part[];
  shields: Part[];
  hull: Part[];
}

export const RIFT_FACES: DieFace[] = [
  { dmg: 1 },
  { dmg: 2 },
  { dmg: 3, self: 1 },
  { self: 1 },
  {},
  {},
] as const;

export const PARTS: PartCatalog = {
  sources: [
    { id: "fusion_source", name: "Fusion Source", powerProd: 3, tier: 1, cost: 18, cat: "Source", tech_category: "Grid" },
    { id: "tachyon_source", name: "Tachyon Source", powerProd: 6, tier: 2, cost: 60, cat: "Source", tech_category: "Grid" },
    { id: "quantum_source", name: "Quantum Source", powerProd: 9, tier: 3, cost: 120, cat: "Source", tech_category: "Grid" },
    { id: "micro_fusion", name: "Micro Fusion", powerProd: 2, tier: 1, cost: 12, cat: "Source", tech_category: "Grid" },
    { id: "zero_point", name: "Zero-Point Source", powerProd: 12, tier: 3, cost: 150, cat: "Source", tech_category: "Grid" },
  ],
  drives: [
    { id: "fusion_drive", name: "Fusion Drive", init: 1, powerCost: 1, tier: 1, cost: 18, cat: "Drive", tech_category: "Grid" },
    { id: "tachyon_drive", name: "Tachyon Drive", init: 2, powerCost: 2, tier: 2, cost: 55, cat: "Drive", tech_category: "Grid" },
    { id: "warp_drive", name: "Warp Drive", init: 3, powerCost: 3, tier: 2, cost: 95, cat: "Drive", tech_category: "Grid" },
    { id: "ion_thruster", name: "Ion Thruster", init: 1, powerCost: 0, tier: 1, cost: 22, cat: "Drive", tech_category: "Grid" },
    { id: "transition_drive", name: "Transition Drive", init: 3, powerCost: 2, tier: 3, cost: 120, cat: "Drive", tech_category: "Grid" },
  ],
  weapons: [
    {
      id: "plasma",
      name: "Plasma Cannon",
      dice: 1,
      dmgPerHit: 1,
      faces: [
        { roll: 1 },
        { roll: 2 },
        { roll: 3 },
        { roll: 4 },
        { roll: 5 },
        { dmg: 1 },
      ],
      powerCost: 1,
      tier: 1,
      cost: 25,
      cat: "Weapon",
      tech_category: "Nano",
    },
    {
      id: "antimatter",
      name: "Antimatter Cannon",
      dice: 1,
      dmgPerHit: 2,
      faces: [
        { roll: 1 },
        { roll: 2 },
        { roll: 3 },
        { roll: 4 },
        { roll: 5 },
        { dmg: 2 },
      ],
      powerCost: 2,
      tier: 2,
      cost: 75,
      cat: "Weapon",
      tech_category: "Nano",
    },
    {
      id: "singularity",
      name: "Singularity Launcher",
      dice: 1,
      dmgPerHit: 3,
      faces: [
        { roll: 1 },
        { roll: 2 },
        { roll: 3 },
        { roll: 4 },
        { roll: 5 },
        { dmg: 3 },
      ],
      powerCost: 3,
      tier: 3,
      cost: 120,
      cat: "Weapon",
      tech_category: "Nano",
    },
    {
      id: "plasma_array",
      name: "Plasma Array",
      dice: 2,
      dmgPerHit: 1,
      faces: [
        { roll: 1 },
        { roll: 2 },
        { roll: 3 },
        { roll: 4 },
        { roll: 5 },
        { dmg: 1 },
      ],
      powerCost: 2,
      tier: 2,
      cost: 60,
      cat: "Weapon",
      tech_category: "Nano",
    },
    {
      id: "antimatter_array",
      name: "Antimatter Array",
      dice: 2,
      dmgPerHit: 2,
      faces: [
        { roll: 1 },
        { roll: 2 },
        { roll: 3 },
        { roll: 4 },
        { roll: 5 },
        { dmg: 2 },
      ],
      powerCost: 4,
      tier: 3,
      cost: 150,
      cat: "Weapon",
      tech_category: "Nano",
    },
  ],
  computers: [
    { id: "positron", name: "Positron Computer", aim: 1, powerCost: 1, tier: 1, cost: 25, cat: "Computer", tech_category: "Grid" },
    { id: "gluon", name: "Gluon Computer", aim: 2, powerCost: 2, tier: 2, cost: 60, cat: "Computer", tech_category: "Grid" },
    { id: "neutrino", name: "Neutrino Computer", aim: 3, powerCost: 3, tier: 3, cost: 100, cat: "Computer", tech_category: "Grid" },
    { id: "sentient_ai", name: "Sentient AI", aim: 4, powerCost: 3, tier: 3, cost: 150, cat: "Computer", tech_category: "Grid"},
  ],
  shields: [
    { id: "gauss", name: "Gauss Shield", shieldTier: 1, powerCost: 1, tier: 1, cost: 20, cat: "Shield", tech_category: "Nano" },
    { id: "phase", name: "Phase Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 60, cat: "Shield", tech_category: "Nano" },
    { id: "omega", name: "Omega Shield", shieldTier: 3, powerCost: 3, tier: 3, cost: 100, cat: "Shield", tech_category: "Nano" },
  ],
  hull: [
    { id: "improved", name: "Improved Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 22, cat: "Hull", tech_category: "Nano" },
    { id: "adamantine", name: "Adamantine Hull", extraHull: 3, powerCost: 1, tier: 3, cost: 110, cat: "Hull", tech_category: "Nano" },
    { id: "composite", name: "Composite Hull", extraHull: 1, powerCost: 0, tier: 1, cost: 15, cat: "Hull", tech_category: "Nano" },
    { id: "monolith_plating", name: "Monolith Plating", extraHull: 4, powerCost: 2, tier: 3, cost: 160, cat: "Hull", tech_category: "Nano" },
  ],
} as const;

export const RARE_PARTS: Part[] = [
  {
    id: "spike_launcher",
    name: "Spike Launcher",
    dice: 1,
    dmgPerHit: 3,
    faces: [
      { roll: 0 },
      { roll: 0 },
      { roll: 0 },
      { roll: 0 },
      { roll: 0 },
      { dmg: 3 },
    ],
    powerCost: 1,
    tier: 1,
    cost: 30,
    cat: "Weapon",
    tech_category: "Nano",
    rare: true,
  },
  {
    id: "rift_cannon",
    name: "Rift Cannon",
    riftDice: 1,
    faces: RIFT_FACES,
    powerCost: 2,
    tier: 2,
    cost: 65,
    cat: "Weapon",
    tech_category: "Nano",
    rare: true,
  },
    { id: "sentient_hull", name: "Sentient Hull", extraHull: 1, aim: 1, powerCost: 0, tier: 2, cost: 50, cat: "Computer", tech_category: "Nano", rare: true },
{ id: "absorption", name: "Absorption Shield", shieldTier: 1, powerProd: 4, tier: 2, cost: 65, cat: "Shield", tech_category: "Nano", rare: true},
 { id: "quantum_cpu", name: "Quantum Computer", aim: 2, powerCost: 1, tier: 2, cost: 70, cat: "Computer", tech_category: "Grid", rare: true},
{ id: "rift_conductor", name: "Rift Conductor", extraHull: 1, riftDice: 1, powerCost: 1, tier: 2, cost: 40, cat: "Hull", tech_category: "Nano", rare: true},
];

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
  'powerProd',
  'powerCost',
  'init',
  'dice',
  'dmgPerHit',
  'riftDice',
  'shieldTier',
  'extraHull',
  'aim',
] as const;

export type PartEffectField = typeof PART_EFFECT_FIELDS[number];

export const PART_EFFECT_SYMBOLS: Record<PartEffectField, string> = {
  powerProd: '⚡+',
  powerCost: '⚡-',
  init: '🚀',
  dice: '🎲',
  dmgPerHit: '💥',
  riftDice: '🕳️',
  shieldTier: '🛡️',
  extraHull: '❤️',
  aim: '🎯',
} as const;

export function partEffects(p: Part) {
  const effects: string[] = [];
  for (const key of PART_EFFECT_FIELDS) {
    if (key === 'dmgPerHit') continue;
    const val = p[key as keyof Part];
    if (typeof val === 'number' && val !== 0) {
      effects.push(`${PART_EFFECT_SYMBOLS[key]}${val}`);
    }
  }
  if (p.cat === 'Weapon') {
    const faces = p.faces || [];
    const maxDmg = Math.max(p.dmgPerHit || 0, ...faces.map(f => f.dmg || 0));
    if (maxDmg > 0) effects.push(`${PART_EFFECT_SYMBOLS.dmgPerHit}${maxDmg}`);
    if (faces.length > 0) {
      const hitFaces = faces.filter(f => f.dmg).length;
      if (hitFaces > 0) {
        const pct = Math.round((hitFaces / faces.length) * 100);
        effects.push(`🎯${pct}%`);
      }
    }
  } else if (typeof p.dmgPerHit === 'number' && p.dmgPerHit !== 0) {
    effects.push(`${PART_EFFECT_SYMBOLS.dmgPerHit}${p.dmgPerHit}`);
  }
  return effects;
}


