/**
 * PROOF OF CONCEPT: First 5 Eclipse Technologies
 *
 * Data extracted from official Eclipse Second Dawn sources:
 * - https://eclipse-boardgame.fandom.com/wiki/Technology
 * - https://rules.dized.com/eclipse-second-dawn-for-the-galaxy
 *
 * Format matches board game exactly.
 */

export type Technology = {
  name: string;
  track: 'Nano' | 'Grid' | 'Military' | 'Rare';
  tier: 1 | 2 | 3;
  scienceCost: number[];  // [base, 1 discount, 2 discounts, 3+ discounts]
  moneyCost?: number;      // Some techs cost money (rare in this game)
  parts?: string[];        // Ship parts provided
  abilities?: string[];    // Special abilities
  victoryPoints?: number;  // VP if any
};

/**
 * First 5 Technologies from Eclipse Second Dawn
 * (Listed in order of base cost, lowest first)
 */
export const FIRST_5_TECHS: Technology[] = [
  {
    name: 'Gauss Shield',
    track: 'Grid',
    tier: 1,
    scienceCost: [2, 2, 2, 2],  // Cost 2, no discount variation
    parts: ['Gauss Shield'],
    abilities: ['You may Upgrade your Ship Blueprints with Gauss Shield Ship Parts'],
  },

  {
    name: 'Neutron Bombs',
    track: 'Military',
    tier: 1,
    scienceCost: [2, 2, 2, 2],
    abilities: ['When Attacking Population, all Population Cubes in a Sector are destroyed automatically'],
  },

  {
    name: 'Fusion Source',
    track: 'Grid',
    tier: 1,
    scienceCost: [4, 3, 3, 3],  // Cost 4 base, 3 with 1+ discounts
    parts: ['Fusion Source'],
    abilities: ['You may Upgrade your Ship Blueprints with Fusion Source Ship Parts'],
  },

  {
    name: 'Fusion Drive',
    track: 'Nano',
    tier: 1,
    scienceCost: [4, 3, 3, 3],
    parts: ['Fusion Drive'],
    abilities: ['You may Upgrade your Ship Blueprints with Fusion Drive Ship Parts'],
  },

  {
    name: 'Starbase',
    track: 'Military',
    tier: 1,
    scienceCost: [4, 3, 3, 3],
    abilities: ['You may Build Starbases'],
  },
];

/**
 * NOTES FROM DATA EXTRACTION:
 *
 * - Eclipse uses SCIENCE as the primary research cost (not money)
 * - Costs are arrays because of the discount system:
 *   - scienceCost[0] = base cost (no techs in this track yet)
 *   - scienceCost[1] = cost with 1 tech in track already
 *   - scienceCost[2] = cost with 2 techs in track already
 *   - scienceCost[3] = cost with 3+ techs in track already
 *
 * - Tiers are implicit from cost ranges:
 *   - Tier 1: Cost 2-6
 *   - Tier 2: Cost 8-12
 *   - Tier 3: Cost 14-18
 *
 * - Most techs either unlock ship parts OR provide special abilities
 * - Money costs are rare (not found in basic techs)
 * - Victory points are also rare (mainly from rare techs like Warp Portal)
 *
 * - The board game has 3 main tracks + Rare:
 *   - Grid (yellow) - Ship parts, infrastructure
 *   - Nano (blue) - Construction, mobility
 *   - Military (red) - Weapons, population
 *   - Rare (orange) - Unique techs, one per game
 */
