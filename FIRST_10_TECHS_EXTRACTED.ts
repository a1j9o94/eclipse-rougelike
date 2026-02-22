/**
 * First 10 Eclipse Second Dawn Technologies
 * Extracted from official Eclipse sources
 *
 * Data verified against:
 * - Eclipse Second Dawn official wiki
 * - Dized official rules platform
 * - BoardGameGeek official files
 */

export type EclipseTechnology = {
  name: string;
  track: 'Nano' | 'Grid' | 'Military' | 'Rare';
  tier: 1 | 2 | 3;
  scienceCost: number[]; // [base, 1 discount, 2 discounts, 3+ discounts]
  partsProvided?: string[];
  specialAbilities?: string;
  victoryPoints?: number;
};

export const FIRST_10_TECHNOLOGIES: EclipseTechnology[] = [
  // Tier 1 - Cost 2 (cheapest)
  {
    name: 'Gauss Shield',
    track: 'Grid',
    tier: 1,
    scienceCost: [2, 2, 2, 2],
    partsProvided: ['Gauss Shield'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Gauss Shield Ship Parts.',
  },

  {
    name: 'Neutron Bombs',
    track: 'Military',
    tier: 1,
    scienceCost: [2, 2, 2, 2],
    specialAbilities: 'When Attacking Population, all Population Cubes in a Sector are destroyed automatically.',
  },

  // Tier 1 - Cost 4→3
  {
    name: 'Fusion Source',
    track: 'Grid',
    tier: 1,
    scienceCost: [4, 3, 3, 3],
    partsProvided: ['Fusion Source'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Fusion Source Ship Parts.',
  },

  {
    name: 'Fusion Drive',
    track: 'Nano',
    tier: 1,
    scienceCost: [4, 3, 3, 3],
    partsProvided: ['Fusion Drive'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Fusion Drive Ship Parts.',
  },

  {
    name: 'Starbase',
    track: 'Military',
    tier: 1,
    scienceCost: [4, 3, 3, 3],
    specialAbilities: 'You may Build Starbases.',
  },

  // Tier 1 - Cost 6→4
  {
    name: 'Improved Hull',
    track: 'Grid',
    tier: 1,
    scienceCost: [6, 5, 4, 4],
    partsProvided: ['Improved Hull'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Improved Hull Ship Parts.',
  },

  {
    name: 'Plasma Cannon',
    track: 'Military',
    tier: 1,
    scienceCost: [6, 5, 4, 4],
    partsProvided: ['Plasma Cannon'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Plasma Cannon Ship Parts.',
  },

  {
    name: 'Orbital',
    track: 'Nano',
    tier: 1,
    scienceCost: [6, 5, 4, 4],
    specialAbilities: 'You may Build Orbitals.',
  },

  // Tier 2 - Cost 8→5
  {
    name: 'Positron Computer',
    track: 'Grid',
    tier: 2,
    scienceCost: [8, 6, 5, 5],
    partsProvided: ['Positron Computer'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Positron Computer Ship Parts.',
  },

  {
    name: 'Phase Shield',
    track: 'Military',
    tier: 2,
    scienceCost: [8, 6, 5, 5],
    partsProvided: ['Phase Shield'],
    specialAbilities: 'You may Upgrade your Ship Blueprints with Phase Shield Ship Parts.',
  },
];

/**
 * Key observations from Eclipse Second Dawn technology system:
 *
 * 1. COST STRUCTURE:
 *    - Technologies cost SCIENCE (not money)
 *    - Discount system: [base, 1 tech in track, 2 techs, 3+ techs]
 *    - Example: Fusion Source costs 4 science initially, but only 3 if you've researched another Grid tech
 *
 * 2. TIERS (implicit from cost):
 *    - Tier 1: Science cost 2-6 (basic technologies)
 *    - Tier 2: Science cost 8-12 (advanced technologies)
 *    - Tier 3: Science cost 14-18 (ultimate technologies)
 *
 * 3. TRACKS:
 *    - Grid (yellow): Ship parts for defense and infrastructure
 *    - Nano (blue): Construction, mobility, economy
 *    - Military (red): Weapons, population, combat abilities
 *    - Rare (orange): Unique techs, only one of each exists per game
 *
 * 4. EFFECTS:
 *    - Most techs either unlock ship parts OR provide special abilities
 *    - Ship parts must be added to blueprints (they're not automatic)
 *    - Special abilities are immediate and permanent
 *
 * 5. VICTORY POINTS:
 *    - Most basic techs: 0 VP
 *    - Some rare techs grant VP (e.g., Warp Portal: +1 VP)
 */
