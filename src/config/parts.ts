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
  tech_category: 'Military' | 'Grid' | 'Nano';
  cat: 'Source' | 'Drive' | 'Weapon' | 'Computer' | 'Shield' | 'Hull';
};

export const PARTS: Record<string, Part[]> = {
  sources: [
    { id: "fusion_source", name: "Fusion Source", powerProd: 3, tier: 1, cost: 18, cat: "Source", tech_category: "Military" },
    { id: "tachyon_source", name: "Tachyon Source", powerProd: 5, tier: 2, cost: 60, cat: "Source", tech_category: "Military" },
  ],
  drives: [
    { id: "fusion_drive", name: "Fusion Drive", init: 1, powerCost: 1, tier: 1, cost: 18, cat: "Drive", tech_category: "Military" },
    { id: "tachyon_drive", name: "Tachyon Drive", init: 2, powerCost: 2, tier: 2, cost: 55, cat: "Drive", tech_category: "Military" },
  ],
  weapons: [
    { id: "plasma", name: "Plasma Cannon", dice: 2, dmgPerHit: 1, powerCost: 1, tier: 1, cost: 25, cat: "Weapon", tech_category: "Military" },
    { id: "antimatter", name: "Antimatter Cannon", dice: 4, dmgPerHit: 2, powerCost: 2, tier: 2, cost: 75, cat: "Weapon", tech_category: "Military" },
  ],
  computers: [
    { id: "positron", name: "Positron Computer", aim: 1, powerCost: 1, tier: 1, cost: 25, cat: "Computer", tech_category: "Military" },
    { id: "gluon", name: "Gluon Computer", aim: 2, powerCost: 2, tier: 2, cost: 60, cat: "Computer", tech_category: "Military" },
  ],
  shields: [
    { id: "gauss", name: "Gauss Shield", shieldTier: 1, powerCost: 1, tier: 1, cost: 20, cat: "Shield", tech_category: "Military" },
    { id: "phase", name: "Phase Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 60, cat: "Shield", tech_category: "Military" },
  ],
  hull: [
    { id: "improved", name: "Improved Hull", extraHull: 1, powerCost: 0, tier: 1, cost: 22, cat: "Hull", tech_category: "Military" },
    { id: "reinforced", name: "Reinforced Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 70, cat: "Hull", tech_category: "Military" },
  ],
} as const;

export const ALL_PARTS = [
  ...PARTS.sources,
  ...PARTS.drives,
  ...PARTS.weapons,
  ...PARTS.computers,
  ...PARTS.shields,
  ...PARTS.hull,
];


