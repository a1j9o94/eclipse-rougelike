/**
 * Eclipse: Second Dawn - Ship Parts Seed Data
 *
 * All ship components that can be equipped on blueprints:
 * - Cannons (Ion, Plasma, Antimatter, Soliton, Rift)
 * - Missiles (Plasma, Flux)
 * - Shields (Gauss, Phase, Absorption, Conifold)
 * - Computers (Targeting, Positron, Gluon)
 * - Drives (Nuclear, Fusion, Tachyon, Transition)
 * - Power Sources (Nuclear, Fusion, Tachyon, Zero-Point)
 * - Hulls (Standard, Improved, Sentient, Starbase)
 *
 * Source: Eclipse Second Dawn Rulebook
 */

export interface PartSeedData {
  name: string;
  type:
    | "cannon"
    | "missile"
    | "shield"
    | "computer"
    | "drive"
    | "hull"
    | "power_source";

  // Combat stats
  diceType?: "yellow" | "orange" | "red";
  diceCount: number;

  // Effects
  energyProduction: number; // for power sources
  energyCost: number; // energy required to use
  initiativeBonus: number;
  hullValue: number; // damage absorption
  driveSpeed: number; // movement range
  shieldValue: number; // for shields

  // Special effects
  effect?: string;
  effectData?: string; // JSON

  // Requirements
  requiresTechnologies: string[]; // tech names required
}

export const parts: PartSeedData[] = [
  // ============================================================================
  // CANNONS (energy weapons)
  // ============================================================================

  {
    name: "Ion Cannon",
    type: "cannon",
    diceType: "yellow",
    diceCount: 1,
    energyProduction: 0,
    energyCost: 1,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Plasma Cannon",
    type: "cannon",
    diceType: "yellow",
    diceCount: 2,
    energyProduction: 0,
    energyCost: 2,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Plasma Cannon"],
  },
  {
    name: "Antimatter Cannon",
    type: "cannon",
    diceType: "yellow",
    diceCount: 4,
    energyProduction: 0,
    energyCost: 4,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Antimatter Cannon"],
  },
  {
    name: "Soliton Cannon",
    type: "cannon",
    diceType: "orange",
    diceCount: 3,
    energyProduction: 0,
    energyCost: 3,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Soliton Cannon"],
  },
  {
    name: "Rift Cannon",
    type: "cannon",
    diceType: "red",
    diceCount: 2,
    energyProduction: 0,
    energyCost: 3,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Rift Cannon"],
  },

  // ============================================================================
  // MISSILES (no energy cost)
  // ============================================================================

  {
    name: "Ion Missile",
    type: "missile",
    diceType: "yellow",
    diceCount: 1,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Plasma Missile",
    type: "missile",
    diceType: "yellow",
    diceCount: 2,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Plasma Missile"],
  },
  {
    name: "Flux Missile",
    type: "missile",
    diceType: "orange",
    diceCount: 3,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Flux Missile"],
  },

  // ============================================================================
  // SHIELDS
  // ============================================================================

  {
    name: "Gauss Shield",
    type: "shield",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 1,
    requiresTechnologies: ["Gauss Shield"],
  },
  {
    name: "Phase Shield",
    type: "shield",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 2,
    requiresTechnologies: ["Phase Shield"],
  },
  {
    name: "Absorption Shield",
    type: "shield",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 2,
    effect: "Regenerates 1 shield per round",
    effectData: JSON.stringify({ regeneratesShield: 1 }),
    requiresTechnologies: ["Absorption Shield"],
  },
  {
    name: "Conifold Field",
    type: "shield",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 3,
    requiresTechnologies: ["Conifold Field"],
  },

  // ============================================================================
  // COMPUTERS
  // ============================================================================

  {
    name: "Targeting Computer",
    type: "computer",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    effect: "+1 to all attack rolls",
    effectData: JSON.stringify({ attackBonus: 1 }),
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Positron Computer",
    type: "computer",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    effect: "+2 to all attack rolls",
    effectData: JSON.stringify({ attackBonus: 2 }),
    requiresTechnologies: ["Positron Computer"],
  },
  {
    name: "Gluon Computer",
    type: "computer",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    effect: "+3 to all attack rolls",
    effectData: JSON.stringify({ attackBonus: 3 }),
    requiresTechnologies: ["Gluon Computer"],
  },

  // ============================================================================
  // DRIVES
  // ============================================================================

  {
    name: "Nuclear Drive",
    type: "drive",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 1,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Fusion Drive",
    type: "drive",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 1,
    hullValue: 0,
    driveSpeed: 1,
    shieldValue: 0,
    requiresTechnologies: ["Fusion Drive"],
  },
  {
    name: "Tachyon Drive",
    type: "drive",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 2,
    hullValue: 0,
    driveSpeed: 2,
    shieldValue: 0,
    requiresTechnologies: ["Tachyon Drive"],
  },
  {
    name: "Transition Drive",
    type: "drive",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 3,
    hullValue: 0,
    driveSpeed: 3,
    shieldValue: 0,
    requiresTechnologies: ["Transition Drive"],
  },

  // ============================================================================
  // POWER SOURCES
  // ============================================================================

  {
    name: "Nuclear Source",
    type: "power_source",
    diceCount: 0,
    energyProduction: 2,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Fusion Source",
    type: "power_source",
    diceCount: 0,
    energyProduction: 3,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Fusion Source"],
  },
  {
    name: "Tachyon Source",
    type: "power_source",
    diceCount: 0,
    energyProduction: 4,
    energyCost: 0,
    initiativeBonus: 1,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Tachyon Source"],
  },
  {
    name: "Zero-Point Source",
    type: "power_source",
    diceCount: 0,
    energyProduction: 5,
    energyCost: 0,
    initiativeBonus: 2,
    hullValue: 0,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Zero-Point Source"],
  },

  // ============================================================================
  // HULLS
  // ============================================================================

  {
    name: "Interceptor Hull",
    type: "hull",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 2,
    hullValue: 1,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Cruiser Hull",
    type: "hull",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 1,
    hullValue: 2,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Dreadnought Hull",
    type: "hull",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 3,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: [], // Starting technology
  },
  {
    name: "Starbase Hull",
    type: "hull",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 4,
    hullValue: 4,
    driveSpeed: 0,
    shieldValue: 0,
    requiresTechnologies: ["Starbase"],
  },
  {
    name: "Improved Hull",
    type: "hull",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 1,
    driveSpeed: 0,
    shieldValue: 0,
    effect: "+1 Hull (stackable)",
    effectData: JSON.stringify({ additionalHull: 1 }),
    requiresTechnologies: ["Improved Hull"],
  },
  {
    name: "Sentient Hull",
    type: "hull",
    diceCount: 0,
    energyProduction: 0,
    energyCost: 0,
    initiativeBonus: 0,
    hullValue: 2,
    driveSpeed: 0,
    shieldValue: 0,
    effect: "Adaptive hull that can repair during combat",
    effectData: JSON.stringify({ adaptiveHull: true }),
    requiresTechnologies: ["Sentient Hull"],
  },
];

