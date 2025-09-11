// Shared multiplayer types for unified server-client data contracts
// Keep this file independent from Convex imports to avoid coupling layers

// Import types from shared modules
import type { FrameId } from './frames';
import type { Resources, Research } from './defaults';

// Re-export for external consumption
export type { FrameId, Resources, Research };

// Multiplayer-specific types
export type PlayerModifiers = {
  rareChance?: number;
  capacityCap?: number;
  startingFrame?: FrameId;
  blueprintHints?: Record<string, string[]>;
};

export type PlayerState = {
  resources?: Resources;
  research?: Research;
  // Current reroll cost for this player in setup phase (persists across snapshots)
  rerollCost?: number;
  economy?: {
    rerollBase?: number;
    creditMultiplier?: number;
    materialMultiplier?: number;
  };
  modifiers?: PlayerModifiers;
  blueprintIds?: Record<FrameId, string[]>;
  fleet?: ShipSnapshot[];
  fleetValid?: boolean;
  sector?: number;
  lives?: number;
  faction?: string;
  blueprints?: Record<FrameId, unknown[]>;
  isAlive?: boolean;
  graceUsed?: boolean;
};

export type GamePhase = 'setup' | 'combat' | 'finished';

export type GameState = {
  currentTurn: string;
  gamePhase: GamePhase;
  playerStates: Record<string, PlayerState>;
  combatQueue?: unknown;
  roundNum: number;
  roundLog?: string[];
  acks?: Record<string, boolean>;
  pendingFinish?: boolean;
  matchResult?: { winnerPlayerId: string };
  roundSeed?: string;
  lastUpdate?: number;
};

export type RoomGameConfig = {
  startingShips: number;
  livesPerPlayer: number;
  multiplayerLossPct?: number;
};

// Ship snapshot wire format (client/server communication)
// Keep lightweight and independent from full Ship/Part types
export type DieFace = {
  roll?: number;
  dmg?: number;
  self?: number;
};

export type WeaponSnapshot = {
  name?: string;
  dice?: number;
  dmgPerHit?: number;
  faces?: DieFace[];
  initLoss?: number;
};

export type FrameSnapshot = {
  id: string;
  name?: string;
};

export type ShipSnapshot = {
  frame: FrameSnapshot;
  weapons: WeaponSnapshot[];
  riftDice?: number;
  stats: {
    init: number;
    hullCap: number;
    valid: boolean;
    aim: number;
    shieldTier: number;
    regen: number;
  };
  hull: number;
  alive: boolean;
  // Optional: part IDs for exact reconstruction on client side
  partIds?: string[];
  // Optional: full part objects for reconstruction (preferred if present)
  parts?: { id: string; [k: string]: unknown }[];
};
