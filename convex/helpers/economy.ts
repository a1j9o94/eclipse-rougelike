/**
 * Economy Helper Functions
 *
 * Converts between database playerResources schema and Resources engine PlayerEconomy type
 */

import type { PlayerEconomy, Resources } from "../engine/resources";
import { POPULATION_PRODUCTION_TABLE, INFLUENCE_UPKEEP_TABLE } from "../engine/resources";

/**
 * Database playerResources type (from schema)
 */
export type PlayerResourcesDB = {
  roomId: string;
  playerId: string;
  materials: number;
  science: number;
  money: number;
  materialsTrack: number; // cubes remaining
  scienceTrack: number;
  moneyTrack: number;
  usedInfluenceDisks: number;
  usedColonyShips: number;
  victoryPoints: number;
  hasPassed: boolean;
};

/**
 * Faction data needed for economy conversion
 */
export type FactionEconomyData = {
  maxInfluenceDisks: number;
  maxColonyShips: number;
  tradeRatio: number; // 2 for most factions, 1.5 for some
};

/**
 * Convert database playerResources to PlayerEconomy type
 *
 * @param dbResources Database playerResources record
 * @param faction Faction data for max influence and trade ratio
 * @param influenceOnSectors Count of influence disks placed on sectors
 */
export function dbToPlayerEconomy(
  dbResources: PlayerResourcesDB,
  faction: FactionEconomyData,
  influenceOnSectors: number = 0
): PlayerEconomy {
  const { materials, science, money, materialsTrack, scienceTrack, moneyTrack, usedInfluenceDisks, usedColonyShips } = dbResources;

  // Calculate influence distribution
  // usedInfluenceDisks includes both action disks and sector disks in current schema
  // We need to separate them for the Resources engine
  const totalUsed = usedInfluenceDisks;
  const onSectors = influenceOnSectors;
  const onActions = totalUsed - onSectors;
  const onTrack = faction.maxInfluenceDisks - totalUsed;

  // Calculate production values from track positions
  const moneyProduction = POPULATION_PRODUCTION_TABLE[moneyTrack] ?? 0;
  const scienceProduction = POPULATION_PRODUCTION_TABLE[scienceTrack] ?? 0;
  const materialsProduction = POPULATION_PRODUCTION_TABLE[materialsTrack] ?? 0;

  // Calculate upkeep cost from influence track state
  const upkeepCost = INFLUENCE_UPKEEP_TABLE[onTrack] ?? 0;

  // Calculate colony ship state
  const colonyShipsUsed = usedColonyShips;
  const colonyShipsAvailable = faction.maxColonyShips - colonyShipsUsed;

  return {
    resources: {
      money,
      science,
      materials,
    },
    populationTracks: {
      money: {
        type: 'money',
        cubesRemaining: moneyTrack,
        productionValue: moneyProduction,
      },
      science: {
        type: 'science',
        cubesRemaining: scienceTrack,
        productionValue: scienceProduction,
      },
      materials: {
        type: 'materials',
        cubesRemaining: materialsTrack,
        productionValue: materialsProduction,
      },
    },
    influence: {
      onTrack,
      onActions,
      onSectors,
      totalAvailable: faction.maxInfluenceDisks,
      upkeepCost,
    },
    colonyShips: {
      total: faction.maxColonyShips,
      available: colonyShipsAvailable,
      used: colonyShipsUsed,
    },
    tradeRatio: faction.tradeRatio,
  };
}

/**
 * Convert PlayerEconomy back to database playerResources updates
 *
 * Returns partial update object with only the fields that changed
 */
export function playerEconomyToDbUpdates(
  economy: PlayerEconomy
): Partial<PlayerResourcesDB> {
  // Calculate total used influence (action + sector disks)
  const usedInfluenceDisks = economy.influence.onActions + economy.influence.onSectors;

  return {
    materials: economy.resources.materials,
    science: economy.resources.science,
    money: economy.resources.money,
    materialsTrack: economy.populationTracks.materials.cubesRemaining,
    scienceTrack: economy.populationTracks.science.cubesRemaining,
    moneyTrack: economy.populationTracks.money.cubesRemaining,
    usedInfluenceDisks,
    usedColonyShips: economy.colonyShips.used,
  };
}

/**
 * Extract just the Resources part from PlayerEconomy
 */
export function getResources(economy: PlayerEconomy): Resources {
  return economy.resources;
}

/**
 * Check if player has available influence on track
 */
export function hasAvailableInfluence(economy: PlayerEconomy): boolean {
  return economy.influence.onTrack > 0;
}

/**
 * Get count of influence disks on sectors
 * (helper for querying sector resources)
 */
export function getInfluenceOnSectors(economy: PlayerEconomy): number {
  return economy.influence.onSectors;
}

/**
 * Default faction economy data for when faction not loaded
 */
export const DEFAULT_FACTION_ECONOMY: FactionEconomyData = {
  maxInfluenceDisks: 13,
  maxColonyShips: 3,
  tradeRatio: 2,
};
