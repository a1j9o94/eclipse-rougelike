// React import not required with modern JSX transform
import { useState } from 'react'

import { type Part, partEffects, partDescription } from "../../shared/parts";
import type { GhostDelta } from "../../shared/types";

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
export function ItemCard({ item, price, canAfford, onBuy, ghostDelta, compact }:{item:Part, price?:number, canAfford:boolean, onBuy:()=>void, ghostDelta:GhostDelta|null, compact?:boolean}){
  const cost = typeof price==='number' ? price : (item.cost||0)
  const slots = item.slots || 1
  const slotLabel = `⬛ ${slots} slot${slots>1?'s':''}`
  const disabledForSlots = Boolean(ghostDelta && !ghostDelta.slotOk)
  const disabled = !canAfford || disabledForSlots
  return (
    <div className={`p-3 rounded-xl border bg-zinc-900 transition ${!disabled? 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/70' : 'border-zinc-800 opacity-90'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
            <div className="font-semibold text-sm sm:text-base leading-tight">{item.name}</div>
            {compact ? (
              <div className="text-[11px] sm:text-xs opacity-70 mt-0.5">
                {/* icons-only summary: category • slots • key effects */}
                {item.cat} • {slotLabel} • {partEffects(item).join(' ')}
              </div>
            ) : (
              <>
                <div className="text-[11px] sm:text-xs opacity-70 mt-0.5">{`${item.cat} • ${slotLabel}${partEffects(item).length?' • '+partEffects(item).join(' • '):''}`}</div>
                <div className="text-[11px] sm:text-xs mt-1">{partDescription(item)}</div>
              </>
            )}
        </div>
        <div className="text-sm sm:text-base font-semibold whitespace-nowrap">{cost}¢</div>
      </div>
      {ghostDelta && (
        <div className={`mt-2 text-[11px] sm:text-xs grid grid-cols-2 gap-x-3 gap-y-1 ${compact?'opacity-80':''}`}>
          <div className={`${ghostDelta.valid? 'text-emerald-300':'text-rose-300'}`}>⚡ {ghostDelta.use}/{ghostDelta.prod} {ghostDelta.valid? '✔️' : '❌'}</div>
          <div className={`${ghostDelta.slotOk? 'text-emerald-300':'text-rose-300'}`}>⬛ {ghostDelta.slotsUsed}/{ghostDelta.slotCap} {ghostDelta.slotOk? '✔️' : '❌'}</div>
          {!compact && ghostDelta.initDelta!==0 && <div>🚀 {ghostDelta.initBefore} → <b>{ghostDelta.initAfter}</b></div>}
          {!compact && ghostDelta.hullDelta!==0 && <div>Hull {ghostDelta.hullBefore} → <b>{ghostDelta.hullAfter}</b></div>}
        </div>
      )}
      <button disabled={disabled} onClick={onBuy} className={`mt-2 w-full px-3 py-2 rounded-lg text-sm sm:text-base ${!disabled? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[.99]':'bg-zinc-700 opacity-60'}`}>{disabledForSlots? 'No Slot' : 'Buy & Install'}</button>
    </div>
  );
}
export function ResourceBar({ credits, materials, science, tonnage, sector, onReset, lives, multiplayer }:{credits:number, materials:number, science:number, tonnage:{used:number,cap:number}, sector:number, onReset:()=>void, lives?:number, multiplayer?:boolean}){
  const used = tonnage.used, cap = tonnage.cap;
  const over = used>cap;
  const capIcon = over ? '🔴' : '🟢';
  const [menu, setMenu] = useState(false)
  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="mx-auto max-w-5xl p-2 flex items-center gap-2 text-sm sm:text-base">
        <div data-tutorial="rb-resources" className="px-2 py-1 rounded-lg bg-zinc-900 flex-1 whitespace-nowrap">💰 <b>{credits}</b> • 🧱 <b>{materials}</b> • 🔬 <b>{science}</b></div>
        <div data-tutorial="rb-capacity" className={`px-2 py-1 rounded-lg whitespace-nowrap ${over? 'bg-rose-950/50 text-rose-200 ring-1 ring-rose-700/30' : 'bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-700/20'}`}>{capIcon} <b>{used}</b>/<b>{cap}</b></div>
        <div data-tutorial="rb-sector" className="px-2 py-1 rounded-lg bg-zinc-900 whitespace-nowrap">🗺️ <b>{sector}</b></div>
        {typeof lives === 'number' && (
          <div data-tutorial="rb-lives" className="px-2 py-1 rounded-lg bg-zinc-900 whitespace-nowrap"><b>{lives}</b> ❤</div>
        )}
        <div className="relative">
          <button aria-label="Menu" onClick={()=>setMenu(v=>!v)} className="px-2 py-1 rounded bg-zinc-800 text-xs">⋯</button>
          {menu && (
            <div className="absolute right-0 mt-1 w-32 rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden">
              <button onClick={()=>{ setMenu(false); onReset() }} className="w-full text-left px-3 py-2 hover:bg-zinc-800">{multiplayer ? 'Resign' : 'Restart'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
