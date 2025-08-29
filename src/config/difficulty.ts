import { type DifficultyId } from './types'
import { FRAMES, type FrameId } from './frames'
import { INITIAL_CAPACITY } from './defaults'

type DefeatPolicy = 'reset' | 'grace';

type DifficultySpec = {
  startingShips: number;
  defeatPolicy: DefeatPolicy;
  baseRerollCost: number;
  // Optional overrides for starting frame and dock capacity behavior
  startingFrame?: FrameId;
};

const DIFFICULTY_SPECS: Record<DifficultyId, DifficultySpec> = {
  easy:   { startingShips: 5, defeatPolicy: 'grace', baseRerollCost: 5 },
  medium: { startingShips: 3, defeatPolicy: 'grace', baseRerollCost: 8 },
  hard:   { startingShips: 3, defeatPolicy: 'reset', baseRerollCost: 12 },
};

export function getDifficultySpec(difficulty: DifficultyId): DifficultySpec {
  return DIFFICULTY_SPECS[difficulty];
}

export function getStartingShipCount(difficulty: DifficultyId): number {
  return DIFFICULTY_SPECS[difficulty].startingShips;
}

export function getDefeatPolicy(difficulty: DifficultyId): DefeatPolicy {
  return DIFFICULTY_SPECS[difficulty].defeatPolicy;
}

export function getBaseRerollCost(difficulty: DifficultyId): number {
  return DIFFICULTY_SPECS[difficulty].baseRerollCost;
}

// Compute starting dock capacity to comfortably fit the starting fleet for the difficulty
// If a faction chooses a different starting frame, pass its frame id to override.
export function getInitialCapacityForDifficulty(difficulty: DifficultyId, startingFrameId?: FrameId): number {
  const spec = DIFFICULTY_SPECS[difficulty];
  const frameId = (startingFrameId || spec.startingFrame || 'interceptor') as FrameId;
  const perShipTonnage = FRAMES[frameId].tonnage;
  const required = spec.startingShips * perShipTonnage;
  // Ensure at least base capacity and allow a small buffer of +1 so the first build is less constrained.
  return Math.max(INITIAL_CAPACITY.cap, required + 1);
}


