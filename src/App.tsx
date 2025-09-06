import { useEffect, useMemo, useState } from "react";
import { PARTS, getFrame, makeShip, rollInventory, getSectorSpec } from './game'
import { INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_RESOURCES, INITIAL_CAPACITY, type Resources, type Research } from '../shared/defaults'
import type { PlayerState } from '../shared/mpTypes'
import { type CapacityState, type DifficultyId } from '../shared/types'
import { type FrameId } from './game'
import { ResourceBar } from './components/ui'
import { RulesModal, TechListModal, WinModal, MatchOverModal } from './components/modals'
import { setEconomyModifiers, type EconMods, getDefaultEconomyModifiers } from './game/economy'
import { setRareTechChance, doRerollActionWithMods, researchActionWithMods } from './game/shop'
import { applyBlueprintHints, mapBlueprintIdsToParts, seedFleetFromBlueprints } from './multiplayer/blueprintHints'
import StartPage from './pages/StartPage'
import { type FactionId } from '../shared/factions'
import OutpostPage from './pages/OutpostPage'
import CombatPage from './pages/CombatPage'
import { type Part, type DieFace } from '../shared/parts'
import { type Ship, type GhostDelta, type InitiativeEntry } from '../shared/types'
import { initNewRun, getOpponentFaction } from './game/setup'
import { getDefeatPolicy } from '../shared/difficulty'
import { buildInitiative as buildInitiativeCore, targetIndex as targetIndexCore, volley as volleyCore } from './game/combat'
import { generateEnemyFleetFor } from './game/enemy'
import { doRerollAction, researchAction } from './game/shop'
import { applyBlueprintToFleet as applyBpToFleet, canInstallOnClass as canInstallClass, updateBlueprint as updateBp } from './game/blueprints'
import { buildInterceptor as buildI, upgradeShipAt as upgradeAt, expandDock as expandD } from './game/hangar'
import { calcRewards, ensureGraceResources, graceRecoverFleet } from './game/rewards'
import { researchLabel as researchLabelCore, canResearch as canResearchCore, researchLabelWithMods, canResearchWithMods } from './game/research'
import { loadRunState, saveRunState, clearRunState, recordWin, restoreRunEnvironment, restoreOpponent, evaluateUnlocks } from './game/storage'
import { playEffect, playMusic } from './game/sound'
import MultiplayerStartPage from './pages/MultiplayerStartPage'
import { computePlaybackDelay } from './utils/playback'
import { RoomLobby } from './components/RoomLobby'
import type { Id } from '../convex/_generated/dataModel'
import { useMultiplayerGame } from './hooks/useMultiplayerGame'
// Lives now integrated into ResourceBar; banner removed

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
  // Lives system replaces old grace
  const inferStartingLives = (diff: DifficultyId | null, sv?: { livesRemaining?: number; graceUsed?: boolean }) => {
    if (sv?.livesRemaining != null) return sv.livesRemaining as number;
    if (sv?.graceUsed != null) return sv.graceUsed ? 0 : 1;
    if (!diff) return 0;
    return getDefeatPolicy(diff) === 'grace' ? 1 : 0;
  };
  const [livesRemaining, setLivesRemaining] = useState<number>(inferStartingLives(saved?.difficulty ?? null, saved ?? undefined));
  const [difficulty, setDifficulty] = useState<null|DifficultyId>(saved?.difficulty ?? null);
  const [faction, setFaction] = useState<FactionId>(saved?.faction ?? 'industrialists');
  const [opponent, setOpponent] = useState<FactionId>(saved?.opponent ?? 'warmongers');
  const [showNewRun, setShowNewRun] = useState(true);

  // Class blueprints (shared per hull class)
  const initialBlueprints: Record<FrameId, Part[]> = saved?.blueprints ?? {
    interceptor: [ ...INITIAL_BLUEPRINTS.interceptor ],
    cruiser: [ ...INITIAL_BLUEPRINTS.cruiser ],
    dread: [ ...INITIAL_BLUEPRINTS.dread ],
  };
  const [blueprints, setBlueprints] = useState<Record<FrameId, Part[]>>(initialBlueprints);

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
  const [matchOver, setMatchOver] = useState<{ winnerName: string } | null>(null);
  const [mpSeeded, setMpSeeded] = useState(false);
  const [mpSeedSubmitted, setMpSeedSubmitted] = useState(false);
  const [mpLastServerApplyRound, setMpLastServerApplyRound] = useState<number>(0);
  // Lobby handles faction selection before the first shop; Outpost no longer prompts per round

  // MP: Convert server ShipSnap to client Ship with synthetic parts that reflect stats
  type ShipSnapshot = {
    frame?: { id?: string };
    weapons?: { name?: string; dice?: number; dmgPerHit?: number; faces?: unknown[]; initLoss?: number }[];
    riftDice?: number;
    stats?: { init?: number; hullCap?: number; aim?: number; shieldTier?: number; regen?: number };
    hull?: number;
    alive?: boolean;
    parts?: unknown[];
    partIds?: string[];
  };
  function fromSnapshotToShip(snap: ShipSnapshot): Ship {
    const id = snap?.frame?.id;
    const frameId: FrameId = (id === 'interceptor' || id === 'cruiser' || id === 'dread') ? id : 'interceptor';
    const frame = getFrame(frameId);
    const base: Ship = {
      frame,
      parts: [],
      weapons: [],
      riftDice: snap?.riftDice || 0,
      stats: { init: snap?.stats?.init || 0, hullCap: snap?.stats?.hullCap || 1, powerUse: 0, powerProd: 0, valid: true, aim: snap?.stats?.aim || 0, shieldTier: snap?.stats?.shieldTier || 0, regen: snap?.stats?.regen || 0 },
      hull: Math.max(0, snap?.hull ?? (snap?.stats?.hullCap || 1)),
      alive: snap?.alive !== false,
    } as Ship;

    // If server provided full parts, prefer them; else map partIds to catalog parts
    const fullParts = Array.isArray(snap?.parts) ? (snap.parts as unknown[]) : [];
    const idList = Array.isArray(snap?.partIds) ? (snap.partIds as string[]) : [];
    const parts: Part[] = fullParts.length > 0
      ? (fullParts as Part[])
      : (idList.length > 0 ? idList.map(id => (PARTS.sources.find(p=>p.id===id) || PARTS.drives.find(p=>p.id===id) || PARTS.weapons.find(p=>p.id===id) || PARTS.computers.find(p=>p.id===id) || PARTS.shields.find(p=>p.id===id) || PARTS.hull.find(p=>p.id===id) || null)).filter((p): p is Part => Boolean(p)) : []);
    const st = base.stats;
    if (st.init > 0) parts.push({ id: `mp_drive_${st.init}`, name: 'Drive', init: st.init, powerCost: 0, tier: 1, cost: 0, cat: 'Drive', tech_category: 'Grid' });
    if (st.aim > 0) parts.push({ id: `mp_comp_${st.aim}`, name: 'Computer', aim: st.aim, powerCost: 0, tier: 1, cost: 0, cat: 'Computer', tech_category: 'Grid' });
    if (st.shieldTier > 0) parts.push({ id: `mp_shield_${st.shieldTier}`, name: 'Shield', shieldTier: st.shieldTier, powerCost: 0, tier: 1, cost: 0, cat: 'Shield', tech_category: 'Nano' });
    const extraHull = Math.max(0, (st.hullCap || 0) - (frame.baseHull || 0));
    if (extraHull > 0 || st.regen > 0) parts.push({ id: `mp_hull_${extraHull}_${st.regen||0}`, name: 'Hull', extraHull, regen: st.regen || 0, powerCost: 0, tier: 1, cost: 0, cat: 'Hull', tech_category: 'Nano' });
    const ws = Array.isArray(snap?.weapons) ? snap.weapons : [];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      parts.push({ id: `mp_w_${i}`, name: w.name || 'Weapon', dice: w.dice || 0, dmgPerHit: w.dmgPerHit || 0, faces: (w.faces as DieFace[] | undefined) || [], initLoss: w.initLoss || 0, powerCost: 0, tier: 1, cost: 0, cat: 'Weapon', tech_category: 'Nano' });
    }
    if (fullParts.length === 0 && idList.length === 0 && base.riftDice > 0) parts.push({ id: `mp_rift_${base.riftDice}`, name: 'Rift', riftDice: base.riftDice, faces: [] as DieFace[], powerCost: 0, tier: 1, cost: 0, cat: 'Weapon', tech_category: 'Nano' });
    // Ensure ships have at least one Source so class builds are deployable and upgrades can inherit a valid build.
    // We synthesize a zero-cost Source to satisfy validity in Outpost; combat does not use power accounting.
    const hasSource = parts.some(p => typeof p.powerProd === 'number');
    if (!hasSource) parts.unshift({ id: 'mp_source', name: 'Source', powerProd: 0, tier: 1, cost: 0, cat: 'Source', tech_category: 'Grid' });

    base.parts = parts;
    base.weapons = parts.filter(p => p.cat === 'Weapon');
    return base;
  }

  // Multiplayer state
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer'>('single');
  const [multiplayerPhase, setMultiplayerPhase] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);

  // Multiplayer data (available when in a room)
  const multi = useMultiplayerGame(currentRoomId);

  // ---------- Run management ----------
  function newRun(diff: DifficultyId, pick:FactionId){
    clearRunState();
    setDifficulty(diff);
    setFaction(pick);
    setShowNewRun(false);
    void playEffect('page');
    setEndless(false);
    setLivesRemaining(getDefeatPolicy(diff) === 'grace' ? 1 : 0);
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
  function resetRun(){ clearRunState(); setDifficulty(null); setShowNewRun(true); setEndless(false); setLivesRemaining(0); }

  function handleRoomJoined(roomId: string) {
    setCurrentRoomId(roomId as Id<"rooms">);
    setMultiplayerPhase('lobby');
    void playEffect('page');
  }

  function handleGameStart() {
    setMultiplayerPhase('game');
    void playEffect('page');
  }

  function handleLeaveRoom() {
    setCurrentRoomId(null);
    setMultiplayerPhase('menu');
    void playEffect('page');
  }

  function handleBackToMainMenu() {
    setGameMode('single');
    setMultiplayerPhase('menu');
    setCurrentRoomId(null);
    setShowNewRun(true);
    void playEffect('page');
  }

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

  // Helper to get current player's economy modifiers in multiplayer
  function getCurrentPlayerEconomyMods(): EconMods {
    if (gameMode !== 'multiplayer') {
      return getDefaultEconomyModifiers(); // Use defaults for single player
    }
    try {
      const myId = multi.getPlayerId?.() as string | null;
      const pStates = multi.gameState?.playerStates as Record<string, PlayerState> | undefined;
      const st = myId ? pStates?.[myId] : null;
      const econ = st?.economy;
      
      return {
        credits: econ?.creditMultiplier ?? 1,
        materials: econ?.materialMultiplier ?? 1,
      };
    } catch {
      return getDefaultEconomyModifiers();
    }
  }

  // ---------- Shop actions: reroll & research ----------
  function doReroll(){
    const economyMods = getCurrentPlayerEconomyMods();
    const res = gameMode === 'multiplayer' 
      ? doRerollActionWithMods(resources, rerollCost, research as Research, economyMods)
      : doRerollAction(resources, rerollCost, research as Research);
    if(!res || !res.ok) return;
    setResources(r=> ({...r, credits: r.credits + (res.delta.credits||0) }));
    setShop({ items: res.items });
    setRerollCost(x=> x + (res.nextRerollCostDelta||0));
    setShopVersion(v=> v+1);
    void playEffect('reroll');
  }
  function researchTrack(track:'Military'|'Grid'|'Nano'){
    const economyMods = getCurrentPlayerEconomyMods();
    const res = gameMode === 'multiplayer'
      ? researchActionWithMods(track, { credits: resources.credits, science: resources.science }, research as Research, economyMods)
      : researchAction(track, { credits: resources.credits, science: resources.science }, research as Research);
    if(!res || !res.ok) return;
    setResearch(t=>({ ...t, [track]: res.nextTier } as Research));
    setResources(r=>({ ...r, credits: r.credits + (res.delta.credits||0), science: r.science + (res.delta.science||0) }));
    setShop({ items: res.items });
    setRerollCost(x=> x + (res.nextRerollCostDelta||0));
    setShopVersion(v=> v+1);
    void playEffect('tech');
  }
  async function handleReturnFromCombat(){
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
      // Multiplayer: inform server and let phase return to outpost
      if (gameMode==='multiplayer' && multi) {
        try { await multi.restartToSetup?.(); } catch {/* ignore */}
      }
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
  function startFirstCombat(){ // tutorial fight vs one interceptor (unarmed to ensure quick victory)
    const enemy = [ makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]]) ];
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
      if(difficulty && (getDefeatPolicy(difficulty)==='reset' || livesRemaining<=0)) { setOutcome('Defeat — Run Over'); }
      else { setOutcome('Defeat — Life Lost'); setLivesRemaining(n=> Math.max(0, n-1)); }
      setLog(l=>[...l, '💀 Defeat']);
    }
    // Defer marking combat over by a tick so UI renders a 'Resolving…' state
    setTimeout(() => setCombatOver(true), 1);
    // Multiplayer: report result to server to decrement lives and transition
    if (gameMode === 'multiplayer' && multi) {
      try {
        const myId = multi.getPlayerId?.();
        const winnerId = pAlive ? (myId || '') : (multi.getOpponent()?.playerId || '');
        if (winnerId) {
          void multi.resolveCombatResult?.(winnerId);
        }
      } catch { /* ignore */ }
    }
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

  // Multiplayer: drive navigation by server game phase and stream fleet validity
  const fleetValid = fleet.every(s=>s.stats.valid) && tonnage.used <= capacity.cap;
  useEffect(() => {
    if (!multi) return;
    // Phase-based navigation
    const phase = multi.gameState?.gamePhase;
    if (phase === 'combat' && mode !== 'COMBAT') {
      if (gameMode === 'multiplayer') {
        console.debug('[Nav] Phase → combat');
        setMode('COMBAT');
        // Snapshot fleets from server for rendering
        try {
          const myId = multi.getPlayerId?.() as string | null;
          const opp = multi.getOpponent?.();
          const pStates = multi.gameState?.playerStates as Record<string, PlayerState> | undefined;
          const myFleet = myId ? pStates?.[myId]?.fleet : undefined;
          const oppFleet = opp ? pStates?.[opp.playerId]?.fleet : undefined;
          if (Array.isArray(myFleet)) {
            const snaps = myFleet as ShipSnapshot[];
            setFleet(snaps.map(fromSnapshotToShip) as unknown as Ship[]);
          }
          if (Array.isArray(oppFleet)) {
            const snaps = oppFleet as ShipSnapshot[];
            setEnemyFleet(snaps.map(fromSnapshotToShip) as unknown as Ship[]);
          }
        } catch { /* ignore visual sync errors */ }
        const lines = (multi.gameState?.roundLog as string[] | undefined) || ["Combat resolved."];
        setLog(l => [...l, ...lines]);
        // Slower playback pacing proportional to log size
        const delay = computePlaybackDelay(lines as string[]);
        setTimeout(() => { try { void multi.ackRoundPlayed?.(); } catch { /* noop */ } }, delay);
      } else {
        startCombat();
      }
    } else if (phase === 'setup' && mode !== 'OUTPOST') {
      console.debug('[Nav] Phase → setup');
      // Sync my starting config from server so research/resources/reroll and blueprints reflect faction
      try {
        if (gameMode === 'multiplayer') {
          const myId = multi.getPlayerId?.() as string | null;
          const pStates = multi.gameState?.playerStates as Record<string, PlayerState> | undefined;
          const st = myId ? pStates?.[myId] : null;
          const res = st?.resources;
          const mods = st?.modifiers;
          const bpIds = st?.blueprintIds;
          if (res && typeof res.credits === 'number') setResources(r => ({ ...r, ...res }));
          // All faction effect applications moved to sync effect to avoid race conditions
          // Blueprint application moved to sync effect to avoid race condition
          // Prefer server snapshot of my fleet for consistency across clients
          const serverFleet = Array.isArray(st?.fleet) ? (st.fleet as ShipSnapshot[]).map(fromSnapshotToShip) as unknown as Ship[] : [];
          const roundNum = (multi.gameState?.roundNum || 1) as number;
          if (serverFleet.length > 0) {
            setFleet(serverFleet);
            setCapacity(c => ({ cap: Math.max(c.cap, serverFleet.length) }));
            setFocused(0);
            setMpSeeded(true);
          } else if (!mpSeeded && roundNum === 1) {
            // Build initial fleet from faction-adjusted blueprints and starting frame
            const starting = Math.max(1, Number(multi.roomDetails?.room?.gameConfig?.startingShips) || 1);
            // startingFrame hint may be present in modifiers
            const sf = (mods?.startingFrame as FrameId | undefined) || 'interceptor';
            try {
              // Prefer ids from bpIds for the starting frame; fall back to blueprint hints for that frame
              const idsForFrame: string[] = Array.isArray(bpIds?.[sf]) && bpIds![sf].length>0
                ? (bpIds as Record<FrameId, string[]>)[sf]
                : ((mods?.blueprintHints as Record<string, string[]> | undefined)?.[sf] || []);
              let ships: Ship[];
              if (idsForFrame.length > 0) {
                ships = seedFleetFromBlueprints(sf, idsForFrame, starting) as unknown as Ship[];
              } else {
                // Fallback to initial blueprints for factions without custom blueprints  
                const initialBp = INITIAL_BLUEPRINTS[sf] || [];
                ships = Array.from({ length: starting }, () => makeShip(getFrame(sf), [ ...initialBp ])) as unknown as Ship[];
              }
              setFleet(ships);
              setCapacity(c => ({ cap: Math.max(c.cap, starting) }));
              setFocused(0);
              setMpSeeded(true);
              // Submit snapshot to server so both sides stay in sync
              try { void multi.submitFleetSnapshot?.(ships as unknown, fleetValid); } catch {/* ignore */}
            } catch {/* ignore */}
          }
          // Mode switching moved to sync effect after blueprint application
        }
      } catch { /* ignore */ }
    } else if (phase === 'finished') {
      console.debug('[Nav] Phase → finished');
      // Only show Match Over modal when room is truly finished
      if (gameMode === 'multiplayer' && multi.roomDetails?.room?.status === 'finished') {
        try {
          const winnerId = (multi.gameState?.matchResult as { winnerPlayerId?: string } | undefined)?.winnerPlayerId;
          const winnerName = (multi.roomDetails?.players as { playerId: string; playerName?: string }[] | undefined)?.find(p=>p.playerId===winnerId)?.playerName || 'Winner';
          setMatchOver({ winnerName });
        } catch { /* ignore */ }
      } else if (gameMode !== 'multiplayer') {
        setMultiplayerPhase('lobby');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi?.gameState?.gamePhase, multi?.roomDetails?.room?.status, multi?.roomDetails?.room?.gameConfig?.startingShips, multi?.gameState?.playerStates]);

  // Ensure client fleet stays in sync with server snapshot during setup even if mode is already OUTPOST
  useEffect(() => {
    if (gameMode !== 'multiplayer') return;
    if (multi.gameState?.gamePhase !== 'setup') return;
    try {
      const myId = multi.getPlayerId?.() as string | null;
      const st = myId ? (multi.gameState?.playerStates as Record<string, PlayerState> | undefined)?.[myId] : null;
      const serverFleet = Array.isArray(st?.fleet) ? (st.fleet as ShipSnapshot[]) : [];
      const roundNum = (multi.gameState?.roundNum || 1) as number;
      // Apply all faction effects from server
      const srvResearch = st?.research as Research | undefined;
      const econ = st?.economy;
      const mods = (st?.modifiers as { rareChance?: number; capacityCap?: number; blueprintHints?: Record<string,string[]> } | undefined);
      const bpIds = (st?.blueprintIds as Record<FrameId, string[]> | undefined);
      
      // Blueprint application
      let blueprintsApplied = false;
      if (bpIds && (bpIds.interceptor.length || bpIds.cruiser.length || bpIds.dread.length)) {
        const mapped = mapBlueprintIdsToParts(bpIds);
        try { console.debug('[MP] applied class blueprints from ids', { interceptor: mapped.interceptor.length, cruiser: mapped.cruiser.length, dread: mapped.dread.length }); } catch { /* noop */ }
        setBlueprints(mapped);
        blueprintsApplied = true;
      } else if (mods && mods.blueprintHints) {
        setBlueprints(prev => applyBlueprintHints(prev as Record<string, Part[]>, mods.blueprintHints as Record<string, string[]>));
        blueprintsApplied = true;
      }
      
      let factionsApplied = false;
      
      // Research state
      if (srvResearch && typeof srvResearch.Military === 'number') {
        setResearch({ ...srvResearch });
        factionsApplied = true;
      }
      
      // Economy effects
      if (econ && typeof econ.rerollBase === 'number') {
        setBaseRerollCost(econ.rerollBase);
        setRerollCost(econ.rerollBase);
        factionsApplied = true;
      }
      if (econ && (typeof econ.creditMultiplier === 'number' || typeof econ.materialMultiplier === 'number')) {
        setEconomyModifiers({ credits: econ.creditMultiplier ?? 1, materials: econ.materialMultiplier ?? 1 });
        factionsApplied = true;
      }
      
      // Modifier effects
      if (mods && typeof mods.rareChance === 'number') {
        setRareTechChance(mods.rareChance as number);
        factionsApplied = true;
      }
      if (mods && typeof mods.capacityCap === 'number') {
        setCapacity(c => ({ cap: Math.max(c.cap, mods.capacityCap as number) }));
        factionsApplied = true;
      }
      
      // Switch to Outpost mode after faction effects are applied (only during setup)
      const allFactionsApplied = blueprintsApplied || factionsApplied || (!bpIds && !mods?.blueprintHints && !srvResearch);
      if (multi.gameState?.gamePhase === 'setup' && mode !== 'OUTPOST' && allFactionsApplied) {
        setMode('OUTPOST');
      }
      if (serverFleet.length > 0) {
        const mapped = serverFleet.map(fromSnapshotToShip) as unknown as Ship[];
        // Only update if round advanced, or server has strictly more ships than we do
        if (roundNum !== mpLastServerApplyRound || mapped.length > fleet.length) {
          console.debug('[Sync] Applying server fleet snapshot in setup', { roundNum, prevRound: mpLastServerApplyRound, serverCount: mapped.length, localCount: fleet.length });
          setFleet(mapped);
          setCapacity(c => ({ cap: Math.max(c.cap, mapped.length) }));
          setFocused(0);
          setMpLastServerApplyRound(roundNum);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, multi?.gameState?.playerStates]);

  // One-time seed submit if server snapshot missing on round 1
  useEffect(() => {
    if (gameMode !== 'multiplayer') return;
    if (!multi || !multi.isConvexAvailable) return;
    if (multi.gameState?.gamePhase !== 'setup') return;
    try {
      const myId = multi.getPlayerId?.() as string | null;
      const st = myId ? (multi.gameState?.playerStates as Record<string, PlayerState> | undefined)?.[myId] : null;
      const serverFleet = Array.isArray(st?.fleet) ? (st.fleet as ShipSnapshot[]) : [];
      const roundNum = (multi.gameState?.roundNum || 1) as number;
      const starting = (multi.roomDetails?.room?.gameConfig?.startingShips as number | undefined) || 1;
      if (!mpSeedSubmitted && !mpSeeded && roundNum === 1 && serverFleet.length === 0) {
        const mods = (st?.modifiers as { startingFrame?: 'interceptor'|'cruiser'|'dread'; blueprintHints?: Record<string, string[]> } | undefined);
        const bpIds = (st?.blueprintIds as Record<FrameId, string[]> | undefined);
        const sf = (mods?.startingFrame as FrameId | undefined) || 'interceptor';
        const idsForFrame: string[] = Array.isArray(bpIds?.[sf]) && bpIds![sf].length>0
          ? (bpIds as Record<FrameId, string[]>)[sf]
          : ((mods?.blueprintHints as Record<string, string[]> | undefined)?.[sf] || []);
        let ships: Ship[];
        if (idsForFrame.length > 0) {
          ships = seedFleetFromBlueprints(sf, idsForFrame, Math.max(1, starting));
        } else {
          const bp = blueprints as Record<FrameId, Part[]>;
          ships = Array.from({ length: Math.max(1, starting) }, () => makeShip(getFrame(sf), [ ...(bp[sf] || []) ])) as unknown as Ship[];
        }
        setFleet(ships);
        setCapacity(c => ({ cap: Math.max(c.cap, ships.length) }));
        setFocused(0);
        setMpSeedSubmitted(true);
        try { void multi.submitFleetSnapshot?.(ships as unknown, true); } catch { /* noop */ }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, multi?.gameState?.playerStates, multi?.gameState?.roundNum]);

  useEffect(() => {
    // Avoid spamming validity; readiness will submit snapshots explicitly
  }, [fleetValid, mode, gameMode, currentRoomId]);

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
    const st = { difficulty, faction, opponent, resources, research, rerollCost, baseRerollCost, capacity, sector, blueprints, fleet, shop, livesRemaining };
    saveRunState(st);
    evaluateUnlocks(st);
  }, [difficulty, faction, opponent, resources, research, rerollCost, baseRerollCost, capacity, sector, blueprints, fleet, shop, livesRemaining]);
  function dismissRules(){ setShowRules(false); }

  // Self-tests moved to src/__tests__/runtime.selftests.spec.ts

  // ---------- View ----------

  function researchLabel(track:'Military'|'Grid'|'Nano'){ 
    const economyMods = getCurrentPlayerEconomyMods();
    return gameMode === 'multiplayer'
      ? researchLabelWithMods(track, research as Research, economyMods)
      : researchLabelCore(track, research as Research); 
  }
  function canResearch(track:'Military'|'Grid'|'Nano'){ 
    const economyMods = getCurrentPlayerEconomyMods();
    return gameMode === 'multiplayer'
      ? canResearchWithMods(track, research as Research, resources, economyMods)
      : canResearchCore(track, research as Research, resources); 
  }
  function upgradeLockInfo(ship:Ship|null|undefined){ if(!ship) return null; if(ship.frame.id==='interceptor'){ return { need: 2, next:'Cruiser' }; } if(ship.frame.id==='cruiser'){ return { need: 3, next:'Dreadnought' }; } return null; }

  // Main routing logic
  if (showNewRun && gameMode === 'single') {
    return <StartPage
      onNewRun={newRun}
      onContinue={()=>{ setShowNewRun(false); void playEffect('page'); }}
      onMultiplayer={()=>{ setGameMode('multiplayer'); setMultiplayerPhase('menu'); void playEffect('page'); }}
    />;
  }

  // Multiplayer routing
  if (gameMode === 'multiplayer') {
    if (multiplayerPhase === 'menu') {
      return <MultiplayerStartPage 
        onRoomJoined={handleRoomJoined}
        onBack={handleBackToMainMenu}
        currentFaction={faction as string}
      />;
    }
    
    if (multiplayerPhase === 'lobby' && currentRoomId) {
      return <RoomLobby
        roomId={currentRoomId}
        onGameStart={handleGameStart}
        onLeaveRoom={handleLeaveRoom}
      />;
    }
    if (multiplayerPhase !== 'game') {
      // Guard: Do not fall through to single-player views before the game starts
      return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 flex items-center justify-center">
          <div className="text-center text-zinc-400">Preparing multiplayer lobby…</div>
        </div>
      );
    }
    // multiplayerPhase === 'game' falls through to Outpost/Combat views below
  }

  return (
    <div className={`bg-zinc-950 min-h-screen text-zinc-100`}>
      {matchOver && (
        <MatchOverModal
          winnerName={matchOver.winnerName}
          onClose={() => {
            try { void (multi as { prepareRematch?: ()=>Promise<void> })?.prepareRematch?.(); } catch { /* noop */ }
            setMatchOver(null);
            // Reset local context so UI is clean when returning to lobby
            setMode('OUTPOST');
            setLog([]);
            setRoundNum(1);
            setTurnPtr(-1);
            setQueue([]);
            setCombatOver(false);
            setOutcome('');
            setMultiplayerPhase('lobby');
          }}
        />
      )}
      {/* Lives banner removed; lives integrated in ResourceBar below */}
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

      <ResourceBar
        {...resources}
        tonnage={tonnage}
        sector={sector}
        onReset={resetRun}
        lives={gameMode==='single' ? livesRemaining : (multi.roomDetails?.players?.find?.((p: { playerId:string; lives:number }) => p.playerId === multi.getCurrentPlayer?.()?.playerId)?.lives) ?? undefined}
        meName={gameMode==='multiplayer' ? (multi.getCurrentPlayer?.()?.playerName || 'You') as string : undefined}
        meFaction={gameMode==='multiplayer' ? (multi.getCurrentPlayer?.() as { faction?: string })?.faction as string : undefined}
        opponent={gameMode==='multiplayer' && (multi.getOpponent?.()) ? { name: (multi.getOpponent?.()?.playerName || 'Opponent') as string, lives: (multi.roomDetails?.players?.find?.((p: { playerId:string; lives:number }) => p.playerId === multi.getOpponent?.()?.playerId)?.lives) ?? 0 } : undefined}
        opponentFaction={gameMode==='multiplayer' ? (multi.getOpponent?.() as { faction?: string })?.faction as string : undefined}
        phase={gameMode==='multiplayer' ? multi.gameState?.gamePhase : undefined}
      />

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
          myReady={(() => { try { return !!multi.getCurrentPlayer?.()?.isReady; } catch { return false; } })()}
          oppReady={(() => { try { return !!multi.getOpponent?.()?.isReady; } catch { return false; } })()}
          startCombat={() => {
            if (gameMode === 'multiplayer') {
              try {
                const me = multi.getCurrentPlayer?.();
                const myReady = !!me?.isReady;
                console.debug('[UI] StartCombat clicked', { myReady, fleetValid, fleetCount: fleet.length, me });
                void multi.submitFleetSnapshot?.(fleet as unknown, fleetValid);
                void multi.updateFleetValidity?.(fleetValid);
                void multi.setReady?.(!myReady);
                console.debug('[UI] StartCombat dispatched', { toggledTo: !myReady });
              } catch (err) {
                console.error('[UI] StartCombat error', err);
              }
              return;
            }
            startCombat();
          }}
          onRestart={() => {
            if (gameMode === 'multiplayer') {
              try { void (multi as { restartToSetup?: ()=>Promise<void> })?.restartToSetup?.(); } catch { /* noop */ }
              return;
            }
            resetRun();
          }}
        />
      )}

      {/* Multiplayer: Outpost uses Start Combat only; no extra readiness bar */}

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

      {/* Faction picking handled in RoomLobby before first shop */}

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
