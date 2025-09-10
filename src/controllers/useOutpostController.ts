import { useEffect, useMemo } from 'react'
import type { Resources, Research } from '../../shared/defaults'
import type { CapacityState, Ship } from '../../shared/types'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import { getEconomyModifiers } from '../game/economy'
import { getMyEconomyMods, getMyResources, getMyPlayerState } from '../adapters/mpSelectors'
import { useOutpostHandlers, type UseOutpostHandlersParams } from '../hooks/useOutpostHandlers'
import { useOutpostActionMap } from '../hooks/useOutpostActionMap'
import { useOutpostPageProps, type OutpostPageProps } from '../hooks/useOutpostPageProps'
import { makeCanResearch, makeResearchLabel } from '../selectors/researchUi'
import { upgradeLockInfo as selectUpgradeLockInfo } from '../selectors/upgrade'
import { ghostClassDelta } from '../selectors/ghost'
import type { EffectKey } from '../game/sound'

export type OutpostControllerParams = {
  gameMode: 'single'|'multiplayer'
  multi?: unknown
  state: {
    resources: Resources
    research: Research
    blueprints: Record<FrameId, Part[]>
    fleet: Ship[]
    capacity: CapacityState
    tonnage: { used: number; cap: number }
    shop: { items: Part[] }
    focused: number
    rerollCost: number
    shopVersion: number
    sector: number
    endless: boolean
  }
  setters: {
    setResources: (r: Resources) => void
    setResearch: (r: Research) => void
    setBlueprints: (bp: Record<FrameId, Part[]>) => void
    setFleet: (f: Ship[]) => void
    setCapacity: (c: CapacityState) => void
    setFocused: (n: number) => void
    setRerollCost: (n: number) => void
    setShopVersion: (n: number) => void
    setShop: (s: { items: Part[] }) => void
    setLastEffects: (fx: unknown) => void
    setBaseRerollCost: (n: number) => void
    // MP
    setMpSeeded: (v: boolean) => void
    setMpSeedSubmitted: (v: boolean) => void
    setMpServerSnapshotApplied: (v: boolean) => void
    setMpLastServerApplyRound: (n: number) => void
    setMpRerollInitRound: (n: number) => void
  }
  sfx: { playEffect: (key: EffectKey) => void }
  resetRun: () => void
}

export function useOutpostController(params: OutpostControllerParams){
  const { gameMode, multi, state, setters, sfx, resetRun } = params

  // Handlers (engine-backed)
  const handlerParams: UseOutpostHandlersParams = {
    gameMode,
    economyMods: gameMode==='multiplayer' ? getMyEconomyMods(multi) : getEconomyModifiers(),
    state: {
      resources: (gameMode==='multiplayer' ? getMyResources(multi, state.resources) : state.resources),
      research: state.research,
      blueprints: state.blueprints,
      fleet: state.fleet,
      capacity: state.capacity,
      tonnageUsed: state.tonnage.used,
      focusedIndex: state.focused,
      rerollCost: state.rerollCost,
      shopVersion: state.shopVersion,
    },
    setters: {
      setResources: setters.setResources,
      setResearch: setters.setResearch,
      setBlueprints: setters.setBlueprints,
      setFleet: setters.setFleet,
      setCapacity: setters.setCapacity,
      setFocused: setters.setFocused,
      setRerollCost: setters.setRerollCost,
      setShopVersion: setters.setShopVersion,
      setShop: setters.setShop,
      setLastEffects: (fx) => setters.setLastEffects(fx),
    },
    multi: gameMode==='multiplayer' ? (multi as { updateGameState?: (arg: { updates: { research: Research; resources: { credits:number; materials:number; science:number } } })=>unknown }) : undefined,
    sound: (k)=> sfx.playEffect(k),
  }
  const outpostHandlers = useOutpostHandlers(handlerParams)
  const actions = useOutpostActionMap(outpostHandlers)

  // UI bits
  const researchLabel = useMemo(() => makeResearchLabel(gameMode, state.research, multi), [gameMode, state.research, multi])
  const canResearch = useMemo(() => makeCanResearch(gameMode, state.research, state.resources, multi), [gameMode, state.research, state.resources, multi])
  const upgradeLockInfo = (ship: Ship | null | undefined) => selectUpgradeLockInfo(ship)
  const ghost = (ship: Ship, part: Part) => ghostClassDelta(state.blueprints, ship, part)

  const outpost: OutpostPageProps = useOutpostPageProps({
    gameMode,
    resources: state.resources,
    research: state.research,
    blueprints: state.blueprints,
    fleet: state.fleet,
    capacity: state.capacity,
    tonnage: state.tonnage,
    shop: state.shop,
    focused: state.focused,
    setFocused: setters.setFocused,
    rerollCost: state.rerollCost,
    researchLabel,
    canResearch,
    researchTrack: actions.researchTrack,
    buildShip: actions.buildShip,
    upgradeShip: actions.upgradeShip,
    upgradeDock: actions.upgradeDock,
    ghost: ghost as unknown as OutpostPageProps['ghost'],
    sellPart: (fid, idx) => actions.sellPart(fid, idx),
    buyAndInstall: actions.buyAndInstall,
    sector: state.sector,
    endless: state.endless,
    // vm extras
    multi,
    spStartCombat: actions.spStartCombat,
    resetRun,
    setBlueprints: setters.setBlueprints,
    setResources: setters.setResources,
    setResearch: setters.setResearch,
    setCapacity: setters.setCapacity,
    setRerollCost: setters.setRerollCost,
    setBaseRerollCost: setters.setBaseRerollCost,
    setMpSeeded: setters.setMpSeeded,
    setMpSeedSubmitted: setters.setMpSeedSubmitted,
    setMpServerSnapshotApplied: setters.setMpServerSnapshotApplied,
    setMpLastServerApplyRound: setters.setMpLastServerApplyRound,
    setMpRerollInitRound: setters.setMpRerollInitRound,
    doReroll: actions.doReroll,
    upgradeLockInfo,
  })

  // Immediate MP reroll base correction to avoid UI lag before useMpSetupSync runs
  useEffect(() => {
    if (gameMode !== 'multiplayer') return
    try {
      const st = getMyPlayerState(multi as { getPlayerId?: () => string | null; gameState?: { playerStates?: unknown } } | undefined)
      const econBase = (st as { economy?: { rerollBase?: number } } | null | undefined)?.economy?.rerollBase
      if (typeof econBase === 'number') {
        setters.setBaseRerollCost(econBase)
        setters.setRerollCost(econBase)
      }
    } catch { /* ignore */ }
    // Depend on playerStates identity; roundNum correction happens in useMpSetupSync
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, (multi as { gameState?: { playerStates?: unknown } } | undefined)?.gameState?.playerStates])

  return { outpost }
}

export type OutpostController = ReturnType<typeof useOutpostController>

export default useOutpostController
