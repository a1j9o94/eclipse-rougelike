// React import not required with modern JSX transform

import { type Part, partEffects, partDescription, PART_EFFECT_SYMBOLS, type PartEffectField } from "../../shared/parts";
import type { GhostDelta, Ship } from "../../shared/types";
import type { FrameId } from "../../shared/frames";

export function PowerBadge({use, prod}:{use:number, prod:number}){
  const ok = use<=prod;
  return (
    <span className={`inline-flex items-center gap-1 font-medium font-mono px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs ${ok? 'bg-emerald-600/20 text-emerald-200 ring-1 ring-emerald-600/30' : 'bg-rose-600/20 text-rose-100 ring-1 ring-rose-600/30'}`}>
      ⚡ <span>{use}</span>/<span>{prod}</span>
    </span>
  );
}
export function HullPips({ current, max }:{current:number, max:number}){
  if (max > 20) {
    return (
      <div className="flex gap-1 mt-1 text-[10px] sm:text-xs leading-none">
        {current}/{max} 🤎
      </div>
    );
  }
  const arr = Array.from({ length: max });
  return (
    <div className="flex flex-wrap gap-0.5 mt-1 text-[10px] sm:text-xs leading-none">
      {arr.map((_, i) => (
        <span key={i}>{i < current ? '❤️' : '🖤'}</span>
      ))}
    </div>
  );
}
export function DockSlots({ used, cap, preview }:{used:number, cap:number, preview?:number}){
  const len = preview!==undefined ? Math.max(cap, preview) : cap;
  const arr = Array.from({length: len});
  return (
    <div className="flex gap-0.5 mt-1">
      {arr.map((_,i)=>{
        const filled = i < used;
        const willFill = preview!==undefined && i < preview;
        const over = i >= cap;
        const base = 'w-2 h-2 rounded-full';
        if(over && willFill){
          return <span key={i} data-testid="dock-slot-over" className={`${base} bg-rose-500 text-[8px] grid place-items-center`}>✖</span>;
        }
        if(filled){
          return <span key={i} data-testid="dock-slot-filled" className={`${base} bg-emerald-400`} />;
        }
        if(willFill){
          return <span key={i} data-testid="dock-slot-preview" className={`${base} bg-emerald-700`} />;
        }
        return <span key={i} data-testid="dock-slot-empty" className={`${base} bg-zinc-700`} />;
      })}
    </div>
  );
}

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
  Hull: ['extraHull', 'powerProd', 'init', 'aim', 'dice', 'riftDice', 'dmgPerHit', 'shieldTier', 'regen', 'initLoss'],
};

function effectLabels(p: Part, fields: PartEffectField[]) {
  const labels: string[] = [];
  fields.forEach(f => {
    if (f === 'extraHull') return;
    const val = (p as Record<PartEffectField, number | undefined>)[f];
    if (typeof val === 'number' && val !== 0) {
      const sym = PART_EFFECT_SYMBOLS[f].replace(/[+-]$/, '');
      labels.push(val > 1 ? `${val}${sym}` : sym);
    }
  });
  return labels.join('');
}

