/**
 * Eclipse Second Dawn - Technology Research System
 *
 * Implements the board game's technology research mechanics:
 * - 3 primary tracks: Nano, Grid, Military
 * - Rare technologies (unique, one per game)
 * - Discount system: researching in a track reduces future costs in that track
 * - Technologies unlock ship parts and special abilities
 */

import { ALL_TECHNOLOGIES, getTechCost, type Technology, type BoardGameResearch } from '../../shared/technologies_boardgame';

/**
 * Check if a technology can be researched
 */
export function canResearchTech(
  tech: Technology,
  research: BoardGameResearch,
  science: number
): { canResearch: boolean; cost: number; reason?: string } {
  // Check if already researched
  if (research.researched.includes(tech.id)) {
    return { canResearch: false, cost: 0, reason: 'Already researched' };
  }

  // Calculate cost with discounts
  let techsInTrack = 0;
  if (tech.track !== 'Rare') {
    techsInTrack = research[tech.track];
  }

  const cost = getTechCost(tech, techsInTrack);

  // Check if can afford
  if (science < cost) {
    return { canResearch: false, cost, reason: `Need ${cost} science (have ${science})` };
  }

  // For rare techs, check availability (only one of each exists)
  if (tech.track === 'Rare') {
    // In a real game, we'd check if this rare tech is still in the bag
    // For now, just check if researched
    if (research.researched.includes(tech.id)) {
      return { canResearch: false, cost, reason: 'Rare tech already taken' };
    }
  }

  return { canResearch: true, cost };
}

/**
 * Research a technology
 */
export function researchTechnology(
  tech: Technology,
  research: BoardGameResearch,
  science: number
): {
  success: boolean;
  newResearch?: BoardGameResearch;
  newScience?: number;
  cost?: number;
  error?: string;
} {
  const check = canResearchTech(tech, research, science);

  if (!check.canResearch) {
    return { success: false, error: check.reason };
  }

  const newResearch: BoardGameResearch = {
    Nano: research.Nano,
    Grid: research.Grid,
    Military: research.Military,
    researched: [...research.researched, tech.id],
  };

  // Increment track counter (rare techs can be placed on any track)
  if (tech.track === 'Nano') {
    newResearch.Nano++;
  } else if (tech.track === 'Grid') {
    newResearch.Grid++;
  } else if (tech.track === 'Military') {
    newResearch.Military++;
  }
  // Rare techs don't auto-increment a track

  return {
    success: true,
    newResearch,
    newScience: science - check.cost,
    cost: check.cost,
  };
}

/**
 * Get all available technologies to research
 */
export function getAvailableTechnologies(
  research: BoardGameResearch
): Technology[] {
  return ALL_TECHNOLOGIES.filter(tech => !research.researched.includes(tech.id));
}

/**
 * Get technologies by track
 */
export function getTechnologiesByTrack(
  track: 'Nano' | 'Grid' | 'Military' | 'Rare'
): Technology[] {
  return ALL_TECHNOLOGIES.filter(tech => tech.track === track);
}

/**
 * Get researched technologies
 */
export function getResearchedTechnologies(
  research: BoardGameResearch
): Technology[] {
  return ALL_TECHNOLOGIES.filter(tech => research.researched.includes(tech.id));
}

/**
 * Get ship parts unlocked by research
 */
export function getUnlockedShipParts(
  research: BoardGameResearch
): string[] {
  const researched = getResearchedTechnologies(research);
  return researched
    .filter(tech => tech.unlocksShipPart)
    .map(tech => tech.unlocksShipPart!.partId);
}

/**
 * Get special abilities granted by research
 */
export function getResearchAbilities(
  research: BoardGameResearch
): {
  extraActivations: Map<string, number>; // action -> count
  enabledBuildings: Set<string>;
  advancedPopulation: Set<string>;
  influenceDiscs: number;
  neutronBombs: boolean;
  neutronBombImmunity: boolean;
  antimatterSplitter: boolean;
  cloakingDevice: boolean;
  wormholeTravel: boolean;
  warpPortal: boolean;
} {
  const researched = getResearchedTechnologies(research);

  const extraActivations = new Map<string, number>();
  const enabledBuildings = new Set<string>();
  const advancedPopulation = new Set<string>();
  let influenceDiscs = 0;
  let neutronBombs = false;
  let neutronBombImmunity = false;
  let antimatterSplitter = false;
  let cloakingDevice = false;
  let wormholeTravel = false;
  let warpPortal = false;

  for (const tech of researched) {
    if (!tech.abilities) continue;

    if (tech.abilities.extraActivations) {
      const action = tech.abilities.extraActivations.action;
      const current = extraActivations.get(action) || 0;
      extraActivations.set(action, current + tech.abilities.extraActivations.count);
    }

    if (tech.abilities.enablesBuilding) {
      enabledBuildings.add(tech.abilities.enablesBuilding);
    }

    if (tech.abilities.advancedPopulation) {
      advancedPopulation.add(tech.abilities.advancedPopulation);
    }

    if (tech.abilities.influenceDiscs) {
      influenceDiscs += tech.abilities.influenceDiscs;
    }

    if (tech.abilities.neutronBombs) neutronBombs = true;
    if (tech.abilities.neutronBombImmunity) neutronBombImmunity = true;
    if (tech.abilities.antimatterSplitter) antimatterSplitter = true;
    if (tech.abilities.cloakingDevice) cloakingDevice = true;
    if (tech.abilities.wormholeTravel) wormholeTravel = true;
    if (tech.abilities.warpPortal) warpPortal = true;
  }

  return {
    extraActivations,
    enabledBuildings,
    advancedPopulation,
    influenceDiscs,
    neutronBombs,
    neutronBombImmunity,
    antimatterSplitter,
    cloakingDevice,
    wormholeTravel,
    warpPortal,
  };
}

/**
 * Calculate total victory points from researched technologies
 */
export function getTechVictoryPoints(research: BoardGameResearch): number {
  const researched = getResearchedTechnologies(research);
  return researched.reduce((total, tech) => total + (tech.vp || 0), 0);
}
