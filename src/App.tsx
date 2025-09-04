import { useEffect, useMemo, useState } from "react";
import './index.css'
import { PARTS, getFrame, makeShip, rollInventory, getSectorSpec } from './game'
import { INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_RESOURCES, INITIAL_CAPACITY, type Resources, type Research } from './config/defaults'
import { type CapacityState, type DifficultyId } from './config/types'
import { type FrameId } from './game'
import { ResourceBar } from './components/ui'
import { RulesModal, TechListModal, WinModal } from './components/modals'
import StartPage from './pages/StartPage'
import { type FactionId } from './config/factions'
import OutpostPage from './pages/OutpostPage'
import CombatPage from './pages/CombatPage'
import { type Part } from './config/parts'
import { type Ship, type GhostDelta, type InitiativeEntry } from './config/types'
import { initNewRun, getOpponentFaction } from './game/setup'
import { getDefeatPolicy } from './config/difficulty'
import { buildInitiative as buildInitiativeCore, targetIndex as targetIndexCore, volley as volleyCore } from './game/combat'
import { generateEnemyFleetFor } from './game/enemy'
import { doRerollAction, researchAction } from './game/shop'
import { applyBlueprintToFleet as applyBpToFleet, canInstallOnClass as canInstallClass, updateBlueprint as updateBp } from './game/blueprints'
import { buildInterceptor as buildI, upgradeShipAt as upgradeAt, expandDock as expandD } from './game/hangar'
import { calcRewards, ensureGraceResources, graceRecoverFleet } from './game/rewards'
import { researchLabel as researchLabelCore, canResearch as canResearchCore } from './game/research'
import { loadRunState, saveRunState, clearRunState, recordWin, restoreRunEnvironment, restoreOpponent, evaluateUnlocks } from './game/storage'
import { playEffect, playMusic } from './game/sound'

/**
 * Eclipse Roguelike — Integrated App (v3.24)
 * Mobile-first prototype with difficulty, tight economy, bosses.
 *
 * Fixes in v3.24
 * - Resolve "Cannot read properties of undefined (reading 'baseHull')" by:
 *   • Introducing INITIAL_* constants and lazy state initializers so no state depends on another state's runtime value during initialization.
 *   • Adding safe frame lookup via getFrame(id) to avoid undefined FRAMES[...] access if an unexpected id appears.
 *   • Keeping all ids consistent (interceptor | cruiser | dread).
 * - Added runtime self-tests for makeShip on all frames and safe lookups.
 */



// ------------------------------- Initial Config ----------------------------
// Defaults are now configured in src/config/defaults.ts

