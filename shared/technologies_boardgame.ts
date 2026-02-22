/**
 * Eclipse: Second Dawn for the Galaxy - Board Game Technologies
 *
 * This file contains the complete technology tree from the Eclipse board game.
 *
 * Tech Track Structure:
 * - 3 primary tracks: Nano, Grid, Military
 * - 1 special track: Rare (unique technologies, one per game)
 *
 * Each technology has:
 * - Cost (with discount system: researching in same track reduces future costs)
 * - Effects (abilities, ship parts unlocked, etc.)
 * - Victory Points (some techs provide VP)
 */

export type TechTrack = 'Nano' | 'Grid' | 'Military' | 'Rare';

export type ShipPartType =
  | 'weapon'
  | 'shield'
  | 'hull'
  | 'drive'
  | 'source'
  | 'computer';

export type Technology = {
  id: string;
  name: string;
  track: TechTrack;
  /**
   * Cost varies based on discounts (how many techs researched in this track)
   * Format: [no discount, 1 discount, 2 discount, 3+ discount]
   * Example: [8, 6, 4, 3] means 8 base, 6 with one tech in track, etc.
   */
  cost: number[];
  /** Effect description */
  effect: string;
  /** Ship parts unlocked by this tech (if any) */
  unlocksShipPart?: {
    type: ShipPartType;
    partId: string;
  };
  /** Victory points granted (if any) */
  vp?: number;
  /** Special ability flags */
  abilities?: {
    /** Provides extra influence discs */
    influenceDiscs?: number;
    /** Extra activations for specific actions */
    extraActivations?: {
      action: 'Build' | 'Move' | 'Upgrade';
      count: number;
    };
    /** Enables building special structures */
    enablesBuilding?: 'Starbase' | 'Orbital' | 'Monolith';
    /** Advanced population placement */
    advancedPopulation?: 'Science' | 'Money' | 'Materials' | 'Any';
    /** Wormhole travel enabled */
    wormholeTravel?: boolean;
    /** Neutron bomb effects */
    neutronBombs?: boolean;
    neutronBombImmunity?: boolean;
    /** Combat modifiers */
    antimatterSplitter?: boolean; // Split antimatter damage freely
    cloakingDevice?: boolean; // Requires 2 ships to pin
    warpPortal?: boolean; // Place warp portal tile
    /** Draw discovery tile */
    drawDiscoveryTile?: boolean;
  };
};

/**
 * NANO TECHNOLOGIES
 * Focus: Construction, economics, mobility
 */
export const NANO_TECHNOLOGIES: Technology[] = [
  {
    id: 'nanorobots',
    name: 'Nanorobots',
    track: 'Nano',
    cost: [2, 2, 2, 2],
    effect: 'You have one extra Activation when taking the Build Action.',
    abilities: {
      extraActivations: { action: 'Build', count: 1 }
    }
  },
  {
    id: 'fusion_drive',
    name: 'Fusion Drive',
    track: 'Nano',
    cost: [4, 3, 3, 3],
    effect: 'You may Upgrade your Ship Blueprints with Fusion Drive Ship Parts.',
    unlocksShipPart: { type: 'drive', partId: 'fusion_drive' }
  },
  {
    id: 'orbital',
    name: 'Orbital',
    track: 'Nano',
    cost: [6, 5, 4, 4],
    effect: 'You may Build Orbitals.',
    abilities: {
      enablesBuilding: 'Orbital'
    }
  },
  {
    id: 'advanced_robotics',
    name: 'Advanced Robotics',
    track: 'Nano',
    cost: [8, 6, 5, 5],
    effect: 'You receive one additional Influence Disc, placed immediately on your Influence Track.',
    abilities: {
      influenceDiscs: 1
    }
  },
  {
    id: 'advanced_labs',
    name: 'Advanced Labs',
    track: 'Nano',
    cost: [10, 8, 6, 6],
    effect: 'You may place Population Cubes in Advanced Science Population Squares with your Colony Ships.',
    abilities: {
      advancedPopulation: 'Science'
    }
  },
  {
    id: 'monolith',
    name: 'Monolith',
    track: 'Nano',
    cost: [12, 10, 8, 6],
    effect: 'You may Build Monoliths.',
    abilities: {
      enablesBuilding: 'Monolith'
    }
  },
  {
    id: 'wormhole_generator',
    name: 'Wormhole Generator',
    track: 'Nano',
    cost: [14, 12, 10, 7],
    effect: 'You may Explore, Move to, and Influence adjacent Sectors if the edges connecting the Sectors contain one Wormhole.',
    abilities: {
      wormholeTravel: true
    }
  },
  {
    id: 'artifact_key',
    name: 'Artifact Key',
    track: 'Nano',
    cost: [16, 14, 12, 8],
    effect: 'For each Artifact on Sectors you Control, immediately gain 5 Resources of a single type.',
  },
];

