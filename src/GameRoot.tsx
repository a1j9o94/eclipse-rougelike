import { useEffect, useState } from "react";
import { type Resources, type Research } from '../shared/defaults'
// PlayerState imported where needed in selectors/hooks
import { type DifficultyId } from '../shared/types'
import { type FrameId } from './game'
import GameShell from './components/GameShell'
import { getPreGameElement } from './lib/renderPreGame'
// import { getEconomyModifiers } from './game/economy'
// blueprint seeding handled in hooks
// StartPage routed via PreGameRouter
import { type FactionId } from '../shared/factions'
// Routed views are rendered inside GameShell
import { type Part } from '../shared/parts'
import { type Ship, type InitiativeEntry } from '../shared/types'
// run init handled in useRunManagement
// lives init handled by utils/inferLives
// combat primitives used inside useCombatLoop
// enemy generation handled by useCombatLoop
// shop reroll/research now routed via engine commands
//
// tonnage computed inside outpost state hook
import type { OutpostEffects as EngineOutpostEffects } from './engine/commands'
// moved snapshot mapping into useMpPhaseNav
// rewards handled by useRunLifecycle
import { loadRunState, clearRunState, recordWin } from './game/storage'
import { playEffect } from './game/sound'
// MultiplayerStartPage and RoomLobby routed via PreGameRouter
// computePlaybackDelay used in useMpPhaseNav
import type { Id } from '../convex/_generated/dataModel'
import { useMultiplayerGame } from './hooks/useMultiplayerGame'
import { useMpTestTick } from './hooks/useMpSync'
import { useRunManagement } from './hooks/useRunManagement'
// import { getMyEconomyMods, getMyResources } from './adapters/mpSelectors'
import { useEffectsRunner, type EffectSink } from './hooks/useEffectsRunner'
import useOutpostController from './controllers/useOutpostController'
import useOutpostState from './controllers/useOutpostState'
import useMultiplayerGlue from './controllers/useMultiplayerGlue'
// MP phase navigation handled inside useMultiplayerGlue
import { useRunLifecycle } from './hooks/useRunLifecycle'
import { useCombatLoop } from './hooks/useCombatLoop'
import useCombatViewState from './controllers/useCombatViewState'
import { useResourceBarVm } from './hooks/useResourceBarVm'
import { type OutpostPageProps } from './hooks/useOutpostPageProps'
import { useMatchOverClose } from './hooks/useMatchOverClose'
import { useMusicRouting } from './hooks/useMusicRouting'
import { usePersistRunState } from './hooks/usePersistRunState'
import { useRestoreEnv } from './hooks/useRestoreEnv'
import { useAutoStepper } from './hooks/useAutoStepper'
import usePreGameHandlers from './hooks/usePreGameHandlers'
import type { RBProps, CombatProps } from './components/GameShell'
import inferStartingLives from './utils/inferLives'
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
  // help menu lives in GameShell
  const [endless, setEndless] = useState(false);
  // Lives system replaces old grace
  const [livesRemaining, setLivesRemaining] = useState<number>(inferStartingLives(saved?.difficulty ?? null, saved ?? undefined));
  const [difficulty, setDifficulty] = useState<null|DifficultyId>(saved?.difficulty ?? null);
  const [faction, setFaction] = useState<FactionId>(saved?.faction ?? 'industrialists');
  const [opponent, setOpponent] = useState<FactionId>(saved?.opponent ?? 'warmongers');
  const [showNewRun, setShowNewRun] = useState(true);

  // Outpost state bundle
  const {
    blueprints, setBlueprints,
    resources, setResources,
    research, setResearch,
    rerollCost, setRerollCost,
    baseRerollCost, setBaseRerollCost,
    capacity, setCapacity,
    fleet, setFleet,
    tonnage,
    focused, setFocused,
    shop, setShop,
    shopVersion, setShopVersion,
  } = useOutpostState(saved)

  // Combat view state
  const cv = useCombatViewState()
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

  const {
    handleRoomJoined,
    handleGameStart,
    handleLeaveRoom,
    handleBackToMainMenu,
    handleContinue,
    handleGoMultiplayer,
  } = usePreGameHandlers({
    setCurrentRoomId: (id)=>setCurrentRoomId(id as Id<'rooms'> | null),
    setMultiplayerPhase,
    setGameMode,
    setShowNewRun,
    playEffect: (k)=>{ void playEffect(k) },
  })

  // ---------- Outpost controller ----------
  const { outpost } = useOutpostController({
    gameMode,
    multi,
    state: {
      resources: resources as Resources,
      research: research as Research,
      blueprints: blueprints as Record<FrameId, Part[]>,
      fleet: fleet as unknown as Ship[],
      capacity,
      tonnage,
      shop,
      focused,
      rerollCost,
      shopVersion,
      sector,
      endless,
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
      setBaseRerollCost,
      setMpSeeded,
      setMpSeedSubmitted,
      setMpServerSnapshotApplied,
      setMpLastServerApplyRound,
      setMpRerollInitRound,
    },
    sfx: { playEffect: (k)=> { void playEffect(k) } },
    resetRun,
  })
  const handleReturnFromCombat = useRunLifecycle({
    outcome: cv.outcome,
    combatOver: cv.combatOver,
    livesRemaining,
    gameMode,
    endless,
    baseRerollCost,
    fns: { resetRun, recordWin, clearRunState },
    sfx: { playEffect: (k: string) => playEffect(k as 'page'|'startCombat'|'equip'|'reroll'|'dock'|'faction'|'tech') },
    getters: {
      sector: ()=>sector,
      enemyFleet: ()=>cv.enemyFleet,
      research: ()=>research as Research,
      fleet: ()=>fleet,
      blueprints: ()=>blueprints as Record<FrameId, Part[]>,
      capacity: ()=>capacity,
      faction: ()=>faction,
      difficulty: ()=> (difficulty as DifficultyId),
    },
    setters: { setMode, setResources, setShop, setShopVersion, setRerollCost, setFleet, setLog: cv.setLog, setShowWin, setEndless, setBaseRerollCost },
    multi,
  })


  // ---------- Enemy Generation ----------
  // enemy generation handled in useCombatLoop

  const combat = useCombatLoop({
    getters: {
      sector: ()=>sector,
      fleet: ()=>fleet,
      enemyFleet: ()=>cv.enemyFleet,
      roundNum: ()=>cv.roundNum,
      turnPtr: ()=>cv.turnPtr,
      combatOver: ()=>cv.combatOver,
      showRules: ()=>showRules,
    },
    setters: {
      setFleet: (f)=> setFleet(f as Ship[]),
      setEnemyFleet: (f)=>cv.setEnemyFleet(f),
      setLog: (fn)=>cv.setLog(fn as unknown as (string[]|((l:string[])=>string[]))),
      setRoundNum: (fn)=>cv.setRoundNum(fn as unknown as (number|((n:number)=>number))),
      setQueue: (q)=>cv.setQueue(q as InitiativeEntry[]),
      setTurnPtr: (n)=>cv.setTurnPtr(n),
      setCombatOver: (v)=>cv.setCombatOver(v),
      setOutcome: (s)=>cv.setOutcome(s),
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
    clearEffects: () => setLastEffects(undefined),
  } as EffectSink)
  async function stepTurn(){ await combat.stepTurn() }
  // Auto-step loop
  useAutoStepper({ enabled: mode==='COMBAT' && !cv.combatOver && !stepLock && !showRules, step: stepTurn, deps: [cv.queue, cv.turnPtr, fleet, cv.enemyFleet] })

  // Restore environment if loading from save
  useRestoreEnv(saved)

  // Multiplayer glue (phase nav + setup sync + seed submit)
  useMultiplayerGlue({
    gameMode,
    multi,
    testTick,
    baseRerollCost,
    rerollCost,
    mpRerollInitRound,
    mpLastServerApplyRound,
    mode,
    blueprints: blueprints as Record<FrameId, Part[]>,
    fleet: fleet as Ship[],
    mpServerSnapshotApplied,
    mpSeedSubmitted,
    mpSeeded,
    setMode,
    setFleet: (s)=> setFleet(s as Ship[]),
    setEnemyFleet: (s)=> cv.setEnemyFleet(s as Ship[]),
    setMultiplayerPhase,
    setLog: cv.setLog,
    setBlueprints: (bp)=> setBlueprints(bp as Record<FrameId, Part[]>),
    setResearch: (r)=> setResearch(r as Research),
    setBaseRerollCost,
    setRerollCost,
    setCapacity,
    setFocused,
    setMpLastServerApplyRound,
    setMpServerSnapshotApplied,
    setMpSeedSubmitted,
    setMpSeeded,
    fleetValid: true,
  })

  // Validity stream handled in Outpost VM; readiness submits snapshots explicitly

  // Multiplayer capacity is set by server modifiers when available

  // Shop updates now flow via engine effects (useEffectsRunner) and immediate set in handlers

  // First-visit rules & new-run modal
  useEffect(()=>{
    if(difficulty==null) setShowNewRun(true);
  },[difficulty]);

  useMusicRouting({ showNewRun, mode, combatOver: cv.combatOver, outcome: cv.outcome })

  // Persist run state
  usePersistRunState({
    difficulty,
    faction,
    opponent,
    resources: resources as Resources,
    research: research as Research,
    rerollCost,
    baseRerollCost,
    capacity,
    sector,
    blueprints: blueprints as Record<FrameId, Part[]>,
    fleet: fleet as Ship[],
    shop,
    livesRemaining,
  })
  // MP setup quality-of-life: ensure reroll cost matches base each setup
  useEffect(() => {
    try {
      if (gameMode === 'multiplayer' && mode === 'OUTPOST' && multi?.gameState?.gamePhase === 'setup') {
        if (typeof rerollCost === 'number' && typeof baseRerollCost === 'number' && rerollCost !== baseRerollCost) {
          setRerollCost(baseRerollCost)
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, mode, multi?.gameState?.gamePhase, baseRerollCost, rerollCost])
  function dismissRules(){ setShowRules(false); }

  // Self-tests moved to src/__tests__/runtime.selftests.spec.ts

  // ---------- View ----------
  const rbVm = useResourceBarVm({ resources: resources as Resources, tonnage, sector, onReset: resetRun, gameMode, singleLives: livesRemaining, multi })

  const handleMatchOverClose = useMatchOverClose({
    multi: (multi as { prepareRematch?: ()=>Promise<void> }) ?? null,
    setters: { setMatchOver, setMode, setLog: cv.setLog, setRoundNum: cv.setRoundNum, setTurnPtr: cv.setTurnPtr, setQueue: cv.setQueue, setCombatOver: cv.setCombatOver, setOutcome: cv.setOutcome, setMultiplayerPhase },
  })

  // Pre-game routing (start, MP menu/lobby)
  const preGame = getPreGameElement({
    gameMode,
    showNewRun,
    faction: faction as string,
    multiplayerPhase,
    currentRoomId,
    onNewRun: newRun,
    onContinue: handleContinue,
    onGoMultiplayer: handleGoMultiplayer,
    onRoomJoined: handleRoomJoined,
    onBack: handleBackToMainMenu,
    onGameStart: handleGameStart,
    onLeaveRoom: handleLeaveRoom,
  })
  if (preGame) return preGame

  return (
    <GameShell
      showRules={showRules}
      onDismissRules={dismissRules}
      showTechs={showTechs}
      onCloseTechs={()=>setShowTechs(false)}
      showWin={showWin}
      onRestartWin={()=>{ setShowWin(false); resetRun() }}
      matchOver={matchOver}
      onMatchOverClose={handleMatchOverClose}
      resourceBar={rbVm as RBProps}
      route={mode}
      outpost={outpost as OutpostPageProps}
      combat={{ combatOver: cv.combatOver, outcome: cv.outcome, roundNum: cv.roundNum, queue: cv.queue as InitiativeEntry[], turnPtr: cv.turnPtr, fleet, enemyFleet: cv.enemyFleet, log: cv.log, onReturn: handleReturnFromCombat } as CombatProps}
    />
  )
}
