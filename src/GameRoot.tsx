import { useEffect, useMemo, useState } from "react";
import { getFrame, makeShip, rollInventory } from './game'
import { INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_RESOURCES, INITIAL_CAPACITY, type Resources, type Research } from '../shared/defaults'
// PlayerState imported where needed in selectors/hooks
import { type CapacityState, type DifficultyId } from '../shared/types'
import { type FrameId } from './game'
import { ResourceBar } from './components/ui'
import { RulesModal, TechListModal, WinModal, MatchOverModal } from './components/modals'
import { getEconomyModifiers } from './game/economy'
// blueprint seeding handled in hooks
import StartPage from './pages/StartPage'
import { type FactionId } from '../shared/factions'
import OutpostPage from './pages/OutpostPage'
import CombatPage from './pages/CombatPage'
import { type Part } from '../shared/parts'
import { type Ship, type GhostDelta, type InitiativeEntry } from '../shared/types'
// run init handled in useRunManagement
import { getStartingLives } from '../shared/difficulty'
// combat primitives used inside useCombatLoop
// enemy generation handled by useCombatLoop
// shop reroll/research now routed via engine commands
//
import { selectTonnage, isFleetValid } from './selectors'
import { selectFleetValidity } from './selectors/guards'
import { ghostClassDelta } from './selectors/ghost'
import { OutpostIntents } from './adapters/outpostAdapter'
import type { OutpostEffects as EngineOutpostEffects } from './engine/commands'
// moved snapshot mapping into useMpPhaseNav
// rewards handled by useRunLifecycle
import { makeResearchLabel, makeCanResearch } from './selectors/researchUi'
import { upgradeLockInfo as selectUpgradeLockInfo } from './selectors/upgrade'
import { loadRunState, saveRunState, clearRunState, recordWin, restoreRunEnvironment, restoreOpponent, evaluateUnlocks } from './game/storage'
import { playEffect, playMusic } from './game/sound'
import MultiplayerStartPage from './pages/MultiplayerStartPage'
// computePlaybackDelay used in useMpPhaseNav
import { RoomLobby } from '../components/RoomLobby'
import type { Id } from '../convex/_generated/dataModel'
import { useMultiplayerGame } from './hooks/useMultiplayerGame'
import { useMpTestTick, useMpSetupSync } from './hooks/useMpSync'
import { useMpSeedSubmit } from './hooks/useMpSeedSubmit'
import { useRunManagement } from './hooks/useRunManagement'
import { getMyEconomyMods, getMyResources } from './adapters/mpSelectors'
import { useEffectsRunner, type EffectSink } from './hooks/useEffectsRunner'
import { useOutpostHandlers } from './hooks/useOutpostHandlers'
import { useMpPhaseNav } from './hooks/useMpPhaseNav'
import { useRunLifecycle } from './hooks/useRunLifecycle'
import { useCombatLoop } from './hooks/useCombatLoop'
import { useResourceBarVm } from './hooks/useResourceBarVm'
import { useOutpostPageProps } from './hooks/useOutpostPageProps'
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
  const [lastEffects, setLastEffects] = useState<EngineOutpostEffects | undefined>(undefined);
  const [showRules, setShowRules] = useState(false);
  const [showTechs, setShowTechs] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [endless, setEndless] = useState(false);
  // Lives system replaces old grace
  const inferStartingLives = (diff: DifficultyId | null, sv?: { livesRemaining?: number; graceUsed?: boolean }) => {
    if (sv?.livesRemaining != null) return sv.livesRemaining as number;
    // Backward compatibility with older saves that stored graceUsed
    if (sv?.graceUsed != null) return sv.graceUsed ? 0 : 1;
    if (!diff) return 0;
    return getStartingLives(diff);
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
  const tonnage = useMemo(() => selectTonnage(fleet as unknown as Ship[], capacity), [fleet, capacity]);

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
  // reward paid state now internal to useCombatLoop/useRunLifecycle flows
  const [sector, setSector] = useState(saved?.sector ?? 1); // difficulty progression
  const [stepLock] = useState(false);
  const [matchOver, setMatchOver] = useState<{ winnerName: string } | null>(null);
  const [mpSeeded, setMpSeeded] = useState(false);
  const [mpSeedSubmitted, setMpSeedSubmitted] = useState(false);
  const [mpServerSnapshotApplied, setMpServerSnapshotApplied] = useState(false);
  // Legacy flag no longer used; reroll now initializes per-setup round via mpRerollInitRound
  // const [mpRerollInitialized, setMpRerollInitialized] = useState(false);
  // Track the round for which we last initialized reroll in MP so we can reset per-setup round
  const [mpRerollInitRound, setMpRerollInitRound] = useState<number>(0);
  const [mpLastServerApplyRound, setMpLastServerApplyRound] = useState<number>(0);
  // Lobby handles faction selection before the first shop; Outpost no longer prompts per round

  // MP ShipSnapshot conversion now lives in src/multiplayer/snapshot.ts

  // Multiplayer state
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer'>('single');
  const [multiplayerPhase, setMultiplayerPhase] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);

  // Multiplayer data (available when in a room)
  const multi = useMultiplayerGame(currentRoomId);
  // Test-only tick to pick up external mock mutations when Convex is not driving reactivity
  const testTick = useMpTestTick(multi, mpServerSnapshotApplied)

  // Bridge for passing startFirstCombat to useRunManagement before combat hook initializes
  const startFirstCombatRef = { current: (()=>{}) as () => void };
  // ---------- Run management ----------
  const { newRun, resetRun } = useRunManagement({
    setDifficulty, setFaction, setOpponent: (f)=>setOpponent(f as FactionId), setShowNewRun, playEffect: (k)=>{ void playEffect(k as 'page'|'startCombat'|'equip'|'reroll'|'dock'|'faction'|'tech') }, setEndless, setLivesRemaining,
    setResources, setCapacity, setResearch, setRerollCost, setBaseRerollCost, setSector, setBlueprints: (bp)=>setBlueprints(bp as Record<FrameId, Part[]>), setFleet: (f)=>setFleet(f as unknown as Ship[]), setFocused, setShop, startFirstCombat: ()=> startFirstCombatRef.current(), clearRunState, setShowRules,
  })

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
  // expose only ghost; class check used inside ghost and elsewhere via controllers
  function ghost(ship:Ship, part:Part): GhostDelta { return ghostClassDelta(blueprints as Record<FrameId, Part[]>, ship, part) }
  // ---------- Outpost actions via engine handlers ----------
  const outpostHandlers = useOutpostHandlers({
    gameMode,
    economyMods: gameMode==='multiplayer' ? getMyEconomyMods(multi) : getEconomyModifiers(),
    state: {
      resources: (gameMode==='multiplayer' ? getMyResources(multi, resources as Resources) : resources) as Resources,
      research: research as Research,
      blueprints: blueprints as Record<FrameId, Part[]>,
      fleet: fleet as unknown as Ship[],
      capacity,
      tonnageUsed: tonnage.used,
      focusedIndex: focused,
      rerollCost,
      shopVersion,
    },
    setters: {
      setResources,
      setResearch: (r)=> setResearch(r as Research),
      setBlueprints: (bp)=> setBlueprints(bp as Record<FrameId, Part[]>),
      setFleet: (s)=> setFleet(s as unknown as Ship[]),
      setCapacity,
      setFocused,
      setRerollCost,
      setShopVersion,
      setShop,
      setLastEffects,
    },
    multi: gameMode==='multiplayer' ? (multi as unknown as { updateGameState?: (arg: { updates: { research: Research; resources: { credits:number; materials:number; science:number } } })=>unknown }) : undefined,
    sound: (k)=> { void playEffect(k) },
  })
  function applyOutpost(cmd: ReturnType<typeof OutpostIntents[keyof typeof OutpostIntents]>){
    return outpostHandlers.apply(cmd)
  }
  function buyAndInstall(part:Part){ outpostHandlers.buyAndInstall(part) }
  function sellPart(frameId:FrameId, idx:number){ outpostHandlers.sellPart(frameId, idx) }
  function buildShip(){ outpostHandlers.buildShip() }
  function upgradeShip(idx:number){ outpostHandlers.upgradeShip(idx) }
  function upgradeDock(){ outpostHandlers.upgradeDock() }

  // Economy/resources helpers moved to adapters/mpSelectors

  // ---------- Shop actions: reroll & research ----------
  function doReroll(){ outpostHandlers.reroll() }
  async function researchTrack(track:'Military'|'Grid'|'Nano'){ outpostHandlers.research(track) }
  const handleReturnFromCombat = useRunLifecycle({
    outcome,
    combatOver,
    livesRemaining,
    gameMode,
    endless,
    baseRerollCost,
    fns: { resetRun, recordWin, clearRunState },
    sfx: { playEffect: (k: string) => playEffect(k as 'page'|'startCombat'|'equip'|'reroll'|'dock'|'faction'|'tech') },
    getters: {
      sector: ()=>sector,
      enemyFleet: ()=>enemyFleet,
      research: ()=>research as Research,
      fleet: ()=>fleet,
      blueprints: ()=>blueprints as Record<FrameId, Part[]>,
      capacity: ()=>capacity,
      faction: ()=>faction,
      difficulty: ()=> (difficulty as DifficultyId),
    },
    setters: { setMode, setResources, setShop, setShopVersion, setRerollCost, setFleet, setLog, setShowWin, setEndless, setBaseRerollCost },
    multi,
  })


  // ---------- Enemy Generation ----------
  // enemy generation handled in useCombatLoop

  const combat = useCombatLoop({
    getters: {
      sector: ()=>sector,
      fleet: ()=>fleet,
      enemyFleet: ()=>enemyFleet,
      roundNum: ()=>roundNum,
      turnPtr: ()=>turnPtr,
      combatOver: ()=>combatOver,
      showRules: ()=>showRules,
    },
    setters: {
      setEnemyFleet: (f)=>setEnemyFleet(f),
      setLog,
      setRoundNum,
      setQueue,
      setTurnPtr,
      setCombatOver,
      setOutcome,
      setMode,
    },
    sfx: { playEffect },
  })
  // Now that combat hook is ready, wire the ref
  startFirstCombatRef.current = combat.startFirstCombat
  // Centralize engine/adapters effects handling
  useEffectsRunner(lastEffects, {
    warn: (code) => {
      if (code === 'invalid-power-or-drive') {
        console.warn('Ship will not participate in combat until power and drive requirements are met.');
      } else {
        console.warn(`[warning] ${code}`)
      }
    },
    startCombat: combat.startCombat,
    shopItems: (items) => setShop({ items }),
  } as EffectSink)
  async function stepTurn(){ await combat.stepTurn() }
  // moved cull logic into useRunLifecycle

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
  // Local validity (parts/power + capacity)
  const localFleetValid = isFleetValid(fleet as unknown as Ship[], capacity);
  // In multiplayer setup, also respect the server's view of validity if present
  const serverFleetValid: boolean | null = (() => {
    try {
      if (gameMode !== 'multiplayer') return null;
      const myId = multi.getPlayerId?.() as string | null;
      const st = myId ? (multi.gameState?.playerStates as Record<string, { fleetValid?: boolean; fleet?: unknown[] }> | undefined)?.[myId] : undefined;
      if (import.meta.env.DEV) {
        const stObj = st as unknown as Record<string, unknown> | null;
        console.debug('[Guards] server flag raw', { myId, raw: st?.fleetValid, snap: Array.isArray(st?.fleet) ? (st?.fleet as unknown[]).length : 0, keys: stObj ? Object.keys(stObj) : [] });
      }
      // During setup, treat missing server flag as false to prevent premature readiness.
      const inSetup = multi.gameState?.gamePhase === 'setup';
      if (inSetup) return st?.fleetValid === true;
      return typeof st?.fleetValid === 'boolean' ? st.fleetValid : null;
    } catch { return null; }
  })();
  const fleetValid = selectFleetValidity(localFleetValid, serverFleetValid);

  // Log validity combination for staging/prod debugging
  if (gameMode === 'multiplayer') {
    try { console.debug('[Guards] valid', { localFleetValid, serverFleetValid, fleetValid }); } catch { /* noop */ }
  }
  useMpPhaseNav({
    gameMode,
    multi,
    setters: {
      setMode,
      setFleet: (f)=> setFleet(f as unknown as Ship[]),
      setEnemyFleet: (f)=> setEnemyFleet(f as unknown as Ship[]),
      setMultiplayerPhase,
      setLog,
    },
  })

  // Multiplayer setup-phase sync (extracted hook)
  useMpSetupSync({
    gameMode,
    multi,
    deps: { testTick },
    vars: { baseRerollCost, rerollCost, mpRerollInitRound, mpLastServerApplyRound, mode, blueprints, fleet },
    setters: {
      setMode,
      setBlueprints: (bp) => setBlueprints(bp as Record<FrameId, Part[]>),
      setResearch: (r) => setResearch(r as Research),
      setBaseRerollCost,
      setRerollCost,
      setCapacity,
      setFleet: (s) => setFleet(s as unknown as Ship[]),
      setFocused,
      setMpLastServerApplyRound,
      setMpServerSnapshotApplied,
    },
  })

  // One-time seed submit if server snapshot missing on round 1
  useMpSeedSubmit({
    gameMode,
    multi,
    mpServerSnapshotApplied,
    mpSeedSubmitted,
    mpSeeded,
    setMpSeedSubmitted,
    setMpSeeded,
    setFleet: (s)=>setFleet(s as unknown as Ship[]),
    setCapacity,
    setFocused,
    blueprints: blueprints as Record<FrameId, Part[]>,
    fleetValid: true,
  })

  useEffect(() => {
    // Avoid spamming validity; readiness will submit snapshots explicitly
  }, [fleetValid, mode, gameMode, currentRoomId]);

  // Multiplayer capacity is set by server modifiers when available

  // Shop updates now flow via engine effects (useEffectsRunner) and immediate set in handlers

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

  const researchLabel = makeResearchLabel(gameMode, research as Research, multi)
  const canResearch = makeCanResearch(gameMode, research as Research, resources as Resources, multi)
  const upgradeLockInfo = (ship:Ship|null|undefined) => selectUpgradeLockInfo(ship)

  // View Models (must be called before any conditional returns)
  const rbVm = useResourceBarVm({ resources: resources as Resources, tonnage, sector, onReset: resetRun, gameMode, singleLives: livesRemaining, multi })
  const outpostProps = useOutpostPageProps({
    gameMode,
    resources: resources as Resources,
    research: research as Research,
    blueprints: blueprints as Record<FrameId, Part[]>,
    fleet: fleet as unknown as Ship[],
    capacity,
    tonnage,
    shop,
    focused,
    setFocused,
    rerollCost,
    researchLabel,
    canResearch,
    researchTrack,
    buildShip,
    upgradeShip,
    upgradeDock,
    ghost: ghost as unknown as (s: Ship, p: Part) => { use:number; prod:number; valid:boolean; slotsUsed:number; slotCap:number; slotOk:boolean; targetName:string; initBefore:number; initAfter:number; initDelta:number; hullBefore:number; hullAfter:number; hullDelta:number },
    sellPart: (fid: FrameId, idx: number) => sellPart(fid, idx),
    buyAndInstall,
    sector,
    endless,
    multi,
    spStartCombat: () => applyOutpost(OutpostIntents.startCombat()),
    resetRun,
    setBlueprints: (bp)=> setBlueprints(bp as Record<FrameId, Part[]>),
    setResources,
    setResearch: (r)=> setResearch(r as Research),
    setCapacity,
    setRerollCost,
    setBaseRerollCost,
    setMpSeeded,
    setMpSeedSubmitted,
    setMpServerSnapshotApplied,
    setMpLastServerApplyRound,
    setMpRerollInitRound,
    doReroll,
    upgradeLockInfo,
  })

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

      <ResourceBar {...rbVm} />

      {mode==='OUTPOST' && (<OutpostPage {...outpostProps} />)}

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
