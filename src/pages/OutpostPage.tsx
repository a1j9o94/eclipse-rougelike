// React import not required with modern JSX transform
import { useState } from 'react'
import { ItemCard, DockSlots } from '../components/ui'
import { ShipFrameSlots } from '../components/ShipFrameSlots'
import BlueprintSummary from '../components/outpost/BlueprintSummary'
import { emptyShip } from '../game/emptyShip'
import { CombatPlanModal, TechListModal } from '../components/modals'
import { event as tutorialEvent, isEnabled as isTutorialEnabled, getStep as tutorialGetStep } from '../tutorial/state'
import type { MpBasics } from '../adapters/mpSelectors'
import { ECONOMY } from '../../shared/economy'
import { FRAMES, type FrameId } from '../../shared/frames'
// import { ALL_PARTS } from '../../shared/parts'
// import { groupFleet } from '../game/fleet'
import { canBuildInterceptorWithMods } from '../game/hangar'
import { partEffects } from '../../shared/parts'
import { type Resources, type Research } from '../../shared/defaults'
import { type Part } from '../../shared/parts'
import { type Ship, type GhostDelta } from '../../shared/types'
import { type EconMods, applyEconomyModifiers, getDefaultEconomyModifiers } from '../game/economy'

export function OutpostPage({
  gameMode,
  multi,
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
  mpGuards,
  economyMods = getDefaultEconomyModifiers(),
}:{
  gameMode: 'single'|'multiplayer',
  multi?: MpBasics,
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
  mpGuards?: { myReady:boolean; oppReady?:boolean; localValid:boolean; serverValid?:boolean; haveSnapshot:boolean },
  economyMods?: EconMods,
}){
  const focusedShip = fleet[focused];
  // groupFleet no longer used for roster; keep for potential counts later
  // const fleetGroups = groupFleet(fleet);
  // const hasInterceptor = fleet.some(s => s.frame.id === 'interceptor')
  // const hasCruiser = fleet.some(s => s.frame.id === 'cruiser')
  const firstIdx = (id: FrameId): number => fleet.findIndex(s => s.frame.id === id)
  const [showPlan, setShowPlan] = useState(false);
  const [dockPreview, setDockPreview] = useState<number|null>(null);
  const [showTech, setShowTech] = useState(false);
  const [showCapModal, setShowCapModal] = useState(false);
  const [frameTab, setFrameTab] = useState<'interceptor'|'cruiser'|'dread'>('interceptor');
  const selectedId = frameTab as FrameId;
  const selectedCount = fleet.filter(s=>s.frame.id===selectedId).length;
  const hasSelected = selectedCount > 0;
  const tracks = ['Military','Grid','Nano'] as const;
  const buildChk = canBuildInterceptorWithMods(resources, capacity, tonnage.used, economyMods);
  const buildCost = { materials: buildChk.cost.m, credits: buildChk.cost.c };
  const buildFits = (tonnage.used + FRAMES.interceptor.tonnage) <= capacity.cap;
  const buildAffordable = resources.credits >= buildCost.credits && resources.materials >= buildCost.materials;
  const buildDisabled = !buildFits || !buildAffordable;
  const buildLabel = buildDisabled
    ? (buildFits ? `Build Interceptor — Need ${buildCost.materials}🧱 + ${buildCost.credits}¢` : 'Build Interceptor — Expand Docks')
    : `Build Interceptor 🟢 (${buildCost.materials}🧱 + ${buildCost.credits}¢)`;
  const dockCost = {
    materials: applyEconomyModifiers(ECONOMY.dockUpgrade.materials, economyMods, 'materials'),
    credits: applyEconomyModifiers(ECONOMY.dockUpgrade.credits, economyMods, 'credits'),
  };
  const dockAtCap = capacity.cap >= ECONOMY.dockUpgrade.capacityMax;
  const dockAffordable = resources.credits >= dockCost.credits && resources.materials >= dockCost.materials;
  const dockDisabled = dockAtCap || !dockAffordable;
  const rrInc = applyEconomyModifiers(ECONOMY.reroll.increment, economyMods, 'credits');
  const currentClassId = hasSelected ? (focusedShip?.frame.id as FrameId) : selectedId;
  const currentBlueprint = blueprints[currentClassId] || [];
  const nextUpgrade = (()=>{
    if(!focusedShip) return null;
    if(focusedShip.frame.id==='interceptor') return {
      materials: applyEconomyModifiers(ECONOMY.upgradeCosts.interceptorToCruiser.materials, economyMods, 'materials'),
      credits: applyEconomyModifiers(ECONOMY.upgradeCosts.interceptorToCruiser.credits, economyMods, 'credits'),
    };
    if(focusedShip.frame.id==='cruiser') return {
      materials: applyEconomyModifiers(ECONOMY.upgradeCosts.cruiserToDread.materials, economyMods, 'materials'),
      credits: applyEconomyModifiers(ECONOMY.upgradeCosts.cruiserToDread.credits, economyMods, 'credits'),
    };
    return null;
  })();
  const upgradeComputed = (()=>{
    if(!focusedShip) return { label: 'Upgrade — Maxed', disabled: true, targetUsed: tonnage.used, nextId: null as FrameId|null } as const;
    const currId = focusedShip.frame.id as FrameId;
    const nextId = currId==='interceptor' ? 'cruiser' : currId==='cruiser' ? 'dread' : null;
    if(!nextId) return { label: 'Upgrade — Maxed', disabled: true, targetUsed: tonnage.used, nextId } as const;
    const nextFrame = FRAMES[nextId];
    const targetUsed = tonnage.used + (nextFrame.tonnage - focusedShip.frame.tonnage);
    const lacksCapacity = targetUsed > capacity.cap;
    const label = `Upgrade ${focusedShip.frame.name} to ${nextFrame.name} — ⬛ ${focusedShip.frame.tiles}→${nextFrame.tiles} slots • 🟢 ${focusedShip.frame.tonnage}→${nextFrame.tonnage} dock`;
    return { label, disabled: lacksCapacity, targetUsed, nextId } as const;
  })();
  const upgradeLock = upgradeLockInfo(focusedShip);
  const upgradeUnlocked = !upgradeLock || (research.Military||1) >= upgradeLock.need;
  const upgradeAffordable = nextUpgrade ? (resources.materials >= nextUpgrade.materials && resources.credits >= nextUpgrade.credits) : false;
  const upgradeLabel = (()=>{
    if(!focusedShip) return 'Upgrade — Maxed';
    if(!upgradeUnlocked) return `Upgrade ${focusedShip.frame.name} — Requires Military ≥ ${upgradeLock?.need}`;
    if(!upgradeAffordable && nextUpgrade) return `Upgrade ${focusedShip.frame.name} — Need ${nextUpgrade.materials}🧱 + ${nextUpgrade.credits}¢`;
    return `${upgradeComputed.label}${nextUpgrade ? ` (${nextUpgrade.materials}🧱 + ${nextUpgrade.credits}¢)` : ''}`;
  })();
  // helpers removed in favor of using unified TechListModal
  return (
    <>
      {showPlan && <CombatPlanModal onClose={()=>{ setShowPlan(false); try { if (isTutorialEnabled() && tutorialGetStep()==='intel-close') tutorialEvent('viewed-intel') } catch { /* noop */ } }} sector={sector} endless={endless} gameMode={gameMode} multi={multi as never} />}

      {/* Tech List — reuse canonical modal */}
      {showTech && <TechListModal research={research as Research} onClose={()=>setShowTech(false)} />}

      <div className="mx-auto max-w-5xl pb-24">

      {/* Hangar */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-lg font-semibold">Hangar</div>
          <div className="flex-1" />
          <button data-tutorial="enemy-intel-btn" onClick={()=>{ setShowPlan(true); if (isTutorialEnabled()) tutorialEvent('viewed-intel') }} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">📋 Enemy Intel</button>
        </div>

        {/* Tabs control focus; counts per frame */}
        <div className="mb-1">
          <div className="inline-flex rounded-xl overflow-hidden ring-1 ring-white/10" role="tablist">
            {(['interceptor','cruiser','dread'] as const).map(t => (
              <button key={t} role="tab" aria-selected={frameTab===t} onClick={()=>{ setFrameTab(t); const idx = firstIdx(t as FrameId); if (idx>=0) setFocused(idx) }} className={`px-3 py-1.5 text-sm flex items-center gap-1 ${frameTab===t? 'bg-white/10' : 'bg-black/30 hover:bg-black/40'}`}>
                <span>{t==='interceptor'?'Interceptor':t==='cruiser'?'Cruiser':'Dreadnought'}</span>
                <span className="text-xs opacity-80">×{fleet.filter(s=>s.frame.id===t).length}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Single action panel (tabs above control the content) */}
        <div className="mt-3">
          {/* Panel (compact action button) */}
          {(() => {
            if (frameTab === 'interceptor') {
              return (
                <button
                  aria-label={buildLabel}
                  onClick={buildShip}
                  onMouseEnter={()=>setDockPreview(tonnage.used + FRAMES.interceptor.tonnage)}
                  onMouseLeave={()=>setDockPreview(null)}
                  disabled={buildDisabled}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${buildDisabled?'bg-zinc-700 opacity-60':'bg-sky-600 hover:bg-sky-500 active:scale-95'}`}
                >
                  <span>Build Interceptor</span>
                  <span className="opacity-90">{`${buildCost.materials}🧱 + ${buildCost.credits}¢`}</span>
                </button>
              )
            }
            if (frameTab === 'cruiser') {
              const target = fleet[focused]?.frame.id === 'interceptor' ? focused : firstIdx('interceptor')
              const haveInterceptor = target >= 0
              const milOk = (research.Military || 1) >= 2
              const upMat = applyEconomyModifiers(ECONOMY.upgradeCosts.interceptorToCruiser.materials, economyMods, 'materials')
              const upCred = applyEconomyModifiers(ECONOMY.upgradeCosts.interceptorToCruiser.credits, economyMods, 'credits')
              const canAfford = resources.materials >= upMat && resources.credits >= upCred
              const targetUsed = haveInterceptor ? (tonnage.used + (FRAMES.cruiser.tonnage - fleet[target].frame.tonnage)) : tonnage.used
              const capOk = haveInterceptor && (targetUsed <= capacity.cap)
              const baseText = !haveInterceptor ? 'Requires Interceptor' : (!milOk ? 'Requires Military ≥ 2' : (!capOk ? 'Increase Capacity' : 'Upgrade to Cruiser'))
              const disabled = !haveInterceptor || !milOk || !capOk || !canAfford
              return (
                <button aria-label={upgradeLabel} onClick={()=>{ if (target>=0) upgradeShip(target) }} onMouseEnter={()=> setDockPreview(targetUsed)} onMouseLeave={()=> setDockPreview(null)} disabled={disabled} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${disabled?'bg-zinc-800 opacity-60':'bg-amber-600 hover:bg-amber-500 active:scale-95'}`}>
                  <span>{baseText}</span>
                  {haveInterceptor && milOk && capOk && (
                    <span className="opacity-90">({upMat}🧱 + {upCred}¢)</span>
                  )}
                </button>
              )
            }
            // dread
            const dreadCost = {
              materials: applyEconomyModifiers(ECONOMY.upgradeCosts.cruiserToDread.materials, economyMods, 'materials'),
              credits: applyEconomyModifiers(ECONOMY.upgradeCosts.cruiserToDread.credits, economyMods, 'credits'),
            }
            const idx = firstIdx('cruiser')
            const haveCruiser = idx >= 0
            const milOk = (research.Military||1) >= 3
            const targetUsed = haveCruiser ? (tonnage.used + (FRAMES.dread.tonnage - fleet[idx].frame.tonnage)) : tonnage.used
            const capOk = targetUsed <= capacity.cap
            const canAfford = resources.credits >= dreadCost.credits && resources.materials >= dreadCost.materials
            const disabled = !(haveCruiser && milOk && capOk && canAfford)
            const btnText = (!milOk) ? 'Requires Military ≥ 3' : (!haveCruiser ? 'Requires Cruiser' : (!capOk ? 'Increase Capacity' : 'Upgrade to Dreadnought'))
            return (
              <button
                aria-label="Upgrade Cruiser to Dreadnought"
                onClick={()=>{ if (idx>=0) upgradeShip(idx) }}
                onMouseEnter={()=> setDockPreview(targetUsed)}
                onMouseLeave={()=> setDockPreview(null)}
                disabled={disabled}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${disabled? 'bg-zinc-800 opacity-60' : 'bg-fuchsia-700 hover:bg-fuchsia-600 active:scale-95'}`}
              >
                <span>{btnText}</span>
                {haveCruiser && milOk && capOk && (
                  <span className="opacity-90">({dreadCost.materials}🧱 + {dreadCost.credits}¢)</span>
                )}
              </button>
            )
          })()}
        </div>
          {/* Summary + blueprint + parts list. Capacity row follows this. */}
          <div className="mt-3">
            <BlueprintSummary ship={hasSelected ? focusedShip : emptyShip(selectedId)} />
            <div className={`mb-2 relative ${hasSelected? '' : 'opacity-70'}`}>
              {!hasSelected && (
                <span className="absolute -top-3 right-0 text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20">Preview</span>
              )}
              <ShipFrameSlots ship={hasSelected ? (focusedShip as Ship) : emptyShip(selectedId)} side='P' />
            </div>
            <div data-tutorial="blueprint-panel" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          {/* Capacity below blueprint */}
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div data-tutorial="capacity-info" className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div>Capacity: <b>{capacity.cap}</b> • Used: <b>{tonnage.used}</b></div>
                {/* + opens a minimal confirmation modal */}
                <button data-tutorial="expand-dock" onClick={()=>setShowCapModal(true)} disabled={dockDisabled} aria-label={`Expand Capacity — ${dockCost.materials}🧱 + ${dockCost.credits}¢`} className={`w-7 h-7 grid place-items-center rounded-full ${dockDisabled? 'bg-zinc-700 opacity-60' : 'bg-indigo-600 hover:bg-indigo-500'}`}>+</button>
              </div>
              <DockSlots used={tonnage.used} cap={capacity.cap} preview={dockPreview===null?undefined:dockPreview} />
            </div>
          </div>
        </div>
      </div>

      {/* Outpost: Reroll + Shop + Tech Upgrades */}
      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Shop side */}
          <div className="lg:col-span-2">
            <div className="flex gap-2 items-center flex-wrap mb-2">
              <button data-tutorial="reroll-button" data-testid="reroll-button" onClick={doReroll} disabled={resources.credits<rerollCost} className={`px-3 py-2 rounded-lg text-sm sm:text-base ${resources.credits>=rerollCost?'bg-purple-700 hover:bg-purple-600 active:scale-[.99]':'bg-zinc-700 opacity-60'}`}>Reroll ({rerollCost}¢)</button>
              <div className="text-[11px] sm:text-xs opacity-70">Reroll +{rrInc} after each Reroll/Research</div>
            </div>
            <div className="text-lg font-semibold mb-2">Outpost Inventory</div>
            <div data-tutorial="shop-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
              {shop.items.map((it:Part, i:number)=> {
                const price = applyEconomyModifiers((it.cost||0), economyMods, 'credits');
                const canAfford = resources.credits >= price;
                const gd = focusedShip? ghost(focusedShip, it) : null;
                return (
                  <div key={i} data-tutorial={`shop-item-${it.id}`}>
                    <ItemCard compact item={it} price={price} canAfford={canAfford} ghostDelta={gd} onBuy={()=>buyAndInstall(it)} />
                  </div>
                );
              })}
            </div>
          </div>
          {/* Tech Upgrades side */}
          <div>
            <div className="text-lg font-semibold mb-2">Tech</div>
            <div data-tutorial="research-grid" className="grid grid-cols-3 gap-2 text-sm">
              {tracks.map(t=> (
                <button key={t} onClick={()=>researchTrack(t)} disabled={!canResearch(t)} className={`px-3 py-2 rounded-xl leading-tight ${canResearch(t)?'bg-zinc-900 border border-zinc-700 hover:border-zinc-500':'bg-zinc-800 opacity-60'}`}>{researchLabel(t)}</button>
              ))}
            </div>
            <div className="mt-2">
              <button data-tutorial="help-tech" onClick={()=>setShowTech(true)} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-sm">Open Tech List</button>
            </div>
          </div>
        </div>
      </div>
      </div>


      {/* Start Combat */}
      <div className="fixed bottom-0 left-0 w-full z-10 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
      <div className="mx-auto max-w-5xl flex items-center gap-2">
          {(() => {
            const guards = mpGuards || undefined;
            const amReady = guards ? Boolean(guards.myReady) : Boolean(myReady);
            const opponentReady = guards ? Boolean(guards.oppReady) : Boolean(oppReady);
            const label = !amReady
              ? 'Start Combat'
              : (!opponentReady ? 'Waiting for opponent…' : 'Starting…');
            // Allow click even when already ready (toggles readiness in MP). Only block when fleet invalid.
            const disabled = !fleetValid;
            if (guards) {
              console.debug('[Outpost] MP guards', { ...guards, disabled, label });
            }
            const cls = disabled ? 'bg-zinc-700 opacity-60' : 'bg-emerald-600';
            return (
              <button data-tutorial="start-combat" onClick={()=> { try { console.debug('[outpost] start-combat click'); } catch { /* noop */ } startCombat() }} disabled={disabled} className={`flex-1 px-4 py-3 rounded-xl ${cls}`}>{label}</button>
            );
          })()}
          {myReady ? (
            <button onClick={()=> startCombat()} className="px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-sm">Cancel Ready</button>
          ) : null}
          {(!fleetValid && resources.credits<=0) ? (
            <>
              <div className="text-xs text-rose-300">Fleet inoperable and no credits</div>
              <button onClick={onRestart} className="px-2 py-1 rounded bg-rose-600 text-xs">{gameMode==='multiplayer' ? 'Resign' : 'Restart'}</button>
            </>
          ) : (
            <>
              {!fleet.every(s=>s.stats.valid) && <div className="text-xs text-rose-300">Fix fleet (Source + Drive + ⚡ OK)</div>}
              {tonnage.used > capacity.cap && <div className="text-xs text-rose-300">Over capacity — expand docks</div>}
            </>
          )}
        </div>
      </div>
      {/* Capacity confirm modal */}
      {showCapModal && (
        <div className="fixed inset-0 z-40 grid">
          <div className="bg-black/60" onClick={()=>setShowCapModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-zinc-900 border-t border-zinc-700 rounded-t-2xl p-3">
            <div className="text-sm mb-2">Expand capacity?</div>
            <div className="flex items-center gap-2 mb-3 text-sm opacity-90">+ {dockCost.materials}🧱 {dockCost.credits}¢</div>
            <div className="flex gap-2">
              <button onClick={()=>setShowCapModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800">Cancel</button>
              <button disabled={dockDisabled} onClick={()=>{ setShowCapModal(false); upgradeDock() }} className={`flex-1 px-3 py-2 rounded-lg ${dockDisabled? 'bg-zinc-700 opacity-60' : 'bg-indigo-600 hover:bg-indigo-500'}`}>Expand (+ {dockCost.materials}🧱 {dockCost.credits}¢)</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default OutpostPage
