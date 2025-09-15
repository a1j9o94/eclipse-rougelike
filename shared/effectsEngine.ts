import type { EffectfulPart, Hook, Effect, BattleCtx } from './effects';
import type { Ship } from './types';

export function triggerHook(
  parts: EffectfulPart[],
  hook: Hook,
  host: Ship | null,
  target: Ship | null,
  fleets: { allies: Ship[]; enemies: Ship[] },
  ctx: BattleCtx,
  hostSide: 'P' | 'E' | null = null
) {
  for (const p of parts) {
    const hooks = p.effects?.filter(e => e.hook === hook) ?? [];
    for (const h of hooks) {
      applyEffect(h.effect, p, host, target, fleets, ctx, hostSide);
    }
  }
}

function applyEffect(
  eff: Effect,
  _part: EffectfulPart,
  host: Ship | null,
  target: Ship | null,
  fleets: { allies: Ship[]; enemies: Ship[] },
  ctx: BattleCtx,
  hostSide: 'P' | 'E' | null
) {
  void fleets; // placeholder until fleet-targeting effects implemented
  switch (eff.kind) {
    case 'lowerShieldThisRound':
      if (target) {
        const curr = ctx.status.tempShield.get(target) ?? 0;
        ctx.status.tempShield.set(target, curr - eff.amount);
      }
      break;
    case 'reduceInit':
      if (target) target.stats.init = Math.max(0, (target.stats.init || 0) - eff.amount);
      break;
    case 'grantFleetShields':
      if (hostSide) ctx.status.fleetTempShield[hostSide] = { tier: eff.tier, rounds: eff.rounds };
      break;
    case 'corrosionApply':
      if (target?.alive) {
        const curr = ctx.status.corrosion.get(target) || 0;
        ctx.status.corrosion.set(target, curr + 1);
      }
      break;
    case 'retaliateOnBlockDamage': {
      if (!host || !target) return;
      const roll = Math.floor(ctx.rng() * 6) + 1;
      if (roll >= eff.dieThreshold) {
        target.hull -= eff.dmg;
        if (target.hull <= 0) { target.hull = 0; target.alive = false; }
      }
      break;
    }
    case 'retaliateOnDeathDamage': {
      if (!host || !target) return;
      const roll = Math.floor(ctx.rng() * 6) + 1;
      if (roll >= eff.dieThreshold) {
        target.hull -= eff.dmg;
        if (target.hull <= 0) { target.hull = 0; target.alive = false; }
      }
      break;
    }
    case 'designateBonusDamage':
      ctx.status.painter = { target: target ?? null, rounds: eff.rounds, bonus: eff.amount };
      break;
    case 'magnetize':
      if (host) (host.stats as { magnet?: boolean }).magnet = true;
      break;
    case 'rerollOnMiss':
    case 'chainOnHit':
    case 'gainDicePerShip':
    case 'gainDicePerUniqueWeapon':
    case 'gainDicePerReroll':
    case 'aimBuffNextRoundFleet':
    case 'scrapForNextFightDamage':
    case 'econDiscount':
    case 'destroyOnShopReroll':
    case 'destroyOnPurchase':
    case 'downgradeOnReroll':
      // handled elsewhere
      break;
    default:
      // no-op for unimplemented effects
      break;
  }
}

export function precomputeDynamicStats(fleet: Ship[], _enemyFleet: Ship[], ctx: BattleCtx) {
  const otherShips = (s: Ship) => fleet.filter(x => x.alive && x !== s);
  for (const s of fleet) {
    for (const w of s.weapons) {
      const ep = w as EffectfulPart;
      const hooks = ep.effects ?? [];
      const perShip = hooks.find(
        (h): h is { hook: Hook; effect: { kind: 'gainDicePerShip'; amount: number } } =>
          h.effect.kind === 'gainDicePerShip'
      );
      const perType = hooks.find(
        (h): h is { hook: Hook; effect: { kind: 'gainDicePerUniqueWeapon'; amount: number } } =>
          h.effect.kind === 'gainDicePerUniqueWeapon'
      );
      const perReroll = hooks.find(
        (h): h is { hook: Hook; effect: { kind: 'gainDicePerReroll'; amount: number } } =>
          h.effect.kind === 'gainDicePerReroll'
      );
      let bonus = 0;
      if (perShip) {
        const n = otherShips(s).length;
        bonus += perShip.effect.amount * n;
      }
      if (perType) {
        const unique = new Set(s.weapons.map(p => p.id.split('_')[0] || p.name)).size;
        bonus += perType.effect.amount * Math.max(0, unique - 1);
      }
      if (perReroll) {
        bonus += perReroll.effect.amount * ctx.rerollsThisRun;
      }
      (w as EffectfulPart & { _dynDice?: number })._dynDice = Math.max(0, (w.dice || 0) + bonus);
    }
  }
}

export function startRoundTick(allies: Ship[], enemies: Ship[], ctx: BattleCtx) {
  // reset per-round shield deltas
  ctx.status.tempShield = new WeakMap();
  // painter decay
  if (ctx.status.painter && ctx.status.painter.rounds > 0) {
    ctx.status.painter.rounds--;
    if (ctx.status.painter.rounds <= 0) ctx.status.painter = null;
  }
  // fleet temp shield decay
  (['P','E'] as const).forEach(side => {
    const buff = ctx.status.fleetTempShield[side];
    if (buff) {
      buff.rounds--;
      if (buff.rounds <= 0) ctx.status.fleetTempShield[side] = null;
    }
  });
  const tick = (fleet: Ship[]) => {
    for (const s of fleet) {
      if (!s.alive) continue;
      const stacks = ctx.status.corrosion.get(s) || 0;
      if (stacks > 0) {
        s.hull -= stacks;
        if (s.hull <= 0) { s.hull = 0; s.alive = false; }
      }
    }
  };
  tick(allies); tick(enemies);
}

export function effectiveShieldTier(ship: Ship, side: 'P' | 'E', ctx: BattleCtx) {
  const base = ship.stats.shieldTier || 0;
  const delta = ctx.status.tempShield.get(ship) || 0;
  const fleet = ctx.status.fleetTempShield[side];
  return Math.max(0, base + delta + (fleet ? fleet.tier : 0));
}

