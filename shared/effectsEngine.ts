import type { EffectfulPart, Hook, Effect, BattleCtx } from './effects';
import type { Ship } from './types';

export function triggerHook(
  parts: EffectfulPart[],
  hook: Hook,
  host: Ship | null,
  target: Ship | null,
  _fleets: { allies: Ship[]; enemies: Ship[] },
  ctx: BattleCtx
) {
  for (const p of parts) {
    const hooks = p.effects?.filter(e => e.hook === hook) ?? [];
    for (const h of hooks) {
      applyEffect(h.effect, p, host, target, ctx);
    }
  }
}

function applyEffect(
  eff: Effect,
  _part: EffectfulPart,
  host: Ship | null,
  target: Ship | null,
  ctx: BattleCtx
) {
  switch (eff.kind) {
    case 'lowerShieldThisRound':
      if (target) target.stats.shieldTier = Math.max(0, (target.stats.shieldTier || 0) - eff.amount);
      break;
    case 'reduceInit':
      if (target) target.stats.init = Math.max(0, (target.stats.init || 0) - eff.amount);
      break;
    case 'grantFleetShields':
      ctx.status.fleetTempShield = { tier: eff.tier, rounds: eff.rounds };
      break;
    case 'corrosionApply':
      if (target?.alive) {
        const idx = (target as { _idx?: number })._idx ?? -1;
        const curr = ctx.status.corrosion.get(idx) || 0;
        ctx.status.corrosion.set(idx, curr + 1);
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
      ctx.status.painter = { targetIdx: (target as { _idx?: number })?._idx ?? -1, rounds: eff.rounds, bonus: eff.amount };
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
  if (ctx.status.painter && ctx.status.painter.rounds > 0) {
    ctx.status.painter.rounds--;
    if (ctx.status.painter.rounds <= 0) ctx.status.painter = null;
  }
  const tick = (fleet: Ship[]) => {
    for (const s of fleet) {
      if (!s.alive) continue;
        const idx = (s as { _idx?: number })._idx ?? -1;
      const stacks = ctx.status.corrosion.get(idx) || 0;
      if (stacks > 0) {
        s.hull -= stacks;
        if (s.hull <= 0) { s.hull = 0; s.alive = false; }
      }
    }
  };
  tick(allies); tick(enemies);
}

