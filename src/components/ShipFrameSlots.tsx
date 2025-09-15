// React import not required with modern JSX transform
import { type Part, PART_EFFECT_SYMBOLS, type PartEffectField } from "../../shared/parts";
import type { EffectfulPart } from "../../shared/effects";
import type { Ship } from "../../shared/types";
import type { FrameId } from "../../shared/frames";

// Layout of frame slots for a simple visual representation.
// Rows are centered to roughly match Eclipse ship diagrams.
const FRAME_LAYOUTS: Record<FrameId, number[]> = {
  interceptor: [3, 2, 1],
  cruiser: [3, 3, 2],
  dread: [4, 3, 3],
};

const CATEGORY_EFFECTS: Record<Part['cat'], PartEffectField[]> = {
  Source: ['powerProd'],
  Drive: ['init'],
  Weapon: ['dice', 'riftDice', 'dmgPerHit'],
  Computer: ['aim'],
  Shield: ['shieldTier', 'powerProd', 'dice', 'riftDice', 'dmgPerHit'],
  Hull: ['extraHull', 'powerProd', 'init', 'aim', 'dice', 'riftDice', 'dmgPerHit', 'shieldTier', 'regen'],
};

function effectLabels(p: Part, fields: PartEffectField[]) {
  const labels: string[] = [];
  const isBeam = p.name.toLowerCase().includes('beam');
  fields.forEach(f => {
    if (f === 'extraHull') return;
    if (isBeam && f === 'dice') return;
    const val = (p as Record<PartEffectField, number | undefined>)[f];
    if (typeof val === 'number' && val !== 0) {
      const sym = PART_EFFECT_SYMBOLS[f].replace(/[+-]$/, '');
      labels.push(val > 1 ? `${val}${sym}` : sym);
    }
  });
  const ePart = p as EffectfulPart;
  if (ePart.effects) {
    for (const { effect } of ePart.effects) {
      switch (effect.kind) {
        case 'magnetize':
          labels.push('🧲');
          break;
        case 'retaliateOnDeathDamage':
        case 'retaliateOnBlockDamage':
          labels.push('💥');
          break;
        case 'lowerShieldThisRound':
          labels.push(`🔆${PART_EFFECT_SYMBOLS.shieldTier}-${effect.amount}`);
          break;
        case 'reduceInit':
          labels.push(`🔆${PART_EFFECT_SYMBOLS.initLoss}${effect.amount}`);
          break;
      }
    }
  }
  if (p.initLoss) {
    labels.push(`${isBeam ? '🔆' : ''}${PART_EFFECT_SYMBOLS.initLoss}${p.initLoss}`);
  }
  if (isBeam && !labels.some(l => l.includes('🔆'))) labels.push('🔆');
  return labels.join('');
}

export function ShipFrameSlots({ ship, side, active: _active }: { ship: Ship, side: 'P' | 'E', active?: boolean }) {
  const layout = FRAME_LAYOUTS[ship.frame.id as FrameId] || [ship.frame.tiles];
  const cells: { slots: number, label: string }[] = [];
  // Hull upgrades show hearts for remaining hull beyond the frame's base value,
  // but the intrinsic hull does not occupy a slot or render a cell.
  let remainingHull = Math.max(0, ship.hull - ship.frame.baseHull);
  if (ship.parts && ship.parts.length > 0) {
    ship.parts.forEach(p => {
      const slots = p.slots || 1;
      if (p.cat === 'Hull') {
        const max = p.extraHull || 0;
        let label = '';
        if (max > 0) {
          const rem = Math.min(remainingHull, max);
          remainingHull -= rem;
          if (max === 1) {
            label = rem === 1 ? '❤️' : '🖤';
          } else {
            label = rem === 0 ? '🖤' : `${rem}❤️`;
          }
        }
        const extra = effectLabels(p, CATEGORY_EFFECTS.Hull);
        cells.push({ slots, label: label + extra });
      } else {
        const label = effectLabels(p, CATEGORY_EFFECTS[p.cat]);
        cells.push({ slots, label });
      }
    });
  } else {
    // Fallback for snapshot-only ships (no parts): render simplified tokens
    const tokens: string[] = [];
    const aim = Math.max(0, ship.stats?.aim || 0);
    const shields = Math.max(0, ship.stats?.shieldTier || 0);
    const init = Math.max(0, ship.stats?.init || 0);
    const rift = Math.max(0, ship.riftDice || 0);
    for (let i = 0; i < Math.min(aim, 3); i++) tokens.push('🎯');
    for (let i = 0; i < Math.min(shields, 3); i++) tokens.push('🛡️');
    for (let i = 0; i < Math.min(Math.ceil(init/2), 3); i++) tokens.push('🚀');
    for (let i = 0; i < Math.min(rift, 2); i++) tokens.push('🕳️');
    while (tokens.length < (ship.frame.tiles || 3)) tokens.push('');
    tokens.slice(0, ship.frame.tiles).forEach(lbl => cells.push({ slots: 1, label: lbl }));
  }
  const used = cells.reduce((a, p) => a + p.slots, 0);
  const empties = Math.max(0, ship.frame.tiles - used);
  const labels = cells.map(p => p.label).concat(Array(empties).fill(''));
  let idx = 0;
  const glow = side === 'P'
    ? 'ring-sky-400 shadow-[0_0_4px_#38bdf8]'
    : 'ring-pink-500 shadow-[0_0_4px_#ec4899]';
  // Replace pulsing outline with motion cue (handled in CompactShip)
  // Keep a very subtle outline when active to aid focus in low-motion contexts
  const activeGlow = _active ? 'outline outline-1 outline-white/10' : '';
  return (
    <div className="inline-block">
      {layout.map((count, r) => {
        const row: string[] = [];
        let added = 0;
        while (idx < labels.length && added < count) {
          row.push(labels[idx++]);
          added++;
        }
        if (row.length === 0) return null;
        return (
          <div key={r} data-testid="frame-slot-row" className="flex justify-center gap-1">
            {row.map((label, i) => (
              <div
                key={i}
                data-testid={label ? 'frame-slot-filled' : 'frame-slot-empty'}
                className={`w-7 h-7 sm:w-8 sm:h-8 text-[10px] sm:text-[11px] md:text-xs leading-none grid place-items-center rounded ${glow} ${activeGlow}`}
              >
                <span className={`${label.length > 3 ? 'scale-[.90] sm:scale-[.95]' : ''} inline-block`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