export function ShipFrameSlots({ ship, side, active }: { ship: Ship, side: 'P' | 'E', active?: boolean }) {
  const layout = FRAME_LAYOUTS[ship.frame.id as FrameId] || [ship.frame.tiles];
  const cells: { slots: number, label: string }[] = [];
  // Hull upgrades show hearts for remaining hull beyond the frame's base value,
  // but the intrinsic hull does not occupy a slot or render a cell.
  let remainingHull = Math.max(0, ship.hull - ship.frame.baseHull);
  if (ship.parts && ship.parts.length > 0) {
    ship.parts.forEach(p => {
      const slots = p.slots || 1;
      if (p.cat === 'Hull') {
        const max = p.extraHull || 1;
        const rem = Math.min(remainingHull, max);
        remainingHull -= rem;
        let label = '';
        if (max === 1) {
          label = rem === 1 ? '❤️' : '🖤';
        } else {
          label = rem === 0 ? '🖤' : `${rem}❤️`;
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
  const activeGlow = active ? 'animate-pulse' : '';
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
                className={`w-6 h-6 sm:w-7 sm:h-7 text-[11px] sm:text-xs grid place-items-center rounded ${glow} ${activeGlow}`}
              >
                {label}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
export function CompactShip({ ship, side, active }:{ship:Ship, side:'P'|'E', active:boolean}){
  const dead = !ship.alive || ship.hull<=0;
  return (
    <div data-ship className="relative inline-block" title={ship.frame.name}>
      <ShipFrameSlots ship={ship} side={side} active={active} />
      {dead && <div className="absolute inset-0 grid place-items-center text-2xl text-zinc-300">✖</div>}
    </div>
  );
}
export function ItemCard({ item, price, canAfford, onBuy, ghostDelta }:{item:Part, price?:number, canAfford:boolean, onBuy:()=>void, ghostDelta:GhostDelta|null}){
  return (
    <div className={`p-3 rounded-xl border bg-zinc-900 transition ${canAfford? 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/70' : 'border-zinc-800 opacity-90'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
            <div className="font-semibold text-sm sm:text-base leading-tight">{item.name}</div>
            <div className="text-[11px] sm:text-xs opacity-70 mt-0.5">{(() => {
              const eff = partEffects(item).join(' • ');
              const slots = item.slots || 1;
              const slotLabel = `⬛ ${slots} slot${slots>1?'s':''}`;
              return `${item.cat} • Tier ${item.tier} • ${slotLabel}${eff ? ' • ' + eff : ''}`;
            })()}</div>
            <div className="text-[11px] sm:text-xs mt-1">{partDescription(item)}</div>
        </div>
        <div className="text-sm sm:text-base font-semibold whitespace-nowrap">{typeof price==='number' ? price : (item.cost||0)}¢</div>
      </div>
      {ghostDelta && (
        <div className="mt-2 text-[11px] sm:text-xs grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="col-span-2 opacity-70">After install on {ghostDelta.targetName}:</div>
          <div className={`${ghostDelta.valid? 'text-emerald-300':'text-rose-300'}`}>⚡ {ghostDelta.use}/{ghostDelta.prod} {ghostDelta.valid? '✔️' : '❌'}</div>
          <div className={`${ghostDelta.slotOk? 'text-emerald-300':'text-rose-300'}`}>⬛ {ghostDelta.slotsUsed}/{ghostDelta.slotCap} {ghostDelta.slotOk? '✔️' : '❌'}</div>
          {ghostDelta.initDelta!==0 && <div>🚀 {ghostDelta.initBefore} → <b>{ghostDelta.initAfter}</b></div>}
          {ghostDelta.hullDelta!==0 && <div>Hull {ghostDelta.hullBefore} → <b>{ghostDelta.hullAfter}</b></div>}
        </div>
      )}
      <button disabled={!canAfford} onClick={onBuy} className={`mt-2 w-full px-3 py-2 rounded-lg text-sm sm:text-base ${canAfford? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[.99]':'bg-zinc-700 opacity-60'}`}>Buy & Install</button>
    </div>
  );
}
export function ResourceBar({ credits, materials, science, tonnage, sector, onReset, lives, meName, meFaction, opponent, opponentFaction, phase }:{credits:number, materials:number, science:number, tonnage:{used:number,cap:number}, sector:number, onReset:()=>void, lives?:number, meName?:string, meFaction?:string, opponent?:{ name:string; lives:number }|null, opponentFaction?:string|null, phase?: 'setup'|'combat'|'finished'}){
  const used = tonnage.used, cap = tonnage.cap;
  const over = used>cap;
  const capIcon = over ? '🔴' : '🟢';
  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="mx-auto max-w-5xl p-2 flex items-center gap-2 flex-wrap text-sm sm:text-base">
        <div className="px-2 py-1 rounded-lg bg-zinc-900 flex-1 whitespace-nowrap">💰 <b>{credits}</b> • 🧱 <b>{materials}</b> • 🔬 <b>{science}</b></div>
        <div className={`px-2 py-1 rounded-lg whitespace-nowrap ${over? 'bg-rose-950/50 text-rose-200 ring-1 ring-rose-700/30' : 'bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-700/20'}`}>{capIcon} <b>{used}</b>/<b>{cap}</b></div>
        <div className="px-2 py-1 rounded-lg bg-zinc-900 whitespace-nowrap">🗺️ <b>{sector}</b></div>
        {typeof lives === 'number' && (
          <div className="px-2 py-1 rounded-lg bg-zinc-900 whitespace-nowrap">{meName ? `${meName}${meFaction?` (${meFaction})`:''}:` : ''} <b>{lives}</b> ❤</div>
        )}
        {opponent && (
          <div className="px-2 py-1 rounded-lg bg-zinc-900 whitespace-nowrap">vs {opponent.name}{opponentFaction?` (${opponentFaction})`:''}: <b>{opponent.lives}</b> ❤{phase ? <span className="ml-2 text-xs opacity-70">Phase: {phase}</span> : null}</div>
        )}
        <button onClick={onReset} className="px-2 py-1 rounded bg-zinc-800 text-xs">Restart</button>
      </div>
    </div>
  );
}
