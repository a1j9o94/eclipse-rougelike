// React import not required with modern JSX transform

import { type Part, partEffects } from "../config/parts";
import type { GhostDelta, Ship } from "../config/types";

export function PowerBadge({use, prod}:{use:number, prod:number}){
  const ok = use<=prod;
  return (
    <span className={`inline-flex items-center gap-1 font-medium font-mono px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs ${ok? 'bg-emerald-600/20 text-emerald-200 ring-1 ring-emerald-600/30' : 'bg-rose-600/20 text-rose-100 ring-1 ring-rose-600/30'}`}>
      ⚡ <span>{use}</span>/<span>{prod}</span>
    </span>
  );
}
export function HullPips({ current, max }:{current:number, max:number}){
  const arr = Array.from({length: max});
  return (
    <div className="flex gap-0.5 mt-1">
      {arr.map((_,i)=>(
        <span key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded ${i<current? 'bg-emerald-400':'bg-zinc-700'}`} />
      ))}
    </div>
  );
}
export function CompactShip({ ship, side, active }:{ship:Ship, side:'P'|'E', active:boolean}){
  const dead = !ship.alive || ship.hull<=0;
  return (
    <div className={`relative w-28 sm:w-32 p-2 rounded-xl border shadow-sm ${dead? 'border-zinc-700 bg-zinc-900 opacity-60' : side==='P' ? 'border-sky-600/60 bg-slate-900' : 'border-pink-600/60 bg-zinc-900'} ${active? 'ring-2 ring-amber-400 animate-pulse':''}`}>
      <div className="text-[11px] sm:text-xs font-semibold truncate pr-6">{ship.frame.name}</div>
      <div className="text-[10px] opacity-70">Init {ship.stats.init} • 🎯 {ship.stats.aim} • 🛡️ S{ship.stats.shieldTier}</div>
      <HullPips current={Math.max(0, ship.hull)} max={ship.stats.hullCap} />
      {/* Dice/Damage summary per weapon */}
      <div className="mt-1 flex flex-wrap gap-1 min-h-[18px]">
        {ship.weapons.map((w:Part, i:number)=> {
          const maxDmg = Math.max(w.dmgPerHit||0, ...(w.faces||[]).map(f=>f.dmg||0));
          return (
            <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] whitespace-nowrap">
              {w.dice||0}🎲 × {maxDmg}
            </span>
          );
        })}
        {ship.riftDice>0 && (
          <span key="rift" className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] whitespace-nowrap">
            {ship.riftDice}🕳️
          </span>
        )}
        {ship.weapons.length===0 && ship.riftDice===0 && (
          <span className="text-[10px] opacity-60">No weapons</span>
        )}
      </div>
      <div className="mt-1 text-[10px] opacity-80 line-clamp-2 min-h-[20px]">{
        [...ship.weapons.map((w:Part)=>w.name), ...(ship.riftDice>0 ? [`${ship.riftDice} Rift die${ship.riftDice>1?'s':''}`] : [])].join(', ')||'—'
      }</div>
      <div className="absolute top-1 right-1"><PowerBadge use={ship.stats.powerUse} prod={ship.stats.powerProd} /></div>
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
          <div className="text-[11px] sm:text-xs opacity-70 mt-0.5">{(() => { const eff = partEffects(item).join(' • '); return `${item.cat} • Tier ${item.tier}${eff ? ' • ' + eff : ''}`; })()}</div>
        </div>
        <div className="text-sm sm:text-base font-semibold whitespace-nowrap">{item.cost}¢</div>
      </div>
      {ghostDelta && (
        <div className="mt-2 text-[11px] sm:text-xs grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="col-span-2 opacity-70">After install on {ghostDelta.targetName}:</div>
          <div className={`${ghostDelta.valid? 'text-emerald-300':'text-rose-300'}`}>⚡ {ghostDelta.use}/{ghostDelta.prod} {ghostDelta.valid? '✔️' : '❌'}</div>
          {ghostDelta.initDelta!==0 && <div>Init {ghostDelta.initBefore} → <b>{ghostDelta.initAfter}</b></div>}
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
  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="mx-auto max-w-5xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm sm:text-base">
        <div className="px-3 py-2 rounded-lg bg-zinc-900 flex items-center justify-between"><span>💰 <b>{credits}</b> • 🧱 <b>{materials}</b> • 🔬 <b>{science}</b></span></div>
        <div className={`px-3 py-2 rounded-lg ${over? 'bg-rose-950/50 text-rose-200 ring-1 ring-rose-700/30' : 'bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-700/20'}`}>⚓ <b>{used}</b> / <b>{cap}</b></div>
        <div className="px-3 py-2 rounded-lg bg-zinc-900 flex items-center justify-between">🗺️ Sector <b>{sector}</b> <button onClick={onReset} className="ml-2 px-2 py-1 rounded bg-zinc-800 text-xs">Reset</button></div>
      </div>
    </div>
  );
}


