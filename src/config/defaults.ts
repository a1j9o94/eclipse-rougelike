import { type FrameId } from './frames'
import { type Part, PARTS } from './parts'

export type Research = { Military: number; Grid: number; Nano: number };
export type Resources = { credits: number; materials: number; science: number };

export const INITIAL_RESEARCH: Research = { Military: 1, Grid: 1, Nano: 1 };
export const INITIAL_RESOURCES: Resources = { credits: 20, materials: 5, science: 0 };

// Base dock capacity
export const INITIAL_CAPACITY = { cap: 3 } as const;

export const INITIAL_BLUEPRINTS: Record<FrameId, Part[]> = {
  interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.computers[0]],
  cruiser:     [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[0], PARTS.shields[0]],
  dread:       [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[0], PARTS.weapons[0], PARTS.shields[0]],
};


