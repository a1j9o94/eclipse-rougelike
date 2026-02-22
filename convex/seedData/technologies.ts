/**
 * Eclipse: Second Dawn - Technology Seed Data
 *
 * Complete technology tree with all 40 tech tiles across 4 tracks:
 * - Nano (8 techs)
 * - Grid (8 techs)
 * - Military (8 techs)
 * - Rare (16 techs)
 *
 * Source: Eclipse Second Dawn Rulebook + Fandom Wiki
 * https://eclipse-boardgame.fandom.com/wiki/Technology
 */

export interface TechnologySeedData {
  name: string;
  track: "nano" | "grid" | "military" | "rare";
  tier: number; // 1 (cheapest) to 3 (most expensive)
  minCost: number; // minimum science cost (with discounts)
  maxCost: number; // maximum science cost (full price)
  effect: string; // human-readable description
  effectData?: string; // JSON for programmatic effects
  unlocksParts: string[]; // part names this tech unlocks
  victoryPoints: number;
  position: { x: number; y: number }; // position on tech board
}

export const technologies: TechnologySeedData[] = [
  // ============================================================================
  // NANO TECHNOLOGY TRACK
  // ============================================================================

  {
    name: "Nanorobots",
    track: "nano",
    tier: 1,
    minCost: 2,
    maxCost: 2,
    effect: "Provides one extra activation during Build Actions",
    effectData: JSON.stringify({ buildActionBonus: 1 }),
    unlocksParts: [],
    victoryPoints: 0,
    position: { x: 0, y: 0 },
  },
  {
    name: "Fusion Drive",
    track: "nano",
    tier: 1,
    minCost: 3,
    maxCost: 4,
    effect: "Unlocks Fusion Drive ship component (Movement +1, Initiative +1)",
    unlocksParts: ["Fusion Drive"],
    victoryPoints: 0,
    position: { x: 1, y: 0 },
  },
  {
    name: "Orbital",
    track: "nano",
    tier: 2,
    minCost: 4,
    maxCost: 6,
    effect: "Permits building Orbitals (+2 Money)",
    effectData: JSON.stringify({ enablesOrbital: true }),
    unlocksParts: [],
    victoryPoints: 1,
    position: { x: 0, y: 1 },
  },
  {
    name: "Advanced Robotics",
    track: "nano",
    tier: 2,
    minCost: 5,
    maxCost: 8,
    effect: "Grants one bonus Influence Disc on your track",
    effectData: JSON.stringify({ influenceDiscBonus: 1 }),
    unlocksParts: [],
    victoryPoints: 2,
    position: { x: 1, y: 1 },
  },
  {
    name: "Monolith",
    track: "nano",
    tier: 2,
    minCost: 6,
    maxCost: 12,
    effect: "Enables constructing Monoliths (+3 Science)",
    effectData: JSON.stringify({ enablesMonolith: true }),
    unlocksParts: [],
    victoryPoints: 3,
    position: { x: 2, y: 1 },
  },
  {
    name: "Advanced Labs",
    track: "nano",
    tier: 3,
    minCost: 6,
    maxCost: 10,
    effect: "Place Population Cubes in Advanced Science Population Squares with your Colony Ships",
    effectData: JSON.stringify({ enablesAdvancedScience: true }),
    unlocksParts: [],
    victoryPoints: 4,
    position: { x: 0, y: 2 },
  },
  {
    name: "Wormhole Generator",
    track: "nano",
    tier: 3,
    minCost: 7,
    maxCost: 14,
    effect: "Allows movement and influence through wormhole-connected sectors",
    effectData: JSON.stringify({ enablesWormholeTravel: true }),
    unlocksParts: [],
    victoryPoints: 5,
    position: { x: 1, y: 2 },
  },
  {
    name: "Artifact Key",
    track: "nano",
    tier: 3,
    minCost: 8,
    maxCost: 16,
    effect: "Gain 5 Resources of a single type for each Artifact controlled",
    effectData: JSON.stringify({ artifactBonus: 5 }),
    unlocksParts: [],
    victoryPoints: 5,
    position: { x: 2, y: 2 },
  },

  // ============================================================================
  // GRID TECHNOLOGY TRACK
  // ============================================================================

  {
    name: "Gauss Shield",
    track: "grid",
    tier: 1,
    minCost: 2,
    maxCost: 2,
    effect: "Permits Gauss Shield ship upgrades (+1 Shield)",
    unlocksParts: ["Gauss Shield"],
    victoryPoints: 0,
    position: { x: 3, y: 0 },
  },
  {
    name: "Fusion Source",
    track: "grid",
    tier: 1,
    minCost: 3,
    maxCost: 4,
    effect: "Unlocks Fusion Source ship component (+3 Energy)",
    unlocksParts: ["Fusion Source"],
    victoryPoints: 0,
    position: { x: 4, y: 0 },
  },
  {
    name: "Improved Hull",
    track: "grid",
    tier: 2,
    minCost: 4,
    maxCost: 6,
    effect: "Enables Improved Hull ship component (+1 Hull)",
    unlocksParts: ["Improved Hull"],
    victoryPoints: 1,
    position: { x: 3, y: 1 },
  },
  {
    name: "Positron Computer",
    track: "grid",
    tier: 2,
    minCost: 5,
    maxCost: 8,
    effect: "Allows Positron Computer ship upgrades (+2 Computer)",
    unlocksParts: ["Positron Computer"],
    victoryPoints: 2,
    position: { x: 4, y: 1 },
  },
  {
    name: "Tachyon Drive",
    track: "grid",
    tier: 2,
    minCost: 6,
    maxCost: 12,
    effect: "Unlocks Tachyon Drive ship component (Movement +2, Initiative +2)",
    unlocksParts: ["Tachyon Drive"],
    victoryPoints: 3,
    position: { x: 5, y: 1 },
  },
  {
    name: "Advanced Economy",
    track: "grid",
    tier: 3,
    minCost: 6,
    maxCost: 10,
    effect: "Place Population Cubes in Advanced Money Population Squares",
    effectData: JSON.stringify({ enablesAdvancedMoney: true }),
    unlocksParts: [],
    victoryPoints: 4,
    position: { x: 3, y: 2 },
  },
  {
    name: "Antimatter Cannon",
    track: "grid",
    tier: 3,
    minCost: 7,
    maxCost: 14,
    effect: "Enables Antimatter Cannon ship upgrades (4 Yellow Dice)",
    unlocksParts: ["Antimatter Cannon"],
    victoryPoints: 5,
    position: { x: 4, y: 2 },
  },
  {
    name: "Quantum Grid",
    track: "grid",
    tier: 3,
    minCost: 8,
    maxCost: 16,
    effect: "Grants two bonus Influence Discs",
    effectData: JSON.stringify({ influenceDiscBonus: 2 }),
    unlocksParts: [],
    victoryPoints: 5,
    position: { x: 5, y: 2 },
  },

  // ============================================================================
  // MILITARY TECHNOLOGY TRACK
  // ============================================================================

  {
    name: "Neutron Bombs",
    track: "military",
    tier: 1,
    minCost: 2,
    maxCost: 2,
    effect: "All Population Cubes in a Sector are destroyed automatically when attacking",
    effectData: JSON.stringify({ destroysPopulation: true }),
    unlocksParts: [],
    victoryPoints: 0,
    position: { x: 6, y: 0 },
  },
  {
    name: "Starbase",
    track: "military",
    tier: 1,
    minCost: 3,
    maxCost: 4,
    effect: "Permits building Starbases (powerful defensive structures)",
    effectData: JSON.stringify({ enablesStarbase: true }),
    unlocksParts: ["Starbase Hull"],
    victoryPoints: 0,
    position: { x: 7, y: 0 },
  },
  {
    name: "Plasma Cannon",
    track: "military",
    tier: 2,
    minCost: 4,
    maxCost: 6,
    effect: "Unlocks Plasma Cannon ship component (2 Yellow Dice)",
    unlocksParts: ["Plasma Cannon"],
    victoryPoints: 1,
    position: { x: 6, y: 1 },
  },
  {
    name: "Phase Shield",
    track: "military",
    tier: 2,
    minCost: 5,
    maxCost: 8,
    effect: "Permits Phase Shield ship upgrades (+2 Shield)",
    unlocksParts: ["Phase Shield"],
    victoryPoints: 2,
    position: { x: 7, y: 1 },
  },
  {
    name: "Advanced Mining",
    track: "military",
    tier: 2,
    minCost: 6,
    maxCost: 10,
    effect: "Place Population Cubes in Advanced Materials Population Squares",
    effectData: JSON.stringify({ enablesAdvancedMaterials: true }),
    unlocksParts: [],
    victoryPoints: 3,
    position: { x: 8, y: 1 },
  },
  {
    name: "Tachyon Source",
    track: "military",
    tier: 3,
    minCost: 6,
    maxCost: 12,
    effect: "Allows Tachyon Source ship upgrades (+4 Energy, Initiative +1)",
    unlocksParts: ["Tachyon Source"],
    victoryPoints: 4,
    position: { x: 6, y: 2 },
  },
  {
    name: "Gluon Computer",
    track: "military",
    tier: 3,
    minCost: 7,
    maxCost: 14,
    effect: "Enables Gluon Computer ship upgrades (+3 Computer)",
    unlocksParts: ["Gluon Computer"],
    victoryPoints: 5,
    position: { x: 7, y: 2 },
  },
  {
    name: "Plasma Missile",
    track: "military",
    tier: 3,
    minCost: 8,
    maxCost: 16,
    effect: "Enables Plasma Missile ship upgrades (2 Yellow Dice, no energy cost)",
    unlocksParts: ["Plasma Missile"],
    victoryPoints: 5,
    position: { x: 8, y: 2 },
  },

  // ============================================================================
  // RARE TECHNOLOGY TRACK (only one of each per game)
  // ============================================================================

  {
    name: "Antimatter Splitter",
    track: "rare",
    tier: 2,
    minCost: 5,
    maxCost: 5,
    effect: "Allows flexible damage distribution from antimatter cannons",
    effectData: JSON.stringify({ antimatterFlexible: true }),
    unlocksParts: [],
    victoryPoints: 2,
    position: { x: 9, y: 0 },
  },
  {
    name: "Neutron Absorber",
    track: "rare",
    tier: 2,
    minCost: 5,
    maxCost: 5,
    effect: "Enemy neutron bombs have no effect on your faction",
    effectData: JSON.stringify({ neutronImmune: true }),
    unlocksParts: [],
    victoryPoints: 2,
    position: { x: 10, y: 0 },
  },
  {
    name: "Conifold Field",
    track: "rare",
    tier: 2,
    minCost: 5,
    maxCost: 5,
    effect: "Permits Conifold Field ship upgrades (special shield)",
    unlocksParts: ["Conifold Field"],
    victoryPoints: 2,
    position: { x: 11, y: 0 },
  },
  {
    name: "Cloaking Device",
    track: "rare",
    tier: 2,
    minCost: 6,
    maxCost: 7,
    effect: "Two Ships are required to Pin each of your Ships",
    effectData: JSON.stringify({ requiresTwoPinners: true }),
    unlocksParts: [],
    victoryPoints: 2,
    position: { x: 9, y: 1 },
  },
  {
    name: "Improved Logistics",
    track: "rare",
    tier: 2,
    minCost: 6,
    maxCost: 7,
    effect: "Grants one bonus Move activation per Move Action",
    effectData: JSON.stringify({ moveActionBonus: 1 }),
    unlocksParts: [],
    victoryPoints: 2,
    position: { x: 10, y: 1 },
  },
  {
    name: "Absorption Shield",
    track: "rare",
    tier: 2,
    minCost: 6,
    maxCost: 7,
    effect: "Enables Absorption Shield ship components (regenerating shield)",
    unlocksParts: ["Absorption Shield"],
    victoryPoints: 2,
    position: { x: 11, y: 1 },
  },
  {
    name: "Sentient Hull",
    track: "rare",
    tier: 2,
    minCost: 6,
    maxCost: 7,
    effect: "Enables Sentient Hull ship components (adaptive hull)",
    unlocksParts: ["Sentient Hull"],
    victoryPoints: 2,
    position: { x: 12, y: 1 },
  },
  {
    name: "Warp Portal",
    track: "rare",
    tier: 2,
    minCost: 7,
    maxCost: 9,
    effect: "Place the Warp Portal Tile on any Sector you Control (worth 1 VP)",
    effectData: JSON.stringify({ grantsWarpPortal: true, victoryPoints: 1 }),
    unlocksParts: [],
    victoryPoints: 3,
    position: { x: 9, y: 2 },
  },
  {
    name: "Soliton Cannon",
    track: "rare",
    tier: 2,
    minCost: 7,
    maxCost: 9,
    effect: "Permits Soliton Cannon ship upgrades (3 Orange Dice)",
    unlocksParts: ["Soliton Cannon"],
    victoryPoints: 3,
    position: { x: 10, y: 2 },
  },
  {
    name: "Rift Cannon",
    track: "rare",
    tier: 2,
    minCost: 7,
    maxCost: 9,
    effect: "Allows Rift Cannon ship upgrades (2 Red Dice)",
    unlocksParts: ["Rift Cannon"],
    victoryPoints: 3,
    position: { x: 11, y: 2 },
  },
  {
    name: "Transition Drive",
    track: "rare",
    tier: 2,
    minCost: 7,
    maxCost: 9,
    effect: "Unlocks Transition Drive ship components (Movement +3, Initiative +3)",
    unlocksParts: ["Transition Drive"],
    victoryPoints: 3,
    position: { x: 12, y: 2 },
  },
  {
    name: "Pico Modulator",
    track: "rare",
    tier: 3,
    minCost: 8,
    maxCost: 11,
    effect: "Provides two bonus Upgrade activations per Upgrade Action",
    effectData: JSON.stringify({ upgradeActionBonus: 2 }),
    unlocksParts: [],
    victoryPoints: 4,
    position: { x: 9, y: 3 },
  },
  {
    name: "Flux Missile",
    track: "rare",
    tier: 3,
    minCost: 8,
    maxCost: 11,
    effect: "Enables Flux Missile ship components (3 Orange Dice, no energy cost)",
    unlocksParts: ["Flux Missile"],
    victoryPoints: 4,
    position: { x: 10, y: 3 },
  },
  {
    name: "Ancient Labs",
    track: "rare",
    tier: 3,
    minCost: 9,
    maxCost: 13,
    effect: "Draw and resolve one Discovery Tile immediately",
    effectData: JSON.stringify({ drawDiscoveryTile: true }),
    unlocksParts: [],
    victoryPoints: 4,
    position: { x: 11, y: 3 },
  },
  {
    name: "Zero-Point Source",
    track: "rare",
    tier: 3,
    minCost: 10,
    maxCost: 15,
    effect: "Allows Zero-Point Source ship upgrades (+5 Energy, Initiative +2)",
    unlocksParts: ["Zero-Point Source"],
    victoryPoints: 5,
    position: { x: 9, y: 4 },
  },
  {
    name: "Metasynthesis",
    track: "rare",
    tier: 3,
    minCost: 11,
    maxCost: 17,
    effect: "Place Population Cubes in any Advanced Population Squares (all types)",
    effectData: JSON.stringify({
      enablesAdvancedMaterials: true,
      enablesAdvancedScience: true,
      enablesAdvancedMoney: true,
    }),
    unlocksParts: [],
    victoryPoints: 5,
    position: { x: 10, y: 4 },
  },
];

