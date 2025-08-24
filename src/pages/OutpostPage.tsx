// React import not required with modern JSX transform
import { ItemCard, PowerBadge } from '../components/ui'
import { type FrameId, isSource } from '../game'
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
  return (
    <div>
      {/* Shop Header: Reroll + Research */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950">
        <div className="flex gap-2 items-center">
          <button onClick={doReroll} disabled={resources.credits<rerollCost} className={`px-3 py-2 rounded-lg ${resources.credits>=rerollCost?'bg-purple-700':'bg-zinc-700 opacity-60'}`}>Reroll ({rerollCost}¢)</button>
          <div className="text-xs opacity-70">Reroll +6 after each Reroll/Research</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          {(['Military','Grid','Nano'] as const).map(t=> (
            <button key={t} onClick={()=>researchTrack(t)} disabled={!canResearch(t)} className={`px-3 py-2 rounded-xl ${canResearch(t)?'bg-zinc-900 border border-zinc-700':'bg-zinc-800 opacity-60'}`}>{researchLabel(t)}</button>
          ))}
        </div>
      </div>

      {/* Hangar */}
      <div className="p-3">
        <div className="text-lg font-semibold mb-2">Hangar (Class Blueprints)</div>
        <div className="grid grid-cols-1 gap-2">
          {fleet.map((s,i)=> (
            <button key={i} onClick={()=>setFocused(i)} className={`w-full text-left p-3 rounded-xl border mb-1 ${i===focused?'border-sky-400 bg-sky-400/10':'border-zinc-700 bg-zinc-900'}`}>
              <div className="flex items-center justify-between"><div className="font-semibold">{s.frame.name} <span className="text-xs opacity-70">(t{s.frame.tonnage})</span></div><PowerBadge use={s.stats.powerUse} prod={s.stats.powerProd} /></div>
              <div className="text-xs opacity-80 mt-1">Init {s.stats.init} • Tiles {s.parts.length}/{s.frame.tiles}</div>
              <div className="mt-1">Hull: {s.hull}/{s.stats.hullCap}</div>
              <div className="mt-1 text-xs">Parts: {s.parts.map((p:Part)=>p.name).join(', ')||'—'}</div>
              {!s.stats.valid && <div className="text-xs text-rose-300 mt-1">Not deployable: needs Source + Drive and ⚡ OK</div>}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={buildShip} className="px-3 py-3 rounded-xl bg-sky-600 active:scale-95">Build Interceptor (3🧱 + 2¢)</button>
          <button onClick={()=>upgradeShip(focused)} className="px-3 py-3 rounded-xl bg-amber-600 active:scale-95">Upgrade Focused</button>
        </div>
        {(() => { const info = upgradeLockInfo(focusedShip); if(!info) return null; const ok = (research.Military||1) >= info.need; return (
          <div className={`mt-2 text-xs px-3 py-2 rounded ${ok? 'bg-emerald-900/30 text-emerald-200':'bg-zinc-900 border border-zinc-700 text-zinc-300'}`}>
            {ok ? `Upgrade to ${info.next} unlocked (Military ≥ ${info.need})` : `Upgrade to ${info.next} locked: requires Military ≥ ${info.need}`}
          </div>
        ); })()}

        {/* Blueprint Manager with Sell */}
        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">Class Blueprint — {focusedShip?.frame.name}</div>
          <div className="grid grid-cols-2 gap-2">
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

      {/* Outpost Inventory (items) */}
      <div className="p-3">
        <div className="text-lg font-semibold mb-2">Outpost Inventory</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shop.items.map((it:Part, i:number)=> { const canAfford = resources.credits >= (it.cost||0); const gd = focusedShip? ghost(focusedShip, it) : null; return (<ItemCard key={i} item={it} canAfford={canAfford} ghostDelta={gd} onBuy={()=>buyAndInstall(it)} />); })}
        </div>
      </div>

      {/* Docks */}
      <div className="px-3 pb-24">
        <div className="font-semibold mb-2">Dock Upgrades</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={upgradeDock} className="px-3 py-3 rounded-xl bg-indigo-600 active:scale-95">Expand Capacity +2 (4🧱 + 4¢)</button>
          <div className="px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm">Capacity: <b>{capacity.cap}</b> • Used: <b>{tonnage.used}</b></div>
        </div>
      </div>

      {/* Start Combat */}
      <div className="sticky bottom-0 z-10 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 flex items-center gap-2">
        <button onClick={()=> fleetValid && startCombat()} className={`flex-1 px-4 py-3 rounded-xl ${fleetValid?'bg-emerald-600':'bg-zinc-700 opacity-60'}`}>Start Combat</button>
        {!fleet.every(s=>s.stats.valid) && <div className="text-xs text-rose-300">Fix fleet (Source + Drive + ⚡ OK)</div>}
        {tonnage.used > capacity.cap && <div className="text-xs text-rose-300">Over capacity — expand docks</div>}
      </div>
    </div>
  )
}

export default OutpostPage


