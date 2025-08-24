export type TechTrack = 'Military' | 'Grid' | 'Nano';
export type PartCategory = 'Source' | 'Drive' | 'Weapon' | 'Computer' | 'Shield' | 'Hull';

export type Part = {
  id: string;
  name: string;
  powerProd?: number;
  powerCost?: number;
  init?: number;
  dice?: number;
  dmgPerHit?: number;
  shieldTier?: number;
  extraHull?: number;
  aim?: number;
  tier: number;
  cost: number;
  tech_category: TechTrack;
  cat: PartCategory;
};

export type PartCatalog = {
  sources: Part[];
  drives: Part[];
  weapons: Part[];
  computers: Part[];
  shields: Part[];
  hull: Part[];
}

export const PARTS: PartCatalog = {
  sources: [
    { id: "fusion_source", name: "Fusion Source", powerProd: 3, tier: 1, cost: 18, cat: "Source", tech_category: "Grid" },
    { id: "tachyon_source", name: "Tachyon Source", powerProd: 5, tier: 2, cost: 60, cat: "Source", tech_category: "Grid" },
    { id: "quantum_source", name: "Quantum Source", powerProd: 7, tier: 3, cost: 120, cat: "Source", tech_category: "Grid" },
  ],
  drives: [
    { id: "fusion_drive", name: "Fusion Drive", init: 1, powerCost: 1, tier: 1, cost: 18, cat: "Drive", tech_category: "Grid" },
    { id: "tachyon_drive", name: "Tachyon Drive", init: 2, powerCost: 2, tier: 2, cost: 55, cat: "Drive", tech_category: "Grid" },
    { id: "warp_drive", name: "Warp Drive", init: 3, powerCost: 3, tier: 3, cost: 95, cat: "Drive", tech_category: "Grid" },
  ],
  weapons: [
    { id: "plasma", name: "Plasma Cannon", dice: 1, dmgPerHit: 1, powerCost: 1, tier: 1, cost: 25, cat: "Weapon", tech_category: "Nano" },
    { id: "antimatter", name: "Antimatter Cannon", dice: 1, dmgPerHit: 2, powerCost: 2, tier: 2, cost: 75, cat: "Weapon", tech_category: "Nano" },
    { id: "singularity", name: "Singularity Launcher", dice: 1, dmgPerHit: 3, powerCost: 3, tier: 3, cost: 120, cat: "Weapon", tech_category: "Nano" },
  ],
  computers: [
    { id: "positron", name: "Positron Computer", aim: 1, powerCost: 1, tier: 1, cost: 25, cat: "Computer", tech_category: "Grid" },
    { id: "gluon", name: "Gluon Computer", aim: 2, powerCost: 2, tier: 2, cost: 60, cat: "Computer", tech_category: "Grid" },
    { id: "neutrino", name: "Neutrino Computer", aim: 3, powerCost: 3, tier: 3, cost: 100, cat: "Computer", tech_category: "Grid" },
  ],
  shields: [
    { id: "gauss", name: "Gauss Shield", shieldTier: 1, powerCost: 1, tier: 1, cost: 20, cat: "Shield", tech_category: "Nano" },
    { id: "phase", name: "Phase Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 60, cat: "Shield", tech_category: "Nano" },
    { id: "omega", name: "Omega Shield", shieldTier: 3, powerCost: 3, tier: 3, cost: 100, cat: "Shield", tech_category: "Nano" },
  ],
  hull: [
    { id: "improved", name: "Improved Hull", extraHull: 1, powerCost: 0, tier: 2, cost: 22, cat: "Hull", tech_category: "Nano" },
    { id: "reinforced", name: "Reinforced Hull", extraHull: 2, powerCost: 0, tier: 3, cost: 70, cat: "Hull", tech_category: "Nano" },
    { id: "adamantine", name: "Adamantine Hull", extraHull: 3, powerCost: 0, tier: 3, cost: 110, cat: "Hull", tech_category: "Nano" },
  ],
} as const;

export const ALL_PARTS: Part[] = [
  ...PARTS.sources,
  ...PARTS.drives,
  ...PARTS.weapons,
  ...PARTS.computers,
  ...PARTS.shields,
  ...PARTS.hull,
];