/**
 * Part categories for UI organization
 */
export const partCategories = {
  weapons: ["cannon", "missile"],
  defense: ["shield", "hull"],
  systems: ["computer", "drive", "power_source"],
};

/**
 * Helper to get parts by type
 */
export function getPartsByType(
  type: PartSeedData["type"]
): PartSeedData[] {
  return parts.filter((part) => part.type === type);
}

/**
 * Helper to find part by name
 */
export function getPartByName(name: string): PartSeedData | undefined {
  return parts.find((part) => part.name === name);
}

/**
 * Helper to get starting parts (no tech requirements)
 */
export function getStartingParts(): PartSeedData[] {
  return parts.filter((part) => part.requiresTechnologies.length === 0);
}

/**
 * Ship blueprint slot limits by ship type
 */
export const shipSlotLimits = {
  interceptor: {
    hull: 1,
    powerSource: 1,
    drives: 1,
    computers: 1,
    shields: 0,
    weapons: 1, // cannon OR missile
  },
  cruiser: {
    hull: 1,
    powerSource: 1,
    drives: 2,
    computers: 1,
    shields: 1,
    weapons: 2, // cannons + missiles combined
  },
  dreadnought: {
    hull: 1,
    powerSource: 1,
    drives: 2,
    computers: 2,
    shields: 2,
    weapons: 4, // cannons + missiles combined
  },
  starbase: {
    hull: 1,
    powerSource: 1,
    drives: 0,
    computers: 2,
    shields: 3,
    weapons: 4, // cannons + missiles combined
  },
};

/**
 * Dice probability distributions
 */
export const diceStats = {
  yellow: {
    sides: [0, 0, 0, 1, 1, 2],
    averageDamage: 0.67,
    maxDamage: 2,
  },
  orange: {
    sides: [0, 1, 1, 2, 2, 3],
    averageDamage: 1.5,
    maxDamage: 3,
  },
  red: {
    sides: [1, 2, 2, 3, 3, 4],
    averageDamage: 2.5,
    maxDamage: 4,
  },
};

/**
 * Summary statistics
 */
export const partStats = {
  total: parts.length,
  byType: {
    cannon: getPartsByType("cannon").length,
    missile: getPartsByType("missile").length,
    shield: getPartsByType("shield").length,
    computer: getPartsByType("computer").length,
    drive: getPartsByType("drive").length,
    hull: getPartsByType("hull").length,
    power_source: getPartsByType("power_source").length,
  },
  starting: getStartingParts().length,
};
