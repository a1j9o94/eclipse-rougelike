// React import not required with modern JSX transform
import { useState } from 'react'
import { ItemCard, PowerBadge } from '../components/ui'
import { CombatPlanModal } from '../components/modals'
import { ECONOMY } from '../config/economy'
import { FRAMES, type FrameId, isSource, ALL_PARTS } from '../game'
import { type Resources, type Research } from '../config/defaults'
import { type Part } from '../config/parts'
import { type Ship, type GhostDelta } from '../config/types'

export function OutpostPage({
  resources,
  rerollCost,
  doReroll,
  research,
  researchLabel,
  canResearch,
  researchTrack,
  fleet,
  focused,
  setFocused,
  buildShip,
  upgradeShip,
  upgradeDock,
  upgradeLockInfo,
  blueprints,
  sellPart,
  shop,
  ghost,
  buyAndInstall,
  capacity,
  tonnage,
  fleetValid,
  startCombat,
}:{
  resources:Resources,
  rerollCost:number,
  doReroll:()=>void,
  research:Research,
  researchLabel:(t:'Military'|'Grid'|'Nano')=>string,
  canResearch:(t:'Military'|'Grid'|'Nano')=>boolean,
  researchTrack:(t:'Military'|'Grid'|'Nano')=>void,
  fleet:Ship[],
  focused:number,
  setFocused:(n:number)=>void,
  buildShip:()=>void,
  upgradeShip:(idx:number)=>void,
  upgradeDock:()=>void,
  upgradeLockInfo:(ship:Ship|undefined|null)=>{need:number,next:string}|null,
  blueprints:Record<FrameId, Part[]>,
  sellPart:(frameId:FrameId, idx:number)=>void,
  shop:{items:Part[]},
  ghost:(ship:Ship, part:Part)=>GhostDelta,
  buyAndInstall:(part:Part)=>void,
  capacity:{cap:number},
  tonnage:{used:number,cap:number},
  fleetValid:boolean,
  startCombat:()=>void,
}){
  const focusedShip = fleet[focused];
  const [showPlan, setShowPlan] = useState(false);
  const tracks = ['Military','Grid','Nano'] as const;
  const nextUpgrade = (()=>{
    if(!focusedShip) return null;
    if(focusedShip.frame.id==='interceptor') return ECONOMY.upgradeCosts.interceptorToCruiser;
    if(focusedShip.frame.id==='cruiser') return ECONOMY.upgradeCosts.cruiserToDread;
    return null;
  })();
  const upgradeComputed = (()=>{
    if(!focusedShip) return { label: 'Upgrade — Maxed', disabled: true } as const;
    const currId = focusedShip.frame.id as FrameId;
    const nextId = currId==='interceptor' ? 'cruiser' : currId==='cruiser' ? 'dread' : null as unknown as FrameId;
    if(!nextId) return { label: 'Upgrade — Maxed', disabled: true } as const;
    const nextFrame = FRAMES[nextId];
    const targetUsed = tonnage.used + (nextFrame.tonnage - focusedShip.frame.tonnage);
    const lacksCapacity = targetUsed > capacity.cap;
    const label = `Upgrade ${focusedShip.frame.name} to ${nextFrame.name} — will set tonnage to ${targetUsed}`;
    return { label, disabled: lacksCapacity } as const;
  })();
  function nextUnlocksFor(track:'Military'|'Grid'|'Nano'){
    const curr = (research as Research)[track]||1;
    const next = Math.min(3, curr+1);
    const items = ALL_PARTS.filter(p=> p.tech_category===track && p.tier===next);
    return items;
  }
  function militaryNextNote(){
    const curr = (research as Research).Military||1;
    if(curr>=3) return 'Maxed — no further ship tiers';
    const next = curr+1;
    if(next===2) return 'Unlocks class upgrade: Interceptor → Cruiser';
    if(next===3) return 'Unlocks class upgrade: Cruiser → Dreadnought';
    return '';
  }
  return (
    <div className="mx-auto max-w-5xl">
      {showPlan && <CombatPlanModal onClose={()=>setShowPlan(false)} />}

      {/* Hangar */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-lg font-semibold">Hangar (Class Blueprints)</div>
          <div className="flex-1" />
          <button onClick={()=>setShowPlan(true)} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">📋 Combat Plan</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {fleet.map((s,i)=> (
            <button key={i} onClick={()=>setFocused(i)} className={`w-full text-left p-3 rounded-xl border transition ${i===focused?'border-sky-400 bg-sky-400/10':'border-zinc-700 bg-zinc-900 hover:border-zinc-600'}`}>
              <div className="flex items-center justify-between"><div className="font-semibold text-sm sm:text-base">{s.frame.name} <span className="text-xs opacity-70">(t{s.frame.tonnage})</span></div><PowerBadge use={s.stats.powerUse} prod={s.stats.powerProd} /></div>
              <div className="text-xs opacity-80 mt-1">Init {s.stats.init} • Tiles {s.parts.length}/{s.frame.tiles}</div>
              <div className="mt-1">Hull: {s.hull}/{s.stats.hullCap}</div>
              <div className="mt-1 text-xs">Parts: {s.parts.map((p:Part)=>p.name).join(', ')||'—'}</div>
              {!s.stats.valid && <div className="text-xs text-rose-300 mt-1">Not deployable: needs Source + Drive and ⚡ OK</div>}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={buildShip} className="px-3 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95">Build Interceptor ({ECONOMY.buildInterceptor.materials}🧱 + {ECONOMY.buildInterceptor.credits}¢)</button>
          <button onClick={()=>upgradeShip(focused)} disabled={upgradeComputed.disabled} className={`px-3 py-3 rounded-xl ${upgradeComputed.disabled?'bg-zinc-700 opacity-60':'bg-amber-600 hover:bg-amber-500 active:scale-95'}`}>{upgradeComputed.label}{nextUpgrade ? ` (${nextUpgrade.materials}🧱 + ${nextUpgrade.credits}¢)` : ''}</button>
        </div>
        {(() => { const info = upgradeLockInfo(focusedShip); if(!info) return null; const ok = (research.Military||1) >= info.need; return (
          <div className={`mt-2 text-xs px-3 py-2 rounded ${ok? 'bg-emerald-900/30 text-emerald-200':'bg-zinc-900 border border-zinc-700 text-zinc-300'}`}>
            {ok ? `Upgrade to ${info.next} unlocked (Military ≥ ${info.need})` : `Upgrade to ${info.next} locked: requires Military ≥ ${info.need}`}
          </div>
        ); })()}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={upgradeDock} className="px-3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95">Expand Capacity +{ECONOMY.dockUpgrade.capacityDelta} ({ECONOMY.dockUpgrade.materials}🧱 + {ECONOMY.dockUpgrade.credits}¢)</button>
          <div className="px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm">Capacity: <b>{capacity.cap}</b> • Used: <b>{tonnage.used}</b></div>
        </div>

        {/* Blueprint Manager with Sell */}
        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">Class Blueprint — {focusedShip?.frame.name}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {blueprints[focusedShip?.frame.id as FrameId]?.map((p, idx)=> (
              <div key={idx} className="p-2 rounded border border-zinc-700 bg-zinc-900 text-xs">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="opacity-70">{p.cat} • Tier {p.tier} {isSource(p)?`• +⚡${p.powerProd}`:`• ⚡${p.powerCost||0}`}</div>
                <div className="mt-1 flex justify-between items-center">
                  <span className="opacity-70">Refund {Math.floor((p.cost||0)*0.25)}¢</span>
                  <button onClick={()=> sellPart(focusedShip.frame.id as FrameId, idx)} className="px-2 py-1 rounded bg-rose-600">Sell</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outpost: Reroll + Shop + Tech Upgrades */}
      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Shop side */}
          <div className="lg:col-span-2">
            <div className="flex gap-2 items-center flex-wrap mb-2">
              <button onClick={doReroll} disabled={resources.credits<rerollCost} className={`px-3 py-2 rounded-lg text-sm sm:text-base ${resources.credits>=rerollCost?'bg-purple-700 hover:bg-purple-600 active:scale-[.99]':'bg-zinc-700 opacity-60'}`}>Reroll ({rerollCost}¢)</button>
              <div className="text-[11px] sm:text-xs opacity-70">Reroll +{ECONOMY.reroll.increment} after each Reroll/Research</div>
            </div>
            <div className="text-lg font-semibold mb-2">Outpost Inventory</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {shop.items.map((it:Part, i:number)=> { const canAfford = resources.credits >= (it.cost||0); const gd = focusedShip? ghost(focusedShip, it) : null; return (<ItemCard key={i} item={it} canAfford={canAfford} ghostDelta={gd as GhostDelta} onBuy={()=>buyAndInstall(it)} />); })}
            </div>
          </div>
          {/* Tech Upgrades side */}
          <div>
            <div className="text-lg font-semibold mb-2">Tech Upgrades</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {tracks.map(t=> (
                <button key={t} onClick={()=>researchTrack(t)} disabled={!canResearch(t)} className={`px-3 py-2 rounded-xl leading-tight ${canResearch(t)?'bg-zinc-900 border border-zinc-700 hover:border-zinc-500':'bg-zinc-800 opacity-60'}`}>{researchLabel(t)}</button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
              {tracks.map(t=> {
                if(t==='Military'){
                  const note = militaryNextNote();
                  return (
                    <div key={t} className="text-[11px] sm:text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                      <div className="font-medium mb-1">{t} — Next unlock</div>
                      <div className="opacity-80">{note}</div>
                    </div>
                  );
                }
                const nxt = nextUnlocksFor(t); const preview = nxt.slice(0,3); const more = Math.max(0, nxt.length - preview.length);
                return (
                  <div key={t} className="text-[11px] sm:text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="font-medium mb-1">{t} — Next unlocks</div>
                    {nxt.length===0 ? (
                      <div className="opacity-70">Maxed or no new parts at next tier</div>
                    ) : (
                      <div className="space-y-0.5">
                        {preview.map((p, i)=> (<div key={i} className="flex items-center justify-between"><span>{p.name}</span><span className="opacity-60">{p.cat} • T{p.tier}</span></div>))}
                        {more>0 && <div className="opacity-60">+{more} more…</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      

      {/* Start Combat */}
      <div className="sticky bottom-0 z-10 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
        <div className="mx-auto max-w-5xl flex items-center gap-2">
          <button onClick={()=> fleetValid && startCombat()} className={`flex-1 px-4 py-3 rounded-xl ${fleetValid?'bg-emerald-600':'bg-zinc-700 opacity-60'}`}>Start Combat</button>
          {!fleet.every(s=>s.stats.valid) && <div className="text-xs text-rose-300">Fix fleet (Source + Drive + ⚡ OK)</div>}
          {tonnage.used > capacity.cap && <div className="text-xs text-rose-300">Over capacity — expand docks</div>}
        </div>
      </div>
    </div>
  )
}

export default OutpostPage


