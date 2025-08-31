import { type Frame } from './frames'
import { type Part } from './parts'

export type Ship = {
  frame: Frame;
  parts: Part[];
  weapons: Part[];
  riftDice: number;
  stats: { init: number; hullCap: number; powerUse: number; powerProd: number; valid: boolean; aim: number; shieldTier: number };
  hull: number;
  alive: boolean;
}

export type GhostDelta = {
  targetName: string;
  use: number;
  prod: number;
  valid: boolean;
  initBefore: number;
  initAfter: number;
  initDelta: number;
  hullBefore: number;
  hullAfter: number;
  hullDelta: number;
}

export type Side = 'P' | 'E';

export type InitiativeEntry = {
  side: Side;
  idx: number;
  init: number;
  size: number;
}

export type SectorSpec = {
  sector: number;
  enemyTonnage: number;
  enemyScienceCap: number;
  boss: boolean;
}

export type BossVariant = {
  // Short descriptive label to inform player planning in UI
  label: string;
  // Focus tag used by enemy generator to bias builds
  focus: 'aim' | 'shields' | 'burst';
}

// State slice aliases: small, focused state shapes shared across modules
export type ResourcesState = { credits:number; materials:number; science:number };
export type ResearchState = { Military:number; Grid:number; Nano:number };
export type CapacityState = { cap:number };
export type TonnageState = { used:number; cap:number };

// Difficulty identifiers used across the app
export type DifficultyId = 'easy' | 'medium' | 'hard';


