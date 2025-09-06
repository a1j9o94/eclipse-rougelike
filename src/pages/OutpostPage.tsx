// React import not required with modern JSX transform
import { useState } from 'react'
import { ItemCard, PowerBadge, DockSlots } from '../components/ui'
import { CombatPlanModal } from '../components/modals'
import { ECONOMY } from '../config/economy'
import { FRAMES, type FrameId, ALL_PARTS, getEconomyModifiers, groupFleet } from '../game'
import { canBuildInterceptor } from '../game/hangar'
import { partEffects, partDescription } from '../config/parts'
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
  sector,
  endless,
  fleetValid,
  startCombat,
  onRestart,
  myReady,
  oppReady,
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
  sector:number,
  endless:boolean,
  fleetValid:boolean,
  startCombat:()=>void,
  onRestart:()=>void,
  myReady?: boolean,
  oppReady?: boolean,
}){
  const focusedShip = fleet[focused];
  const fleetGroups = groupFleet(fleet);
  const [showPlan, setShowPlan] = useState(false);
  const [dockPreview, setDockPreview] = useState<number|null>(null);
  const tracks = ['Military','Grid','Nano'] as const;
  const econ = getEconomyModifiers();
  const buildChk = canBuildInterceptor(resources, capacity, tonnage.used);
  const buildCost = { materials: buildChk.cost.m, credits: buildChk.cost.c };
  const buildFits = (tonnage.used + FRAMES.interceptor.tonnage) <= capacity.cap;
  const buildAffordable = resources.credits >= buildCost.credits && resources.materials >= buildCost.materials;
  const buildDisabled = !buildFits || !buildAffordable;
  const buildLabel = buildDisabled
    ? (buildFits ? `Build Interceptor — Need ${buildCost.materials}🧱 + ${buildCost.credits}¢` : 'Build Interceptor — Expand Docks')
    : `Build Interceptor 🟢 (${buildCost.materials}🧱 + ${buildCost.credits}¢)`;
  const dockCost = {
    materials: Math.max(1, Math.floor(ECONOMY.dockUpgrade.materials * econ.materials)),
    credits: Math.max(1, Math.floor(ECONOMY.dockUpgrade.credits * econ.credits)),
  };
  const dockAtCap = capacity.cap >= ECONOMY.dockUpgrade.capacityMax;
  const dockAffordable = resources.credits >= dockCost.credits && resources.materials >= dockCost.materials;
  const dockDisabled = dockAtCap || !dockAffordable;
  const rrInc = Math.max(1, Math.floor(ECONOMY.reroll.increment * econ.credits));
  const currentBlueprint = blueprints[focusedShip?.frame.id as FrameId] || [];
  const bpSlotsUsed = currentBlueprint.reduce((a,p)=>a+(p.slots||1),0);
  const nextUpgrade = (()=>{
    if(!focusedShip) return null;
    if(focusedShip.frame.id==='interceptor') return {
      materials: Math.max(1, Math.floor(ECONOMY.upgradeCosts.interceptorToCruiser.materials * econ.materials)),
      credits: Math.max(1, Math.floor(ECONOMY.upgradeCosts.interceptorToCruiser.credits * econ.credits)),
    };
    if(focusedShip.frame.id==='cruiser') return {
      materials: Math.max(1, Math.floor(ECONOMY.upgradeCosts.cruiserToDread.materials * econ.materials)),
      credits: Math.max(1, Math.floor(ECONOMY.upgradeCosts.cruiserToDread.credits * econ.credits)),
    };
    return null;
  })();
  const upgradeComputed = (()=>{
    if(!focusedShip) return { label: 'Upgrade — Maxed', disabled: true, targetUsed: tonnage.used } as const;
    const currId = focusedShip.frame.id as FrameId;
    const nextId = currId==='interceptor' ? 'cruiser' : currId==='cruiser' ? 'dread' : null as unknown as FrameId;
    if(!nextId) return { label: 'Upgrade — Maxed', disabled: true, targetUsed: tonnage.used } as const;
    const nextFrame = FRAMES[nextId];
    const targetUsed = tonnage.used + (nextFrame.tonnage - focusedShip.frame.tonnage);
    const lacksCapacity = targetUsed > capacity.cap;
    const label = `Upgrade ${focusedShip.frame.name} to ${nextFrame.name} — ⬛ ${focusedShip.frame.tiles}→${nextFrame.tiles} slots • 🟢 ${focusedShip.frame.tonnage}→${nextFrame.tonnage} dock`;
    return { label, disabled: lacksCapacity, targetUsed } as const;
  })();
  const upgradeLock = upgradeLockInfo(focusedShip);
  const upgradeUnlocked = !upgradeLock || (research.Military||1) >= upgradeLock.need;
  const upgradeAffordable = nextUpgrade ? (resources.materials >= nextUpgrade.materials && resources.credits >= nextUpgrade.credits) : false;
  const upgradeDisabled = upgradeComputed.disabled || !upgradeUnlocked || !upgradeAffordable;
  const upgradeLabel = (()=>{
    if(!focusedShip) return 'Upgrade — Maxed';
    if(!upgradeUnlocked) return `Upgrade ${focusedShip.frame.name} — Requires Military ≥ ${upgradeLock?.need}`;
    if(!upgradeAffordable && nextUpgrade) return `Upgrade ${focusedShip.frame.name} — Need ${nextUpgrade.materials}🧱 + ${nextUpgrade.credits}¢`;
    return `${upgradeComputed.label}${nextUpgrade ? ` (${nextUpgrade.materials}🧱 + ${nextUpgrade.credits}¢)` : ''}`;
  })();
  function nextUnlocksFor(track:'Military'|'Grid'|'Nano'){
    const curr = (research as Research)[track]||1;
    const next = Math.min(3, curr+1);
    const items = ALL_PARTS.filter(p=> !p.rare && p.tech_category===track && p.tier===next);
    return items;
  }
  function militaryNextNote(){
    const curr = (research as Research).Military||1;
    if(curr>=3) return 'Maxed — no further ship tiers';
    const next = curr+1;
    if(next===2) return `Unlocks class upgrade: Interceptor → Cruiser — ⬛ ${FRAMES.interceptor.tiles}→${FRAMES.cruiser.tiles} slots`;
    if(next===3) return `Unlocks class upgrade: Cruiser → Dreadnought — ⬛ ${FRAMES.cruiser.tiles}→${FRAMES.dread.tiles} slots`;
    return '';
  }
  return (
    <>
      {showPlan && <CombatPlanModal onClose={()=>setShowPlan(false)} sector={sector} endless={endless} />}

      <div className="mx-auto max-w-5xl pb-24">

      {/* Hangar */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-lg font-semibold">Hangar (Class Blueprints)</div>
          <div className="flex-1" />
          <button onClick={()=>setShowPlan(true)} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">📋 Combat Plan</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {fleetGroups.map((g,i)=> { const s = g.ship; const active = g.indices.includes(focused); const stack = Math.min(g.count-1,2); return (
              <div key={i} className="relative">
                {Array.from({length: stack}).map((_,j)=>(
                  <div key={j} className={`pointer-events-none absolute inset-0 rounded-xl border ${active?'border-sky-400':'border-zinc-700'} bg-zinc-900`} style={{transform:`translate(${(j+1)*4}px, ${(j+1)*4}px)`}} />
                ))}
                <button onClick={()=>setFocused(g.indices[0])} className={`relative w-full text-left p-3 rounded-xl border transition ${active?'border-sky-400 bg-sky-400/10':'border-zinc-700 bg-zinc-900 hover:border-zinc-600'}`}>
                  {g.count>1 && <div className="absolute -top-2 -left-2 bg-zinc-800 px-1 rounded text-xs">×{g.count}</div>}
                  <div className="flex items-center justify-between"><div className="font-semibold text-sm sm:text-base">{s.frame.name} <span className="text-xs opacity-70">(t{s.frame.tonnage})</span></div><PowerBadge use={s.stats.powerUse} prod={s.stats.powerProd} /></div>
                  <div className="text-xs opacity-80 mt-1">🚀 {s.stats.init} • 🎯 {s.stats.aim} • 🛡️ {s.stats.shieldTier} • ⬛ {s.parts.length}/{s.frame.tiles}</div>
                  <div className="mt-1">❤️ {s.hull}/{s.stats.hullCap}</div>
                  {!s.stats.valid && <div className="text-xs text-rose-300 mt-1">Not deployable: needs Source + Drive and ⚡ OK</div>}
                </button>
              </div>
            ); })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={buildShip}
            onMouseEnter={()=>setDockPreview(tonnage.used + FRAMES.interceptor.tonnage)}
            onMouseLeave={()=>setDockPreview(null)}
            disabled={buildDisabled}
            className={`px-3 py-3 rounded-xl ${buildDisabled?'bg-zinc-700 opacity-60':'bg-sky-600 hover:bg-sky-500 active:scale-95'}`}
          >
            {buildLabel}
          </button>
          <button
            onClick={()=>upgradeShip(focused)}
            onMouseEnter={()=>setDockPreview(upgradeComputed.targetUsed)}
            onMouseLeave={()=>setDockPreview(null)}
            disabled={upgradeDisabled}
            className={`px-3 py-3 rounded-xl ${upgradeDisabled?'bg-zinc-700 opacity-60':'bg-amber-600 hover:bg-amber-500 active:scale-95'}`}
          >
            {upgradeLabel}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={upgradeDock}
            disabled={dockDisabled}
            className={`px-3 py-3 rounded-xl ${dockDisabled? 'bg-zinc-700 opacity-60' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95'}`}
          >
            {dockDisabled ? (
              dockAtCap ? 'Capacity Maxed' : `Expand Capacity — Need ${dockCost.materials}🧱 + ${dockCost.credits}¢`
            ) : (
              <span className="inline-flex items-center gap-1">
                <span>Expand Capacity</span>
                <span className="inline-flex gap-0.5">
                  {Array.from({length: ECONOMY.dockUpgrade.capacityDelta}).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-zinc-700" />
                  ))}
                </span>
                <span>
                  ({dockCost.materials}🧱 + {dockCost.credits}¢)
                </span>
              </span>
            )}
          </button>
          <div className="px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm">
            <div>Capacity: <b>{capacity.cap}</b> • Used: <b>{tonnage.used}</b></div>
            <DockSlots used={tonnage.used} cap={capacity.cap} preview={dockPreview===null?undefined:dockPreview} />
          </div>
        </div>
          {/* Blueprint Manager with Sell */}
          <div className="mt-3">
            <div className="text-sm font-semibold mb-1">Class Blueprint — {focusedShip?.frame.name} ⬛ {bpSlotsUsed}/{focusedShip?.frame.tiles}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {currentBlueprint.map((p, idx)=> (
              <div key={idx} className="p-2 rounded border border-zinc-700 bg-zinc-900 text-xs">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="opacity-70">{(() => { const eff = partEffects(p).join(' • '); return `${p.cat} • Tier ${p.tier}${eff ? ' • ' + eff : ''}`; })()}</div>
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
              <div className="text-[11px] sm:text-xs opacity-70">Reroll +{rrInc} after each Reroll/Research</div>
            </div>
            <div className="text-lg font-semibold mb-2">Outpost Inventory</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
              {shop.items.map((it:Part, i:number)=> { const canAfford = resources.credits >= (it.cost||0); const gd = focusedShip? ghost(focusedShip, it) : null; return (<ItemCard key={i} item={it} canAfford={canAfford} ghostDelta={gd} onBuy={()=>buyAndInstall(it)} />); })}
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
                        <div className="space-y-1">
                          {preview.map((p, i)=> (
                            <div key={i}>
                              <div className="flex items-center justify-between"><span>{p.name}</span><span className="opacity-60">{partEffects(p).join(' ')}</span></div>
                              <div className="opacity-80">{partDescription(p)}</div>
                            </div>
                          ))}
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
      </div>


      {/* Start Combat */}
      <div className="fixed bottom-0 left-0 w-full z-10 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
      <div className="mx-auto max-w-5xl flex items-center gap-2">
          {(() => {
            const amReady = Boolean(myReady);
            const opponentReady = Boolean(oppReady);
            const label = !amReady
              ? 'Start Combat'
              : (!opponentReady ? 'Waiting for opponent…' : 'Starting…');
            const disabled = amReady ? true : !fleetValid;
            const cls = disabled ? 'bg-zinc-700 opacity-60' : 'bg-emerald-600';
            return (
              <button onClick={()=> (!disabled) && startCombat()} disabled={disabled} className={`flex-1 px-4 py-3 rounded-xl ${cls}`}>{label}</button>
            );
          })()}
          {myReady ? (
            <button onClick={()=> startCombat()} className="px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-sm">Cancel Ready</button>
          ) : null}
          {(!fleetValid && resources.credits<=0) ? (
            <>
              <div className="text-xs text-rose-300">Fleet inoperable and no credits</div>
              <button onClick={onRestart} className="px-2 py-1 rounded bg-rose-600 text-xs">Restart</button>
            </>
          ) : (
            <>
              {!fleet.every(s=>s.stats.valid) && <div className="text-xs text-rose-300">Fix fleet (Source + Drive + ⚡ OK)</div>}
              {tonnage.used > capacity.cap && <div className="text-xs text-rose-300">Over capacity — expand docks</div>}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default OutpostPage