/**
 * GRID TECHNOLOGIES
 * Focus: Ship parts (sources, shields, hull, drives)
 */
export const GRID_TECHNOLOGIES: Technology[] = [
  {
    id: 'gauss_shield',
    name: 'Gauss Shield',
    track: 'Grid',
    cost: [2, 2, 2, 2],
    effect: 'You may Upgrade your Ship Blueprints with Gauss Shield Ship Parts.',
    unlocksShipPart: { type: 'shield', partId: 'gauss_shield' }
  },
  {
    id: 'fusion_source',
    name: 'Fusion Source',
    track: 'Grid',
    cost: [4, 3, 3, 3],
    effect: 'You may Upgrade your Ship Blueprints with Fusion Source Ship Parts.',
    unlocksShipPart: { type: 'source', partId: 'fusion_source' }
  },
  {
    id: 'improved_hull',
    name: 'Improved Hull',
    track: 'Grid',
    cost: [6, 5, 4, 4],
    effect: 'You may Upgrade your Ship Blueprints with Improved Hull Ship Parts.',
    unlocksShipPart: { type: 'hull', partId: 'improved_hull' }
  },
  {
    id: 'positron_computer',
    name: 'Positron Computer',
    track: 'Grid',
    cost: [8, 6, 5, 5],
    effect: 'You may Upgrade your Ship Blueprints with Positron Computer Ship Parts.',
    unlocksShipPart: { type: 'computer', partId: 'positron_computer' }
  },
  {
    id: 'advanced_economy',
    name: 'Advanced Economy',
    track: 'Grid',
    cost: [10, 8, 6, 6],
    effect: 'You may place Population Cubes in Advanced Money Population Squares with your Colony Ships.',
    abilities: {
      advancedPopulation: 'Money'
    }
  },
  {
    id: 'tachyon_drive',
    name: 'Tachyon Drive',
    track: 'Grid',
    cost: [12, 10, 8, 6],
    effect: 'You may Upgrade your Ship Blueprints with Tachyon Drive Ship Parts.',
    unlocksShipPart: { type: 'drive', partId: 'tachyon_drive' }
  },
  {
    id: 'antimatter_cannon',
    name: 'Antimatter Cannon',
    track: 'Grid',
    cost: [14, 12, 10, 7],
    effect: 'You may Upgrade your Ship Blueprints with Antimatter Cannon Ship Parts.',
    unlocksShipPart: { type: 'weapon', partId: 'antimatter_cannon' }
  },
  {
    id: 'quantum_grid',
    name: 'Quantum Grid',
    track: 'Grid',
    cost: [16, 14, 12, 8],
    effect: 'You receive two additional Influence Discs, placed immediately on your Influence Track.',
    abilities: {
      influenceDiscs: 2
    }
  },
];

/**
 * MILITARY TECHNOLOGIES
 * Focus: Weapons, defenses, population
 */
