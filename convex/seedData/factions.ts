/**
 * Eclipse: Second Dawn - Faction Seed Data
 *
 * All playable factions with their unique abilities and starting configurations.
 * Base game includes 7 Terran factions + 6 alien species = 13 total.
 *
 * Source: Eclipse Second Dawn Rulebook + UltraBoardGames
 * https://www.ultraboardgames.com/eclipse/alien-species.php
 */

export interface FactionSeedData {
  name: string;
  description: string;
  isAlien: boolean;

  // Starting resources
  startingMaterials: number;
  startingScience: number;
  startingMoney: number;

  // Capacities
  maxInfluenceDisks: number;
  influenceCosts: number[]; // cost to place each disk (1st disk = index 0)
  maxColonyShips: number;
  maxReputationTiles: number;
  maxAmbassadors: number;

  // Faction-specific mechanics
  actionCount: string; // e.g., "3,4,4" (actions per round at 2/3-4/5-6 players)
  tradeRatio: number; // base 2:1, some factions have 3:2
  defaultBlueprints: string[]; // starting ship designs

  // Special abilities
  specialAbilities: Array<{
    name: string;
    description: string;
    effect: string; // JSON string of effect data
  }>;

  // Starting technologies
  startingTechnologies: string[];
}

export const factions: FactionSeedData[] = [
  // ============================================================================
  // TERRAN FACTIONS (Human)
  // ============================================================================

  {
    name: "Terran Directorate",
    description:
      "Standard human faction with balanced capabilities and no special abilities",
    isAlien: false,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4", // 3 actions at 2p, 4 at 3-4p, 4 at 5-6p
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [],
    startingTechnologies: [],
  },

  {
    name: "Terran Federation",
    description: "Terran faction focused on diplomacy and influence",
    isAlien: false,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 18,
    influenceCosts: [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 5,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Diplomatic Superiority",
        description: "Starts with extra Influence Disks and Ambassadors",
        effect: JSON.stringify({ extraInfluenceDisks: 2, extraAmbassadors: 1 }),
      },
    ],
    startingTechnologies: [],
  },

  {
    name: "Terran Union",
    description: "Terran faction with economic advantages",
    isAlien: false,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 4,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Economic Powerhouse",
        description: "Starts with extra money and better trade rates",
        effect: JSON.stringify({ startingMoneyBonus: 2 }),
      },
    ],
    startingTechnologies: [],
  },

  {
    name: "Terran Republic",
    description: "Terran faction focused on military strength",
    isAlien: false,

    startingMaterials: 5,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Military Industrial Complex",
        description: "Starts with extra materials for shipbuilding",
        effect: JSON.stringify({ startingMaterialsBonus: 1 }),
      },
    ],
    startingTechnologies: [],
  },

  {
    name: "Terran Conglomerate",
    description: "Terran faction with technological advantages",
    isAlien: false,

    startingMaterials: 4,
    startingScience: 4,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Research Initiative",
        description: "Starts with extra science for faster technology development",
        effect: JSON.stringify({ startingScienceBonus: 2 }),
      },
    ],
    startingTechnologies: [],
  },

  {
    name: "Terran Alliance",
    description: "Terran faction with balanced growth potential",
    isAlien: false,

    startingMaterials: 4,
    startingScience: 3,
    startingMoney: 3,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Balanced Development",
        description: "Starts with balanced extra resources",
        effect: JSON.stringify({ balancedStart: true }),
      },
    ],
    startingTechnologies: [],
  },

  // ============================================================================
  // ALIEN SPECIES
  // ============================================================================

  {
    name: "Eridani Empire",
    description:
      "Diplomatic faction that starts with Reputation Tiles and fewer Influence Disks",
    isAlien: true,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 14,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 7, // Starts with 2 random reputation tiles
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Diplomatic Relations",
        description: "Draw two random Reputation Tiles at game start",
        effect: JSON.stringify({ startingReputationTiles: 2 }),
      },
      {
        name: "Enhanced Movement",
        description:
          "Move action allows controlling up to two ships or one ship twice",
        effect: JSON.stringify({ doubleMove: true }),
      },
    ],
    startingTechnologies: ["Gauss Shield", "Fusion Drive", "Plasma Cannon"],
  },

  {
    name: "Hydran Progress",
    description:
      "Scientific faction that can research two technologies per action",
    isAlien: true,

    startingMaterials: 4,
    startingScience: 3,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Advanced Research",
        description: "Research action enables purchasing two technologies instead of one",
        effect: JSON.stringify({ doubleTechResearch: true }),
      },
      {
        name: "Enhanced Movement",
        description:
          "Move action allows controlling up to two ships or one ship twice",
        effect: JSON.stringify({ doubleMove: true }),
      },
      {
        name: "Advanced Science Colonization",
        description:
          "Gains Population Cube in Advanced Science square during setup",
        effect: JSON.stringify({ advancedScienceStart: true }),
      },
    ],
    startingTechnologies: ["Advanced Labs"],
  },

  {
    name: "Planta",
    description:
      "Expansionist faction with multiple colony ships and exploration bonuses",
    isAlien: true,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 4, // One extra colony ship
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Rapid Exploration",
        description: "Explore action permits exploring two hexes sequentially",
        effect: JSON.stringify({ doubleExplore: true }),
      },
      {
        name: "Enhanced Movement",
        description:
          "Move action allows controlling up to two ships or one ship twice",
        effect: JSON.stringify({ doubleMove: true }),
      },
      {
        name: "Fragile Population",
        description:
          "Population Cubes automatically destroyed by enemy ships after combat",
        effect: JSON.stringify({ fragilePop: true }),
      },
      {
        name: "Territorial Control",
        description: "Earns 1 VP per controlled hex at game end",
        effect: JSON.stringify({ vpPerHex: 1 }),
      },
    ],
    startingTechnologies: ["Starbase"],
  },

  {
    name: "Descendants of Draco",
    description:
      "Ancient-focused faction that can coexist with Ancients and earn VP from them",
    isAlien: true,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Ancient Allies",
        description: "May occupy hexes with Ancients without battling them",
        effect: JSON.stringify({ coexistWithAncients: true }),
      },
      {
        name: "Selective Exploration",
        description:
          "Explore action: turn two hexes and choose one, or discard both",
        effect: JSON.stringify({ selectiveExplore: true }),
      },
      {
        name: "Enhanced Movement",
        description:
          "Move action allows controlling up to two ships or one ship twice",
        effect: JSON.stringify({ doubleMove: true }),
      },
      {
        name: "Ancient Preservation",
        description: "Earn 1 VP per Ancient Ship remaining at game end",
        effect: JSON.stringify({ vpPerAncient: 1 }),
      },
    ],
    startingTechnologies: [],
  },

  {
    name: "Mechanema",
    description:
      "Industrial faction with enhanced building and upgrade capabilities",
    isAlien: true,

    startingMaterials: 5,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 2,
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Mass Production",
        description: "Build action enables constructing up to three ships or structures",
        effect: JSON.stringify({ tripleBuild: true }),
      },
      {
        name: "Rapid Upgrades",
        description: "Upgrade action permits taking up to three Ship Part Tiles",
        effect: JSON.stringify({ tripleUpgrade: true }),
      },
      {
        name: "Enhanced Movement",
        description:
          "Move action allows controlling up to two ships or one ship twice",
        effect: JSON.stringify({ doubleMove: true }),
      },
      {
        name: "Efficient Construction",
        description: "Reduced building costs",
        effect: JSON.stringify({ buildCostReduction: 1 }),
      },
    ],
    startingTechnologies: ["Positron Computer"],
  },

  {
    name: "Orion Hegemony",
    description: "Military faction starting with a Cruiser and combat technologies",
    isAlien: true,

    startingMaterials: 4,
    startingScience: 2,
    startingMoney: 2,

    maxInfluenceDisks: 16,
    influenceCosts: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    maxColonyShips: 3,
    maxReputationTiles: 5,
    maxAmbassadors: 4,

    actionCount: "3,4,4",
    tradeRatio: 3, // Better trade ratio (3:2)
    defaultBlueprints: ["Interceptor", "Cruiser", "Dreadnought"],

    specialAbilities: [
      {
        name: "Military Focus",
        description: "Starts with Cruiser instead of Interceptor",
        effect: JSON.stringify({ startingCruiser: true }),
      },
      {
        name: "Enhanced Movement",
        description:
          "Move action allows controlling up to two ships or one ship twice",
        effect: JSON.stringify({ doubleMove: true }),
      },
      {
        name: "Superior Trade",
        description: "Better trade ratio (3:2 instead of 2:1)",
        effect: JSON.stringify({ tradeRatio: 3 }),
      },
    ],
    startingTechnologies: ["Neutron Bombs", "Gauss Shield"],
  },
];

/**
 * Helper to get faction by name
 */
export function getFactionByName(name: string): FactionSeedData | undefined {
  return factions.find((f) => f.name === name);
}

/**
 * Helper to get all Terran factions
 */
export function getTerranFactions(): FactionSeedData[] {
  return factions.filter((f) => !f.isAlien);
}

/**
 * Helper to get all Alien factions
 */
export function getAlienFactions(): FactionSeedData[] {
  return factions.filter((f) => f.isAlien);
}

/**
 * Summary statistics
 */
export const factionStats = {
  total: factions.length,
  terran: getTerranFactions().length,
  alien: getAlienFactions().length,
};
