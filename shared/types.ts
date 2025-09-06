import type { Frame } from './frames';
import type { Part } from './parts';

export type Ship = {
  frame: Frame;
  parts: Part[];
  weapons: Part[];
  riftDice: number;
  stats: { init: number; hullCap: number; powerUse: number; powerProd: number; valid: boolean; aim: number; shieldTier: number; regen: number };
  hull: number;
  alive: boolean;
};

export type GhostDelta = {
  targetName: string;
  use: number;
  prod: number;
  valid: boolean;
  slotsUsed: number;
  slotCap: number;
  slotOk: boolean;
  initBefore: number;
  initAfter: number;
  initDelta: number;
  hullBefore: number;
  hullAfter: number;
  hullDelta: number;
};

export type Side = 'P' | 'E';

export type InitiativeEntry = { side: Side; idx: number; init: number; size: number };

export type SectorSpec = { sector: number; enemyTonnage: number; enemyScienceCap: number; boss: boolean };

export type BossVariant = {
  label: string;
  focus: 'aim' | 'shields' | 'burst';
};

export type ResourcesState = { credits:number; materials:number; science:number };
export type ResearchState = { Military:number; Grid:number; Nano:number };
export type CapacityState = { cap:number };
export type TonnageState = { used:number; cap:number };

export type DifficultyId = 'easy' | 'medium' | 'hard';