export const MILITARY_TECHNOLOGIES: Technology[] = [
  {
    id: 'neutron_bombs',
    name: 'Neutron Bombs',
    track: 'Military',
    cost: [2, 2, 2, 2],
    effect: 'When Attacking Population, all Population Cubes in a Sector are destroyed automatically.',
    abilities: {
      neutronBombs: true
    }
  },
  {
    id: 'starbase',
    name: 'Starbase',
    track: 'Military',
    cost: [4, 3, 3, 3],
    effect: 'You may Build Starbases.',
    abilities: {
      enablesBuilding: 'Starbase'
    }
  },
  {
    id: 'plasma_cannon',
    name: 'Plasma Cannon',
    track: 'Military',
    cost: [6, 5, 4, 4],
    effect: 'You may Upgrade your Ship Blueprints with Plasma Cannon Ship Parts.',
    unlocksShipPart: { type: 'weapon', partId: 'plasma_cannon' }
  },
  {
    id: 'phase_shield',
    name: 'Phase Shield',
    track: 'Military',
    cost: [8, 6, 5, 5],
    effect: 'You may Upgrade your Ship Blueprints with Phase Shield Ship Parts.',
    unlocksShipPart: { type: 'shield', partId: 'phase_shield' }
  },
  {
    id: 'advanced_mining',
    name: 'Advanced Mining',
    track: 'Military',
    cost: [10, 8, 6, 6],
    effect: 'You may place Population Cubes in Advanced Materials Population Squares with your Colony Ships.',
    abilities: {
      advancedPopulation: 'Materials'
    }
  },
  {
    id: 'tachyon_source',
    name: 'Tachyon Source',
    track: 'Military',
    cost: [12, 10, 8, 6],
    effect: 'You may Upgrade your Ship Blueprints with Tachyon Source Ship Parts.',
    unlocksShipPart: { type: 'source', partId: 'tachyon_source' }
  },
  {
    id: 'gluon_computer',
    name: 'Gluon Computer',
    track: 'Military',
    cost: [14, 12, 10, 7],
    effect: 'You may Upgrade your Ship Blueprints with Gluon Computer Ship Parts.',
    unlocksShipPart: { type: 'computer', partId: 'gluon_computer' }
  },
  {
    id: 'plasma_missile',
    name: 'Plasma Missile',
    track: 'Military',
    cost: [16, 14, 12, 8],
    effect: 'You may Upgrade your Ship Blueprints with Plasma Missile Ship Parts.',
    unlocksShipPart: { type: 'weapon', partId: 'plasma_missile' }
  },
];

/**
 * RARE TECHNOLOGIES
 * Special: Only one of each exists per game
 * Can be placed on any track for discount purposes
 */
