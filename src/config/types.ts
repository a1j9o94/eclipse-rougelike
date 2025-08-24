import { type Frame } from './frames'
import { type Part } from './parts'

export type Ship = {
  frame: Frame;
  parts: Part[];
  weapons: Part[];
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
  enemyTierCap: 1|2|3;
  boss: boolean;
}


