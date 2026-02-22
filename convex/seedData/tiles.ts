/**
 * Eclipse: Second Dawn - Discovery Tiles, Reputation Tiles, and Ambassador Seed Data
 *
 * Discovery Tiles: Random bonuses and effects found when exploring
 * Reputation Tiles: Victory points earned through various means
 * Ambassadors: Special abilities granted during the game
 *
 * Source: Eclipse Second Dawn Rulebook
 */

// ============================================================================
// DISCOVERY TILES
// ============================================================================

export interface DiscoveryTileSeedData {
  type:
    | "money"
    | "science"
    | "materials"
    | "reputation"
    | "technology"
    | "ship_part"
    | "colony_ship"
    | "ancient_tech"
    | "wormhole_generator"
    | "artifact";

  // Immediate effects
  moneyBonus: number;
  scienceBonus: number;
  materialsBonus: number;

  // Special effects
  grantsTechnology?: string; // tech name
  grantsPart?: string; // part name
  grantsColonyShip?: boolean;

  victoryPoints: number;
  effect?: string;
  effectData?: string; // JSON

  // Quantity in the game
  count: number;
}

export const discoveryTiles: DiscoveryTileSeedData[] = [
  // Resource bonuses
  {
    type: "money",
    moneyBonus: 5,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    count: 6,
  },
  {
    type: "science",
    moneyBonus: 0,
    scienceBonus: 5,
    materialsBonus: 0,
    victoryPoints: 0,
    count: 6,
  },
  {
    type: "materials",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 5,
    victoryPoints: 0,
    count: 6,
  },

  // Small resource + VP
  {
    type: "money",
    moneyBonus: 3,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 1,
    count: 3,
  },
  {
    type: "science",
    moneyBonus: 0,
    scienceBonus: 3,
    materialsBonus: 0,
    victoryPoints: 1,
    count: 3,
  },
  {
    type: "materials",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 3,
    victoryPoints: 1,
    count: 3,
  },

  // Reputation tiles (VP only)
  {
    type: "reputation",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 2,
    count: 4,
  },
  {
    type: "reputation",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 3,
    count: 3,
  },
  {
    type: "reputation",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 4,
    count: 2,
  },

  // Technology grants (random tech from specific track)
  {
    type: "technology",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    effect: "Gain a random technology from the Nano track",
    effectData: JSON.stringify({ randomTechTrack: "nano" }),
    count: 2,
  },
  {
    type: "technology",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    effect: "Gain a random technology from the Grid track",
    effectData: JSON.stringify({ randomTechTrack: "grid" }),
    count: 2,
  },
  {
    type: "technology",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    effect: "Gain a random technology from the Military track",
    effectData: JSON.stringify({ randomTechTrack: "military" }),
    count: 2,
  },

  // Ship part grants
  {
    type: "ship_part",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    effect: "Gain a random ship part",
    effectData: JSON.stringify({ randomPart: true }),
    count: 3,
  },

  // Colony ship
  {
    type: "colony_ship",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    grantsColonyShip: true,
    effect: "Gain an extra Colony Ship",
    count: 2,
  },

  // Ancient tech (for Rise of the Ancients expansion)
  {
    type: "ancient_tech",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 2,
    effect: "Ancient technology artifact",
    effectData: JSON.stringify({ ancientTech: true }),
    count: 4,
  },

  // Wormhole generator
  {
    type: "wormhole_generator",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 1,
    effect: "Place a wormhole on this sector",
    effectData: JSON.stringify({ createsWormhole: true }),
    count: 2,
  },

  // Artifacts (variable VP based on number collected)
  {
    type: "artifact",
    moneyBonus: 0,
    scienceBonus: 0,
    materialsBonus: 0,
    victoryPoints: 0,
    effect: "Worth 2/3/4 VP for having 1/2/3+ artifacts",
    effectData: JSON.stringify({ artifactScaling: [2, 3, 4] }),
    count: 5,
  },
];

