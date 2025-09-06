import type { Part } from './parts';
import type { FrameId } from './factions';
import { INITIAL_RESEARCH, INITIAL_RESOURCES, INITIAL_BLUEPRINTS, INITIAL_CAPACITY } from './defaults';
import { ECONOMY } from './economy';

export type GameEconomy = {
  rerollBase?: number;
  creditMultiplier?: number;
  materialMultiplier?: number;
};

export type GameConfig = {
  research: { Military:number; Grid:number; Nano:number };
  resources: { credits:number; materials:number; science:number };
  blueprints: Record<FrameId, Part[]>;
  startingFrame: FrameId;
  capacity: number;
  shopSize: number;
  rareChance: number;
  economy: GameEconomy;
};

export const BASE_CONFIG: GameConfig = {
  research: { ...INITIAL_RESEARCH },
  resources: { ...INITIAL_RESOURCES },
  blueprints: {
    interceptor: [ ...INITIAL_BLUEPRINTS.interceptor ],
    cruiser: [ ...INITIAL_BLUEPRINTS.cruiser ],
    dread: [ ...INITIAL_BLUEPRINTS.dread ],
  },
  startingFrame: 'interceptor',
  capacity: INITIAL_CAPACITY.cap,
  shopSize: ECONOMY.shop.itemsBase,
  rareChance: 0.1,
  economy: {},
};

export type GameConfigOverrides = {
  research?: Partial<{ Military:number; Grid:number; Nano:number }>;
  resources?: Partial<{ credits:number; materials:number; science:number }>;
  blueprints?: Partial<Record<FrameId, Part[]>>;
  startingFrame?: FrameId;
  capacity?: number;
  shopSize?: number;
  rareChance?: number;
  economy?: GameEconomy;
};

export function buildFactionConfig(overrides: GameConfigOverrides): GameConfig {
  return {
    research: { ...BASE_CONFIG.research, ...(overrides.research || {}) },
    resources: { ...BASE_CONFIG.resources, ...(overrides.resources || {}) },
    blueprints: {
      interceptor: [ ...(overrides.blueprints?.interceptor || BASE_CONFIG.blueprints.interceptor) ],
      cruiser: [ ...(overrides.blueprints?.cruiser || BASE_CONFIG.blueprints.cruiser) ],
      dread: [ ...(overrides.blueprints?.dread || BASE_CONFIG.blueprints.dread) ],
    },
    startingFrame: overrides.startingFrame ?? BASE_CONFIG.startingFrame,
    capacity: overrides.capacity ?? BASE_CONFIG.capacity,
    shopSize: overrides.shopSize ?? BASE_CONFIG.shopSize,
    rareChance: overrides.rareChance ?? BASE_CONFIG.rareChance,
    economy: {
      rerollBase: overrides.economy?.rerollBase ?? BASE_CONFIG.economy.rerollBase,
      creditMultiplier: overrides.economy?.creditMultiplier ?? BASE_CONFIG.economy.creditMultiplier ?? 1,
      materialMultiplier: overrides.economy?.materialMultiplier ?? BASE_CONFIG.economy.materialMultiplier ?? 1,
    },
  };
}