// ------------------------------- Integrated App ----------------------------
export default function EclipseIntegrated(){
  const saved = loadRunState();
  const [mode, setMode] = useState<'OUTPOST'|'COMBAT'>('OUTPOST');
  const [showRules, setShowRules] = useState(false);
  const [showTechs, setShowTechs] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [endless, setEndless] = useState(false);
  const [graceUsed, setGraceUsed] = useState(saved?.graceUsed ?? false);
  const [difficulty, setDifficulty] = useState<null|DifficultyId>(saved?.difficulty ?? null);
  const [faction, setFaction] = useState<FactionId>(saved?.faction ?? 'industrialists');
  const [opponent, setOpponent] = useState<FactionId>(saved?.opponent ?? 'warmongers');
  const [showNewRun, setShowNewRun] = useState(true);

  // Class blueprints (shared per hull class)
  const [blueprints, setBlueprints] = useState<Record<FrameId, Part[]>>(saved?.blueprints ?? {...INITIAL_BLUEPRINTS});

  // Resources & research
  const [resources, setResources] = useState<Resources>(saved?.resources ?? {...INITIAL_RESOURCES});
  const [research, setResearch] = useState<Research>(saved?.research ?? {...INITIAL_RESEARCH});

  // Economy knobs
  const [rerollCost, setRerollCost] = useState(() => saved?.rerollCost ?? 8);
  const [baseRerollCost, setBaseRerollCost] = useState(() => saved?.baseRerollCost ?? 8);

  // Capacity
  const [capacity, setCapacity] = useState<CapacityState>(saved?.capacity ?? { cap: INITIAL_CAPACITY.cap });

  // Fleet — lazy init so it doesn't depend on state variables
  const [fleet, setFleet] = useState<Ship[]>(() => (saved?.fleet ?? [ makeShip(getFrame('interceptor'), [ ...INITIAL_BLUEPRINTS.interceptor ]) ]) as unknown as Ship[]);
  const usedTonnage = useMemo(()=> fleet.reduce((a,s)=> a + (s.alive? s.frame.tonnage : 0), 0), [fleet]);
  const tonnage = { used: usedTonnage, cap: capacity.cap };

  // Shop state — lazy init based on INITIAL_RESEARCH or saved
  const [focused, setFocused] = useState(0);
  const [shop, setShop] = useState(()=> saved?.shop ?? { items: rollInventory(saved?.research ?? INITIAL_RESEARCH) });
  const [shopVersion, setShopVersion] = useState(0);

  // Combat state
  const [enemyFleet, setEnemyFleet] = useState<Ship[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [roundNum, setRoundNum] = useState(1);
  const [queue, setQueue] = useState<InitiativeEntry[]>([]);
  const [turnPtr, setTurnPtr] = useState(-1);
  const [combatOver, setCombatOver] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [rewardPaid, setRewardPaid] = useState(false);
  const [sector, setSector] = useState(saved?.sector ?? 1); // difficulty progression
  const [stepLock, setStepLock] = useState(false);

  // ---------- Run management ----------
  function newRun(diff: DifficultyId, pick:FactionId){
    clearRunState();
    setDifficulty(diff);
    setFaction(pick);
    setShowNewRun(false);
    void playEffect('page');
    setEndless(false);
    setGraceUsed(false);
    const st = initNewRun({ difficulty: diff, faction: pick });
    const opp = getOpponentFaction();
    setOpponent(opp as FactionId);
    setResources(st.resources);
    setCapacity(st.capacity);
    setResearch(st.research);
    setRerollCost(st.rerollCost);
    setBaseRerollCost(st.rerollCost);
    setSector(st.sector);
    setBlueprints(st.blueprints);
    setFleet(st.fleet as unknown as Ship[]);
    setFocused(0);
    setShop({ items: st.shopItems });
    startFirstCombat();
    setShowRules(true);
  }
  function resetRun(){ clearRunState(); setDifficulty(null); setShowNewRun(true); setEndless(false); setGraceUsed(false); }

  // ---------- Blueprint helpers ----------
  function applyBlueprintToFleet(frameId:FrameId, parts:Part[]){ setFleet(f=> applyBpToFleet(frameId, parts, f)); }
  function updateBlueprint(frameId:FrameId, mutate:(arr:Part[])=>Part[], allowInvalid:boolean = false){
    setBlueprints(bp => {
      const res = updateBp(bp as Record<FrameId,Part[]>, frameId, mutate, allowInvalid);
      if(!res.updated) return bp;
      applyBlueprintToFleet(frameId, res.blueprints[frameId]);
      return res.blueprints;
    });
  }
  function canInstallOnClass(frameId:FrameId, part:Part){ return canInstallClass(blueprints as Record<FrameId, Part[]>, frameId, part); }
  function ghost(ship:Ship, part:Part): GhostDelta {
    const frameId = ship.frame.id as FrameId;
    const chk = canInstallOnClass(frameId, part);
    const base = makeShip(ship.frame, blueprints[frameId]);
    const powerOk = !!chk.tmp.drive && chk.tmp.sources.length>0 && chk.tmp.stats.powerUse <= chk.tmp.stats.powerProd;
    const slotsUsed = chk.slotsUsed || ([...blueprints[frameId], part].reduce((a,p)=>a+(p.slots||1),0));
    const slotCap = chk.slotCap || getFrame(frameId).tiles;
    const slotOk = slotsUsed <= slotCap;
    return {
      targetName: ship.frame.name + " (class)",
      use: chk.tmp.stats.powerUse,
      prod: chk.tmp.stats.powerProd,
      valid: powerOk,
      slotsUsed,
      slotCap,
      slotOk,
      initBefore: base.stats.init,
      initAfter: chk.tmp.stats.init,
      initDelta: chk.tmp.stats.init - base.stats.init,
      hullBefore: base.stats.hullCap,
      hullAfter: chk.tmp.stats.hullCap,
      hullDelta: chk.tmp.stats.hullCap - base.stats.hullCap
    };
  }
  function buyAndInstall(part:Part){
    if(resources.credits < (part.cost||0)) return;
    const ship = fleet[focused];
    if(!ship) return;
    const frameId = ship.frame.id as FrameId;
    const chk = canInstallOnClass(frameId, part);
    if(!chk.ok) return;
    setResources(r=>({...r, credits: r.credits - (part.cost||0)}));
    updateBlueprint(frameId, arr => [...arr, part], true);
    if(!chk.tmp.stats.valid){
      console.warn('Ship will not participate in combat until power and drive requirements are met.');
    }
    void playEffect('equip');
  }
  function sellPart(frameId:FrameId, idx:number){
    const arr = blueprints[frameId];
    if(!arr) return;
    const part = arr[idx];
    if(!part) return;
    const next = arr.filter((_,i:number)=> i!==idx);
    const tmp = makeShip(getFrame(frameId), next);
    const refund = Math.floor((part.cost||0)*0.25);
    setResources(r=>({...r, credits: r.credits + refund }));
    updateBlueprint(frameId, () => next, true);
    if(!tmp.stats.valid){
      console.warn('Ship will not participate in combat until power and drive requirements are met.');
    }
  }

  // ---------- Capacity & build/upgrade ----------
  function buildShip(){ const res = buildI(blueprints as Record<FrameId, Part[]>, resources, tonnage.used, capacity); if(!res) return; setFleet(f=>[...f, res.ship]); setFocused(fleet.length); setResources(r=>({ ...r, credits: r.credits + res.delta.credits, materials: r.materials + res.delta.materials })); }
  function upgradeShip(idx:number){
    const res = upgradeAt(idx, fleet, blueprints as Record<FrameId, Part[]>, resources, { Military: research.Military||1 } as Research, capacity, tonnage.used);
    if(!res) return;
    setFleet(f => f.map((sh,i)=> i===idx? res.upgraded : sh));
    setBlueprints(res.blueprints);
    setResources(r=>({ ...r, credits: r.credits + res.delta.credits, materials: r.materials + res.delta.materials }));
  }
  function upgradeDock(){ const res = expandD(resources, capacity); if(!res) return; setCapacity({ cap: res.nextCap }); setResources(r=>({ ...r, credits: r.credits + res.delta.credits, materials: r.materials + res.delta.materials })); void playEffect('dock'); }

  // ---------- Shop actions: reroll & research ----------
  function doReroll(){
    const res = doRerollAction(resources, rerollCost, research as Research);
    if(!res || !res.ok) return;
    setResources(r=> ({...r, credits: r.credits + (res.delta.credits||0) }));
    setShop({ items: res.items });
    setRerollCost(x=> x + (res.nextRerollCostDelta||0));
    setShopVersion(v=> v+1);
    void playEffect('reroll');
  }
  function researchTrack(track:'Military'|'Grid'|'Nano'){
    const res = researchAction(track, { credits: resources.credits, science: resources.science }, research as Research);
    if(!res || !res.ok) return;
    setResearch(t=>({ ...t, [track]: res.nextTier } as Research));
    setResources(r=>({ ...r, credits: r.credits + (res.delta.credits||0), science: r.science + (res.delta.science||0) }));
    setShop({ items: res.items });
    setRerollCost(x=> x + (res.nextRerollCostDelta||0));
    setShopVersion(v=> v+1);
    void playEffect('tech');
  }
  function handleReturnFromCombat(){
    if(!combatOver) return;
    if(outcome==='Victory'){
      const wonFleet = [...fleet];
      restoreAndCullFleetAfterCombat();
      if(sector>10){
        recordWin(faction, difficulty as DifficultyId, research as Research, wonFleet);
        clearRunState();
        if(endless){
          void playEffect('page');
          setMode('OUTPOST');
          setShop({ items: rollInventory(research as Research) });
          setShopVersion(v=> v+1);
        } else {
          void playEffect('page');
          setMode('OUTPOST');
          setShowWin(true);
        }
      } else {
        void playEffect('page');
        setMode('OUTPOST');
        setShop({ items: rollInventory(research as Research) });
        setShopVersion(v=> v+1);
      }
    } else {
      if(outcome==='Defeat — Run Over'){
        void playEffect('page');
        resetRun();
      } else {
        setFleet(graceRecoverFleet(fleet, blueprints as Record<FrameId, Part[]>));
        const rw = calcRewards(enemyFleet, sector);
        setResources(r=> ensureGraceResources({
          credits: r.credits + rw.c,
          materials: r.materials + rw.m,
          science: r.science + rw.s
        }));
        void playEffect('page');
        setMode('OUTPOST');
        setShop({ items: rollInventory(research as Research) });
        setShopVersion(v=> v+1);
      }
    }
    setRerollCost(baseRerollCost);
  }


  // ---------- Enemy Generation ----------
  function genEnemyFleet(){ return generateEnemyFleetFor(sector); }

  // ---------- Combat helpers ----------
  function buildInitiative(pFleet:Ship[], eFleet:Ship[]){ return buildInitiativeCore(pFleet, eFleet) as InitiativeEntry[]; }
  function targetIndex(defFleet:Ship[], strategy:'kill'|'guns'){ return targetIndexCore(defFleet, strategy); }
  function volley(attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], friends:Ship[]){ return volleyCore(attacker, defender, side, logArr, friends); }

  function startCombat(){ const spec = getSectorSpec(sector); const enemy = genEnemyFleet(); setEnemyFleet(enemy); setLog([`Sector ${sector}: Engagement begins — enemy tonnage ${spec.enemyTonnage}`]); setRoundNum(1); setQueue([]); setTurnPtr(-1); setCombatOver(false); setOutcome(''); setRewardPaid(false); void playEffect('page'); void playEffect('startCombat'); setMode('COMBAT'); }
  function startFirstCombat(){ // tutorial fight vs one interceptor
    const enemy = [ makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0]]) ];
    setEnemyFleet(enemy);
    setLog([`Sector ${sector}: Skirmish — a lone Interceptor approaches.`]);
    setRoundNum(1); setQueue([]); setTurnPtr(-1); setCombatOver(false); setOutcome(''); setRewardPaid(false); void playEffect('page'); void playEffect('startCombat'); setMode('COMBAT');
  }
  function initRoundIfNeeded(){ if (turnPtr === -1 || turnPtr >= queue.length) { const q = buildInitiative(fleet, enemyFleet); setQueue(q); setTurnPtr(0); setLog(l => [...l, `— Round ${roundNum} —`]); return true; } return false; }
  function resolveCombat(pAlive:boolean){
    if(pAlive){
      if(!rewardPaid){ const rw = calcRewards(enemyFleet, sector); setResources(r=>({...r, credits: r.credits + rw.c, materials: r.materials + rw.m, science: r.science + rw.s })); setRewardPaid(true); setLog(l=>[...l, `✅ Victory — +${rw.c}¢, +${rw.m}🧱, +${rw.s}🔬`]); }
      setOutcome('Victory'); setSector(s=> s+1); setRerollCost(baseRerollCost);
    } else {
      if(difficulty && (getDefeatPolicy(difficulty)==='reset' || graceUsed)) { setOutcome('Defeat — Run Over'); }
      else { setOutcome('Defeat — Grace'); setGraceUsed(true); }
      setLog(l=>[...l, '💀 Defeat']);
    }
    setCombatOver(true);
  }
  async function stepTurn(){ if(combatOver || stepLock || showRules) return; setStepLock(true); try { const pAlive = fleet.some(s => s.alive && s.stats.valid); const eAlive = enemyFleet.some(s => s.alive && s.stats.valid); if (!pAlive || !eAlive) { resolveCombat(pAlive); return; } if (initRoundIfNeeded()) return; const e = queue[turnPtr]; const isP = e.side==='P'; const atk = isP ? fleet[e.idx] : enemyFleet[e.idx]; const defFleet = isP ? enemyFleet : fleet; const friends = isP ? fleet : enemyFleet; const strategy = isP ? 'guns' : 'kill'; const defIdx = targetIndex(defFleet, strategy); if (!atk || !atk.alive || !atk.stats.valid || defIdx === -1) { advancePtr(); return; } const lines:string[] = []; const def = defFleet[defIdx]; volley(atk, def, e.side, lines, friends); setLog(l=>[...l, ...lines]); if (isP) { setEnemyFleet([...defFleet]); setFleet([...friends]); } else { setFleet([...defFleet]); setEnemyFleet([...friends]); } if(atk.weapons.length>0 || atk.riftDice>0){ const dur = import.meta.env.MODE==='test' ? 0 : Math.max(100, 1000 - (roundNum - 1) * 200); await playEffect('shot', dur); if(!def.alive){ await playEffect('explosion', dur); } } advancePtr(); } finally { setStepLock(false); } }
  function advancePtr(){ const np = turnPtr + 1; setTurnPtr(np); if (np >= queue.length) endRound(); }
  function endRound(){ const pAlive = fleet.some(s => s.alive && s.stats.valid); const eAlive = enemyFleet.some(s => s.alive && s.stats.valid); if (!pAlive || !eAlive) { resolveCombat(pAlive); return; } setRoundNum(n=>n+1); setTurnPtr(-1); setQueue([]); }
  function restoreAndCullFleetAfterCombat(){ setFleet(f => f.filter(s => s.alive).map(s => ({...s, hull: s.stats.hullCap}))); setFocused(0); }

  // Auto-step loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(mode!=='COMBAT' || combatOver || stepLock || showRules) return; let cancelled=false; const tick = async()=>{ if(cancelled) return; await stepTurn(); if(cancelled) return; setTimeout(tick, 100); }; tick(); return ()=>{ cancelled=true; }; }, [mode, combatOver, stepLock, showRules, queue, turnPtr, fleet, enemyFleet]);

  // Restore environment if loading from save
  useEffect(()=>{
    if(saved){
      restoreRunEnvironment(saved.faction);
      restoreOpponent(saved.opponent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep shop items in sync when explicit rerolls happen or research changes
  useEffect(()=>{ setShop({ items: rollInventory(research as Research) }); }, [shopVersion, research]);

  // First-visit rules & new-run modal
  useEffect(()=>{
    if(difficulty==null) setShowNewRun(true);
  },[difficulty]);

  useEffect(()=>{
    if(combatOver && outcome.startsWith('Defeat')){ playMusic('lost'); return; }
    if(showNewRun || mode==='COMBAT'){ playMusic('combat'); }
    else { playMusic('shop'); }
  }, [showNewRun, mode, combatOver, outcome]);

  // Persist run state
  useEffect(()=>{
    if(!difficulty) return;
    const st = { difficulty, faction, opponent, resources, research, rerollCost, baseRerollCost, capacity, sector, blueprints, fleet, shop, graceUsed };
    saveRunState(st);
    evaluateUnlocks(st);
  }, [difficulty, faction, opponent, resources, research, rerollCost, baseRerollCost, capacity, sector, blueprints, fleet, shop, graceUsed]);
  function dismissRules(){ setShowRules(false); }

  // Self-tests moved to src/__tests__/runtime.selftests.spec.ts

  // ---------- View ----------
  const fleetValid = fleet.every(s=>s.stats.valid) && tonnage.used <= capacity.cap;

  function researchLabel(track:'Military'|'Grid'|'Nano'){ return researchLabelCore(track, research as Research); }
  function canResearch(track:'Military'|'Grid'|'Nano'){ return canResearchCore(track, research as Research, resources); }
  function upgradeLockInfo(ship:Ship|null|undefined){ if(!ship) return null; if(ship.frame.id==='interceptor'){ return { need: 2, next:'Cruiser' }; } if(ship.frame.id==='cruiser'){ return { need: 3, next:'Dreadnought' }; } return null; }

  if (showNewRun) {
    return <StartPage onNewRun={newRun} onContinue={()=>{ setShowNewRun(false); void playEffect('page'); }} />;
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100">
      {/* Rules Modal */}
      {showRules && (
        <RulesModal onDismiss={dismissRules} />
      )}

      {/* Tech List Modal */}
      {showTechs && (
        <TechListModal research={research as Research} onClose={()=>setShowTechs(false)} />
      )}

      {/* Win Modal */}
      {showWin && (
        <WinModal onRestart={()=>{ setShowWin(false); resetRun(); }} onEndless={()=>{ setShowWin(false); setEndless(true); }} />
      )}

      <ResourceBar {...resources} tonnage={tonnage} sector={sector} onReset={resetRun} />

      {mode==='OUTPOST' && (
        <OutpostPage
          resources={resources}
          rerollCost={rerollCost}
          doReroll={doReroll}
          research={research}
          researchLabel={researchLabel}
          canResearch={canResearch}
          researchTrack={researchTrack}
          fleet={fleet}
          focused={focused}
          setFocused={setFocused}
          buildShip={buildShip}
          upgradeShip={upgradeShip}
          upgradeDock={upgradeDock}
          upgradeLockInfo={upgradeLockInfo}
          blueprints={blueprints}
          sellPart={sellPart}
          shop={shop}
          ghost={ghost}
          buyAndInstall={buyAndInstall}
          capacity={capacity}
          tonnage={tonnage}
          sector={sector}
          endless={endless}
          fleetValid={fleetValid}
          startCombat={startCombat}
          onRestart={resetRun}
        />
      )}

      {mode==='COMBAT' && (
        <CombatPage
          combatOver={combatOver}
          outcome={outcome}
          roundNum={roundNum}
          queue={queue}
          turnPtr={turnPtr}
          fleet={fleet}
          enemyFleet={enemyFleet}
          log={log}
          onReturn={handleReturnFromCombat}
        />
      )}

      {/* Floating utility buttons */}
      <div className="fixed bottom-3 right-3 z-40 flex flex-col gap-2">
        <div className="hidden sm:flex flex-col gap-2">
          <button onClick={()=>setShowTechs(true)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">🔬 Tech</button>
          <button onClick={()=>setShowRules(true)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓ Rules</button>
        </div>
        <div className="sm:hidden">
          {showHelpMenu ? (
            <div className="flex flex-col gap-2">
              <button onClick={()=>{ setShowTechs(true); setShowHelpMenu(false); }} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">🔬 Tech</button>
              <button onClick={()=>{ setShowRules(true); setShowHelpMenu(false); }} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓ Rules</button>
              <button onClick={()=>setShowHelpMenu(false)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">✖</button>
            </div>
          ) : (
            <button onClick={()=>setShowHelpMenu(true)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓</button>
          )}
        </div>
      </div>
    </div>
  );
}
