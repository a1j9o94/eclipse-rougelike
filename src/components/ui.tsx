// React import not required with modern JSX transform

import { type Part, partEffects, partDescription } from "../config/parts";
import type { GhostDelta, Ship } from "../config/types";
import type { FrameId } from "../config/frames";

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
  cruiser: [4, 2, 2],
  dread: [4, 3, 3],
};

function partIcon(p: Part): string {
  switch (p.cat) {
    case 'Source':
      return '⚡';
    case 'Drive':
      return '🚀';
    case 'Weapon':
      return '⭐';
    case 'Computer':
      return '🎯';
    case 'Shield':
      return '🛡️';
    case 'Hull':
      return '🧱';
    default:
      return '';
  }
}

export function ShipFrameSlots({ ship }: { ship: Ship }) {
  const layout = FRAME_LAYOUTS[ship.frame.id as FrameId] || [ship.frame.tiles];
  const icons = ship.parts.flatMap(p => {
    const icon = partIcon(p);
    const count = p.slots || 1;
    return Array(count).fill(icon);
  });
  let idx = 0;
  return (
    <div className="inline-block">
      {layout.map((count, r) => (
        <div key={r} className="flex justify-center gap-0.5">
          {Array.from({ length: count }).map((_, i) => {
            const icon = icons[idx++];
            return (
              <div
                key={i}
                data-testid={icon ? 'frame-slot-filled' : 'frame-slot-empty'}
                className="w-4 h-4 sm:w-5 sm:h-5 border border-zinc-600 text-[9px] sm:text-xs grid place-items-center"
              >
                {icon}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
export function CompactShip({ ship, side, active }:{ship:Ship, side:'P'|'E', active:boolean}){
  const dead = !ship.alive || ship.hull<=0;
  const weaponParts = ship.parts.filter((p:Part)=> (p.dice||0) > 0 || (p.riftDice||0) > 0);
  return (
    <div className={`relative w-28 sm:w-32 p-2 rounded-xl border shadow-sm ${dead? 'border-zinc-700 bg-zinc-900 opacity-60' : side==='P' ? 'border-sky-600/60 bg-slate-900' : 'border-pink-600/60 bg-zinc-900'} ${active? 'ring-2 ring-amber-400 animate-pulse':''}`}>
      <div
        className="text-[11px] sm:text-xs font-semibold"
        title={ship.frame.name}
      >
        🟢 {ship.frame.tonnage}
      </div>
      <div className="mt-0.5 text-[10px] opacity-70">🚀 {ship.stats.init} • 🎯 {ship.stats.aim} • 🛡️ {ship.stats.shieldTier}</div>
      <div className="mt-1 flex justify-center">
        <ShipFrameSlots ship={ship} />
      </div>
      <HullPips current={Math.max(0, ship.hull)} max={ship.stats.hullCap} />
      {/* Dice/Damage summary per weapon */}
      <div className="mt-1 flex flex-wrap gap-1 min-h-[18px]">
        {weaponParts.map((p:Part, i:number)=> {
          const dice = p.riftDice || p.dice || 0;
          const icon = p.riftDice ? '🕳️' : '🎲';
          const maxDmg = Math.max(p.dmgPerHit||0, ...(p.faces||[]).map(f=>f.dmg||0));
          return (
            <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] whitespace-nowrap">
              {dice}{icon}{maxDmg>0 ? ` × ${maxDmg}` : ''}
            </span>
          );
        })}
        {weaponParts.length===0 && (
          <span className="text-[10px] opacity-60">No weapons</span>
        )}
      </div>
      <div className="mt-1 text-[10px] opacity-80 line-clamp-2 min-h-[20px]">{
        weaponParts.map((p:Part)=> p.riftDice ? `${p.riftDice} Rift die${p.riftDice>1?'s':''}` : p.name).join(', ') || '—'
      }</div>
      {dead && <div className="absolute inset-0 grid place-items-center text-2xl text-zinc-300">✖</div>}
    </div>
  );
}
export function ItemCard({ item, canAfford, onBuy, ghostDelta }:{item:Part, canAfford:boolean, onBuy:()=>void, ghostDelta:GhostDelta}){
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
        <div className="text-sm sm:text-base font-semibold whitespace-nowrap">{item.cost}¢</div>
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
export function ResourceBar({ credits, materials, science, tonnage, sector, onReset }:{credits:number, materials:number, science:number, tonnage:{used:number,cap:number}, sector:number, onReset:()=>void}){
  const used = tonnage.used, cap = tonnage.cap;
  const over = used>cap;
  const capIcon = over ? '🔴' : '🟢';
  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="mx-auto max-w-5xl p-2 flex items-center gap-2 flex-wrap text-sm sm:text-base">
        <div className="px-2 py-1 rounded-lg bg-zinc-900 flex-1 whitespace-nowrap">💰 <b>{credits}</b> • 🧱 <b>{materials}</b> • 🔬 <b>{science}</b></div>
        <div className={`px-2 py-1 rounded-lg whitespace-nowrap ${over? 'bg-rose-950/50 text-rose-200 ring-1 ring-rose-700/30' : 'bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-700/20'}`}>{capIcon} <b>{used}</b>/<b>{cap}</b></div>
        <div className="px-2 py-1 rounded-lg bg-zinc-900 whitespace-nowrap">🗺️ <b>{sector}</b></div>
        <button onClick={onReset} className="px-2 py-1 rounded bg-zinc-800 text-xs">Restart</button>
      </div>
    </div>
  );
}


