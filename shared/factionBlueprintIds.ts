export type FrameId = 'interceptor' | 'cruiser' | 'dread';
export type FactionId = 'scientists' | 'warmongers' | 'industrialists' | 'raiders' | 'timekeepers' | 'collective';

// Single source of truth for faction blueprint IDs used across client and server.
export const FACTION_BLUEPRINT_IDS: Record<FactionId, Partial<Record<FrameId, string[]>>> = {
  scientists: {},
  industrialists: {},
  warmongers: {
    cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'],
  },
  raiders: {
    interceptor: ['tachyon_source','tachyon_drive','antimatter','positron'],
  },
  timekeepers: {
    interceptor: ['tachyon_source','tachyon_drive','disruptor','positron'],
  },
  collective: {
    interceptor: ['fusion_source','fusion_drive','plasma','auto_repair'],
  },
};