/**
 * Technology track metadata
 */
export const technologyTracks = {
  nano: {
    name: "Nanotechnology",
    color: "#00ff00",
    description: "Focus on automation, construction, and expansion",
  },
  grid: {
    name: "Grid Technology",
    color: "#00ffff",
    description: "Focus on energy, economy, and ship systems",
  },
  military: {
    name: "Military Technology",
    color: "#ff0000",
    description: "Focus on weapons, defenses, and resource extraction",
  },
  rare: {
    name: "Rare Technologies",
    color: "#ffff00",
    description: "Unique, powerful technologies (only one of each per game)",
  },
};

/**
 * Helper to get technologies by track
 */
export function getTechnologiesByTrack(
  track: "nano" | "grid" | "military" | "rare"
): TechnologySeedData[] {
  return technologies.filter((tech) => tech.track === track);
}

/**
 * Helper to get technologies by tier
 */
export function getTechnologiesByTier(tier: number): TechnologySeedData[] {
  return technologies.filter((tech) => tech.tier === tier);
}

/**
 * Helper to find technology by name
 */
export function getTechnologyByName(name: string): TechnologySeedData | undefined {
  return technologies.find((tech) => tech.name === name);
}

/**
 * Summary statistics
 */
export const technologyStats = {
  total: technologies.length,
  byTrack: {
    nano: getTechnologiesByTrack("nano").length,
    grid: getTechnologiesByTrack("grid").length,
    military: getTechnologiesByTrack("military").length,
    rare: getTechnologiesByTrack("rare").length,
  },
  byTier: {
    tier1: getTechnologiesByTier(1).length,
    tier2: getTechnologiesByTier(2).length,
    tier3: getTechnologiesByTier(3).length,
  },
};