export const RARE_TECHNOLOGIES: Technology[] = [
  {
    id: 'antimatter_splitter',
    name: 'Antimatter Splitter',
    track: 'Rare',
    cost: [5, 5, 5, 5],
    effect: 'Allows you to split damage from Antimatter Cannons freely over targets.',
    abilities: {
      antimatterSplitter: true
    }
  },
  {
    id: 'neutron_absorber',
    name: 'Neutron Absorber',
    track: 'Rare',
    cost: [5, 5, 5, 5],
    effect: 'Enemy Neutron Bombs have no effect on you.',
    abilities: {
      neutronBombImmunity: true
    }
  },
  {
    id: 'conifold_field',
    name: 'Conifold Field',
    track: 'Rare',
    cost: [5, 5, 5, 5],
    effect: 'You may Upgrade your Ship Blueprints with Conifold Field Ship Parts.',
    unlocksShipPart: { type: 'shield', partId: 'conifold_field' }
  },
  {
    id: 'absorption_shield',
    name: 'Absorption Shield',
    track: 'Rare',
    cost: [7, 6, 6, 6],
    effect: 'You may Upgrade your Ship Blueprints with Absorption Shield Ship Parts.',
    unlocksShipPart: { type: 'shield', partId: 'absorption_shield' }
  },
  {
    id: 'cloaking_device',
    name: 'Cloaking Device',
    track: 'Rare',
    cost: [7, 6, 6, 6],
    effect: 'Two Ships are required to Pin each of your Ships.',
    abilities: {
      cloakingDevice: true
    }
  },
  {
    id: 'improved_logistics',
    name: 'Improved Logistics',
    track: 'Rare',
    cost: [7, 6, 6, 6],
    effect: 'Gain one additional Move Activation during each Move Action you take.',
    abilities: {
      extraActivations: { action: 'Move', count: 1 }
    }
  },
  {
    id: 'sentient_hull',
    name: 'Sentient Hull',
    track: 'Rare',
    cost: [7, 6, 6, 6],
    effect: 'You may Upgrade your Ship Blueprints with Sentient Hull Ship Parts.',
    unlocksShipPart: { type: 'hull', partId: 'sentient_hull' }
  },
  {
    id: 'rift_cannon',
    name: 'Rift Cannon',
    track: 'Rare',
    cost: [9, 8, 7, 7],
    effect: 'You may Upgrade your Ship Blueprints with Rift Cannon Ship Parts.',
    unlocksShipPart: { type: 'weapon', partId: 'rift_cannon' }
  },
  {
    id: 'soliton_cannon',
    name: 'Soliton Cannon',
    track: 'Rare',
    cost: [9, 8, 7, 7],
    effect: 'You may Upgrade your Ship Blueprints with Soliton Cannon Ship Parts.',
    unlocksShipPart: { type: 'weapon', partId: 'soliton_cannon' }
  },
  {
    id: 'transition_drive',
    name: 'Transition Drive',
    track: 'Rare',
    cost: [9, 8, 7, 7],
    effect: 'You may Upgrade your Ship Blueprints with Transition Drive Ship Parts.',
    unlocksShipPart: { type: 'drive', partId: 'transition_drive' }
  },
  {
    id: 'warp_portal',
    name: 'Warp Portal',
    track: 'Rare',
    cost: [9, 8, 7, 7],
    effect: 'Immediately place the Warp Portal Tile on any Sector you Control. Worth 1 VP if Controlled at the end of the game.',
    vp: 1,
    abilities: {
      warpPortal: true
    }
  },
  {
    id: 'flux_missile',
    name: 'Flux Missile',
    track: 'Rare',
    cost: [11, 9, 8, 8],
    effect: 'You may Upgrade your Ship Blueprints with Flux Missile Ship Parts.',
    unlocksShipPart: { type: 'weapon', partId: 'flux_missile' }
  },
  {
    id: 'pico_modulator',
    name: 'Pico Modulator',
    track: 'Rare',
    cost: [11, 9, 8, 8],
    effect: 'Gain two additional Upgrade Activations during each Upgrade Action you take.',
    abilities: {
      extraActivations: { action: 'Upgrade', count: 2 }
    }
  },
  {
    id: 'ancient_labs',
    name: 'Ancient Labs',
    track: 'Rare',
    cost: [13, 11, 9, 9],
    effect: 'Immediately draw and resolve one Discovery Tile.',
    abilities: {
      drawDiscoveryTile: true
    }
  },
  {
    id: 'zero_point_source',
    name: 'Zero-Point Source',
    track: 'Rare',
    cost: [15, 13, 11, 10],
    effect: 'You may Upgrade your Ship Blueprints with Zero-Point Source Ship Parts.',
    unlocksShipPart: { type: 'source', partId: 'zero_point_source' }
  },
  {
    id: 'metasynthesis',
    name: 'Metasynthesis',
    track: 'Rare',
    cost: [17, 15, 13, 11],
    effect: 'You may place Population Cubes in any Advanced Population Squares with your Colony Ships.',
    abilities: {
      advancedPopulation: 'Any'
    }
  },
];

/**
 * All technologies combined
 */
export const ALL_TECHNOLOGIES: Technology[] = [
  ...NANO_TECHNOLOGIES,
  ...GRID_TECHNOLOGIES,
  ...MILITARY_TECHNOLOGIES,
  ...RARE_TECHNOLOGIES,
];

/**
 * Helper to calculate tech cost with discounts
 */
export function getTechCost(tech: Technology, techsResearchedInTrack: number): number {
  const discountLevel = Math.min(techsResearchedInTrack, tech.cost.length - 1);
  return tech.cost[discountLevel];
}

/**
 * Summary statistics
 */
export const TECH_STATS = {
  total: ALL_TECHNOLOGIES.length,
  byTrack: {
    Nano: NANO_TECHNOLOGIES.length,
    Grid: GRID_TECHNOLOGIES.length,
    Military: MILITARY_TECHNOLOGIES.length,
    Rare: RARE_TECHNOLOGIES.length,
  },
  shipPartsUnlocked: ALL_TECHNOLOGIES.filter(t => t.unlocksShipPart).length,
  withAbilities: ALL_TECHNOLOGIES.filter(t => t.abilities).length,
} as const;

// Export type for research state (3 tracks + rare count)
export type BoardGameResearch = {
  Nano: number; // Count of Nano techs researched
  Grid: number; // Count of Grid techs researched
  Military: number; // Count of Military techs researched
  researched: string[]; // IDs of all researched techs (including rare)
};
