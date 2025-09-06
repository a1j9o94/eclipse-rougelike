import type { DifficultyId } from './types';
import { FRAMES, type FrameId } from './frames';
import { INITIAL_CAPACITY } from './defaults';

export type DefeatPolicy = 'reset' | 'grace';

export type DifficultySpec = {
  startingShips: number;
  defeatPolicy: DefeatPolicy;
  baseRerollCost: number;
  startingFrame?: FrameId;
};

const DIFFICULTY_SPECS: Record<DifficultyId, DifficultySpec> = {
  easy: { startingShips: 5, defeatPolicy: 'grace', baseRerollCost: 5 },
  medium: { startingShips: 3, defeatPolicy: 'grace', baseRerollCost: 8 },
  hard: { startingShips: 3, defeatPolicy: 'reset', baseRerollCost: 12 },
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

export function getInitialCapacityForDifficulty(difficulty: DifficultyId, startingFrameId?: FrameId): number {
  const spec = DIFFICULTY_SPECS[difficulty];
  const frameId = (startingFrameId || spec.startingFrame || 'interceptor') as FrameId;
  const perShipTonnage = FRAMES[frameId].tonnage;
  const required = spec.startingShips * perShipTonnage;
  return Math.max(INITIAL_CAPACITY.cap, required + 1);
}

