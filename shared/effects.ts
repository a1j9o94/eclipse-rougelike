import type { Part } from './parts';

export type Hook =
  | 'onPreCombat'
  | 'onStartRound'
  | 'onBeforeAttack'
  | 'onHit'
  | 'onMiss'
  | 'onBlock'
  | 'onSelfHit'
  | 'onShipDeath'
  | 'onEnemyDeath'
  | 'onAllyDeath'
  | 'onEndRound'
  | 'onShopReroll'
  | 'onShopPurchase'
  | 'onResearch';

export type Effect =
  | { kind: 'lowerShieldThisRound'; amount: number }
  | { kind: 'reduceInit'; amount: number }
  | { kind: 'grantFleetShields'; tier: number; rounds: number }
  | { kind: 'gainHullOnAllyDeath'; amount: number; oncePerCombat?: boolean }
  | { kind: 'corrosionApply'; perStackDamage: number }
  | { kind: 'retaliateOnBlockDamage'; dieThreshold: number; dmg: number }
  | { kind: 'retaliateOnDeathDamage'; dieThreshold: number; dmg: number }
  | { kind: 'aimBuffNextRoundFleet'; amount: number }
  | { kind: 'designateBonusDamage'; amount: number; rounds: number }
  | { kind: 'rerollOnMiss'; chancePct: number }
  | { kind: 'chainOnHit'; decay: number; minDmg: number }
  | { kind: 'gainDicePerShip'; amount: number }
  | { kind: 'gainDicePerUniqueWeapon'; amount: number }
  | { kind: 'gainDicePerReroll'; amount: number }
  | { kind: 'magnetize' }
  | { kind: 'scrapForNextFightDamage'; dmg: number }
  | { kind: 'econDiscount'; percent: number }
  | { kind: 'destroyOnShopReroll'; chancePct: number }
  | { kind: 'destroyOnPurchase'; chancePct: number }
  | { kind: 'downgradeOnReroll'; chancePct: number; stat: 'init'|'shieldTier'|'aim'|'powerProd'|'dice'|'dmgPerHit'; min: number };

export type EffectfulPart = Part & { effects?: { hook: Hook; effect: Effect }[] };

export type BattleCtx = {
  rng: () => number;
  rerollsThisRun: number;
  status: {
    corrosion: WeakMap<import('./types').Ship, number>;
    painter: { target: import('./types').Ship | null; rounds: number; bonus: number } | null;
    fleetTempShield: { P: { tier: number; rounds: number } | null; E: { tier: number; rounds: number } | null };
    tempShield: WeakMap<import('./types').Ship, number>; // additive shield delta per ship
    oncePerCombat: WeakMap<import('./types').Ship, Set<string>>;
  };
};

export type EconomyCtx = {
  rng: () => number;
  setDestroyed: (partId: string) => void;
  downgrade: (partId: string, stat: string) => void;
  applyDiscount: (percent: number) => void;
};