// ============================================================================
// REPUTATION TILES
// ============================================================================

export interface ReputationTileSeedData {
  victoryPoints: number;
  count: number; // how many of this VP value exist
}

export const reputationTiles: ReputationTileSeedData[] = [
  { victoryPoints: 2, count: 8 },
  { victoryPoints: 3, count: 6 },
  { victoryPoints: 4, count: 4 },
  { victoryPoints: 5, count: 2 },
];

// ============================================================================
// AMBASSADORS
// ============================================================================

export interface AmbassadorSeedData {
  name: string;
  effect: string;
  effectData?: string; // JSON
  count: number;
}

export const ambassadors: AmbassadorSeedData[] = [
  {
    name: "Skilled Ambassador",
    effect: "+2 to influence track (reduces cost of influence disks)",
    effectData: JSON.stringify({ influenceTrackBonus: 2 }),
    count: 3,
  },
  {
    name: "Trade Ambassador",
    effect: "Improve trade ratio by 1 (2:1 becomes 3:2, etc.)",
    effectData: JSON.stringify({ tradeRatioBonus: 1 }),
    count: 2,
  },
  {
    name: "Military Ambassador",
    effect: "+1 to all combat rolls this round",
    effectData: JSON.stringify({ combatBonus: 1 }),
    count: 2,
  },
  {
    name: "Science Ambassador",
    effect: "Reduce research costs by 2 science",
    effectData: JSON.stringify({ researchDiscount: 2 }),
    count: 2,
  },
  {
    name: "Economic Ambassador",
    effect: "+3 money per round",
    effectData: JSON.stringify({ moneyPerRound: 3 }),
    count: 2,
  },
  {
    name: "Industrial Ambassador",
    effect: "Build ships for 1 less material",
    effectData: JSON.stringify({ buildDiscount: 1 }),
    count: 2,
  },
  {
    name: "Explorer Ambassador",
    effect: "Draw 2 discovery tiles when exploring, choose 1",
    effectData: JSON.stringify({ doubleDiscoveryDraw: true }),
    count: 2,
  },
  {
    name: "Permanent Ambassador",
    effect: "Worth 2 VP, cannot be removed",
    effectData: JSON.stringify({ permanent: true, victoryPoints: 2 }),
    count: 1,
  },
];

// ============================================================================
// DICE DATA
// ============================================================================

export interface DiceSeedData {
  type: "yellow" | "orange" | "red";
  sides: number[]; // outcomes on each side
}

export const dice: DiceSeedData[] = [
  {
    type: "yellow",
    sides: [0, 0, 0, 1, 1, 2],
  },
  {
    type: "orange",
    sides: [0, 1, 1, 2, 2, 3],
  },
  {
    type: "red",
    sides: [1, 2, 2, 3, 3, 4],
  },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get total count of discovery tiles
 */
export function getTotalDiscoveryTiles(): number {
  return discoveryTiles.reduce((sum, tile) => sum + tile.count, 0);
}

/**
 * Get total count of reputation tiles
 */
export function getTotalReputationTiles(): number {
  return reputationTiles.reduce((sum, tile) => sum + tile.count, 0);
}

/**
 * Get total count of ambassadors
 */
export function getTotalAmbassadors(): number {
  return ambassadors.reduce((sum, amb) => sum + amb.count, 0);
}

/**
 * Get discovery tiles by type
 */
export function getDiscoveryTilesByType(
  type: DiscoveryTileSeedData["type"]
): DiscoveryTileSeedData[] {
  return discoveryTiles.filter((tile) => tile.type === type);
}

/**
 * Summary statistics
 */
export const tileStats = {
  discoveryTiles: {
    total: getTotalDiscoveryTiles(),
    types: discoveryTiles.length,
  },
  reputationTiles: {
    total: getTotalReputationTiles(),
    values: reputationTiles.length,
  },
  ambassadors: {
    total: getTotalAmbassadors(),
    types: ambassadors.length,
  },
};
