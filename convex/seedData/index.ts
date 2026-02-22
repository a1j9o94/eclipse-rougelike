/**
 * Eclipse: Second Dawn - Complete Seed Data Export
 *
 * Centralized export of all game configuration data for seeding the database.
 */

export * from "./technologies";
export * from "./parts";
export * from "./factions";
export * from "./tiles";

import { technologies, technologyStats } from "./technologies";
import { parts, partStats, shipSlotLimits, diceStats } from "./parts";
import { factions, factionStats } from "./factions";
import {
  discoveryTiles,
  reputationTiles,
  ambassadors,
  dice,
  tileStats,
} from "./tiles";

/**
 * Complete game configuration
 */
export const eclipseSeedData = {
  technologies,
  parts,
  factions,
  discoveryTiles,
  reputationTiles,
  ambassadors,
  dice,
  shipSlotLimits,
  diceStats,
};

/**
 * Summary of all seed data
 */
export const seedDataSummary = {
  technologies: technologyStats,
  parts: partStats,
  factions: factionStats,
  tiles: tileStats,
  totalEntities:
    technologies.length +
    parts.length +
    factions.length +
    discoveryTiles.length +
    reputationTiles.length +
    ambassadors.length +
    dice.length,
};

/**
 * Validation: Ensure all referenced technologies and parts exist
 */
export function validateSeedData(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate parts reference existing technologies
  parts.forEach((part) => {
    part.requiresTechnologies.forEach((techName) => {
      const tech = technologies.find((t) => t.name === techName);
      if (!tech) {
        errors.push(
          `Part "${part.name}" references non-existent technology "${techName}"`
        );
      }
    });
  });

  // Validate technologies reference existing parts
  technologies.forEach((tech) => {
    tech.unlocksParts.forEach((partName) => {
      const part = parts.find((p) => p.name === partName);
      if (!part) {
        errors.push(
          `Technology "${tech.name}" references non-existent part "${partName}"`
        );
      }
    });
  });

  // Validate factions reference existing technologies
  factions.forEach((faction) => {
    faction.startingTechnologies.forEach((techName) => {
      const tech = technologies.find((t) => t.name === techName);
      if (!tech) {
        errors.push(
          `Faction "${faction.name}" references non-existent technology "${techName}"`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Print seed data summary
 */
export function printSeedDataSummary(): void {
  console.log("Eclipse: Second Dawn - Seed Data Summary");
  console.log("========================================");
  console.log("");
  console.log(`Technologies: ${seedDataSummary.technologies.total}`);
  console.log(`  - Nano: ${seedDataSummary.technologies.byTrack.nano}`);
  console.log(`  - Grid: ${seedDataSummary.technologies.byTrack.grid}`);
  console.log(`  - Military: ${seedDataSummary.technologies.byTrack.military}`);
  console.log(`  - Rare: ${seedDataSummary.technologies.byTrack.rare}`);
  console.log("");
  console.log(`Parts: ${seedDataSummary.parts.total}`);
  console.log(`  - Cannons: ${seedDataSummary.parts.byType.cannon}`);
  console.log(`  - Missiles: ${seedDataSummary.parts.byType.missile}`);
  console.log(`  - Shields: ${seedDataSummary.parts.byType.shield}`);
  console.log(`  - Computers: ${seedDataSummary.parts.byType.computer}`);
  console.log(`  - Drives: ${seedDataSummary.parts.byType.drive}`);
  console.log(`  - Hulls: ${seedDataSummary.parts.byType.hull}`);
  console.log(`  - Power Sources: ${seedDataSummary.parts.byType.power_source}`);
  console.log("");
  console.log(`Factions: ${seedDataSummary.factions.total}`);
  console.log(`  - Terran: ${seedDataSummary.factions.terran}`);
  console.log(`  - Alien: ${seedDataSummary.factions.alien}`);
  console.log("");
  console.log(
    `Discovery Tiles: ${seedDataSummary.tiles.discoveryTiles.total} (${seedDataSummary.tiles.discoveryTiles.types} types)`
  );
  console.log(
    `Reputation Tiles: ${seedDataSummary.tiles.reputationTiles.total} (${seedDataSummary.tiles.reputationTiles.values} values)`
  );
  console.log(
    `Ambassadors: ${seedDataSummary.tiles.ambassadors.total} (${seedDataSummary.tiles.ambassadors.types} types)`
  );
  console.log("");
  console.log(`Total Entities: ${seedDataSummary.totalEntities}`);
  console.log("");

  const validation = validateSeedData();
  if (validation.valid) {
    console.log("✅ All seed data is valid!");
  } else {
    console.log("❌ Seed data validation errors:");
    validation.errors.forEach((error) => console.log(`  - ${error}`));
  }
}
