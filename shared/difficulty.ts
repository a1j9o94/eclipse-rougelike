import type { DifficultyId } from './types';
import { FRAMES, type FrameId } from './frames';
import { INITIAL_CAPACITY } from './defaults';

export type DefeatPolicy = 'reset' | 'grace';

export type DifficultySpec = {
  startingShips: number;
  // Explicit lives configuration; when 0 there is no respawn (hard mode)
  lives: number;
  baseRerollCost: number;
  startingFrame?: FrameId;
};

const DIFFICULTY_SPECS: Record<DifficultyId, DifficultySpec> = {
  easy: { startingShips: 5, lives: 1, baseRerollCost: 5 },
  medium: { startingShips: 3, lives: 1, baseRerollCost: 8 },
  hard: { startingShips: 3, lives: 0, baseRerollCost: 12 },
};

export function getDifficultySpec(difficulty: DifficultyId): DifficultySpec {
  return DIFFICULTY_SPECS[difficulty];
}

export function getStartingShipCount(difficulty: DifficultyId): number {
  return DIFFICULTY_SPECS[difficulty].startingShips;
}

// Backward-compat shim: derive defeat policy from lives
export function getDefeatPolicy(difficulty: DifficultyId): DefeatPolicy {
  return DIFFICULTY_SPECS[difficulty].lives > 0 ? 'grace' : 'reset';
}

export function getBaseRerollCost(difficulty: DifficultyId): number {
  return DIFFICULTY_SPECS[difficulty].baseRerollCost;
}

export function getStartingLives(difficulty: DifficultyId): number {
  return DIFFICULTY_SPECS[difficulty].lives;
}

export function getInitialCapacityForDifficulty(difficulty: DifficultyId, startingFrameId?: FrameId): number {
  const spec = DIFFICULTY_SPECS[difficulty];
  const frameId = (startingFrameId || spec.startingFrame || 'interceptor') as FrameId;
  const perShipTonnage = FRAMES[frameId].tonnage;
  const required = spec.startingShips * perShipTonnage;
  return Math.max(INITIAL_CAPACITY.cap, required + 1);
}
