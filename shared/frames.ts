export type Frame = {
  id: string;
  name: string;
  tiles: number;
  baseHull: number;
  rank: number;
  tonnage: number;
};

export type FrameId = 'interceptor' | 'cruiser' | 'dread';

export const FRAMES: Record<FrameId, Frame> = {
  interceptor: { id: 'interceptor', name: 'Interceptor', tiles: 6, baseHull: 1, rank: 1, tonnage: 1 },
  cruiser:     { id: 'cruiser', name: 'Cruiser',       tiles: 8, baseHull: 1, rank: 2, tonnage: 2 },
  dread:       { id: 'dread', name: 'Dreadnought',     tiles: 10, baseHull: 1, rank: 3, tonnage: 3 },
} as const;

