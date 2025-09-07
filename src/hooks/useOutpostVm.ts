import { useMemo, useCallback } from 'react'
import type { Part } from '../../shared/parts'
import type { Resources, Research } from '../../shared/defaults'
import type { Ship, CapacityState } from '../../shared/types'
import type { FrameId } from '../game'
import { getEconomyModifiers } from '../game/economy'
import { getMyEconomyMods } from '../adapters/mpSelectors'
import { isFleetValid } from '../selectors'
import { selectFleetValidity } from '../selectors/guards'
import { buildMpGuards, type MpBasics as GuardMpBasics } from '../selectors/mpGuards'
import { INITIAL_BLUEPRINTS, INITIAL_RESOURCES, INITIAL_RESEARCH, INITIAL_CAPACITY } from '../../shared/defaults'
import { ECONOMY } from '../../shared/economy'

type MultiLike = {
  getPlayerId?: () => string | null
  getCurrentPlayer?: () => ({ isReady?: boolean } | null | undefined)
  getOpponent?: () => ({ playerId?: string; isReady?: boolean } | null | undefined)
  submitFleetSnapshot?: (fleet: unknown, valid: boolean) => void | Promise<void>
  updateFleetValidity?: (valid: boolean) => void | Promise<void>
  setReady?: (ready: boolean) => void | Promise<void>
  prepareRematch?: () => Promise<void>
  gameState?: { gamePhase?: string; playerStates?: Record<string, { fleetValid?: boolean; fleet?: unknown[] }> } | null
}

export function useOutpostVm(params: {
  gameMode: 'single'|'multiplayer'
  resources: Resources
  research: Research
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  capacity: CapacityState
  tonnage: { used: number; cap: number }
  shop: { items: Part[] }
  focused: number
  setFocused: (n: number) => void
  rerollCost: number
  researchLabel: (t: 'Military'|'Grid'|'Nano') => string
  canResearch: (t: 'Military'|'Grid'|'Nano') => boolean
  researchTrack: (t: 'Military'|'Grid'|'Nano') => void
  buildShip: () => void
  upgradeShip: (idx: number) => void
  upgradeDock: () => void
  ghost: (ship: Ship, part: Part) => unknown
  sellPart: (frameId: FrameId, idx: number) => void
  buyAndInstall: (part: Part) => void
  sector: number
  endless: boolean
  // MP plumbing
  multi?: MultiLike & GuardMpBasics
  localFleetValidOverride?: boolean
  spStartCombat: () => void
  // SP/MP restart hooks
  resetRun: () => void
  setBlueprints: (bp: Record<FrameId, Part[]>) => void
  setResources: (r: Resources) => void
  setResearch: (r: Research) => void
  setCapacity: (c: CapacityState) => void
  setRerollCost: (n: number) => void
  setBaseRerollCost: (n: number) => void
  setMpSeeded: (v: boolean) => void
  setMpSeedSubmitted: (v: boolean) => void
  setMpServerSnapshotApplied: (v: boolean) => void
  setMpLastServerApplyRound: (n: number) => void
  setMpRerollInitRound: (n: number) => void
}){
  const p = params
  const economyMods = p.gameMode==='multiplayer' ? getMyEconomyMods(p.multi) : getEconomyModifiers()

  const localFleetValid = p.localFleetValidOverride ?? isFleetValid(p.fleet, p.capacity)
  const serverFleetValid: boolean | null = useMemo(() => {
    try {
      if (p.gameMode !== 'multiplayer') return null
      const myId = p.multi?.getPlayerId?.() as string | null
      const st = myId ? (p.multi?.gameState?.playerStates as Record<string, { fleetValid?: boolean; fleet?: unknown[] }> | undefined)?.[myId] : undefined
      const inSetup = p.multi?.gameState?.gamePhase === 'setup'
      if (inSetup) return st?.fleetValid === true
      return typeof st?.fleetValid === 'boolean' ? st.fleetValid : null
    } catch { return null }
  }, [p.gameMode, p.multi, p.multi?.gameState?.gamePhase, p.multi?.gameState?.playerStates, p.multi?.getPlayerId])

  const fleetValid = selectFleetValidity(localFleetValid, serverFleetValid)
  const myReady = !!p.multi?.getCurrentPlayer?.()?.isReady
  const oppReady = !!p.multi?.getOpponent?.()?.isReady
  const mpGuards = p.gameMode==='multiplayer' ? buildMpGuards(p.multi, localFleetValid) : undefined

  const startCombat = useCallback(() => {
    if (p.gameMode === 'multiplayer') {
      try {
        const me = p.multi?.getCurrentPlayer?.()
        const next = !me?.isReady
        void p.multi?.submitFleetSnapshot?.(p.fleet as unknown, fleetValid)
        void p.multi?.updateFleetValidity?.(fleetValid)
        void p.multi?.setReady?.(next)
      } catch { /* noop */ }
      return
    }
    p.spStartCombat()
  }, [p, fleetValid])

  const onRestart = useCallback(() => {
    if (p.gameMode === 'multiplayer') {
      try { void p.multi?.prepareRematch?.() } catch { /* noop */ }
      p.setBlueprints({ interceptor:[...INITIAL_BLUEPRINTS.interceptor], cruiser:[...INITIAL_BLUEPRINTS.cruiser], dread:[...INITIAL_BLUEPRINTS.dread] })
      p.setResources({ ...INITIAL_RESOURCES })
      p.setResearch({ ...INITIAL_RESEARCH })
      p.setCapacity({ ...INITIAL_CAPACITY })
      p.setRerollCost(ECONOMY.reroll.base)
      p.setBaseRerollCost(ECONOMY.reroll.base)
      p.setMpSeeded(false); p.setMpSeedSubmitted(false); p.setMpServerSnapshotApplied(false)
      p.setMpLastServerApplyRound(0); p.setMpRerollInitRound(0)
      return
    }
    p.resetRun()
  }, [p])

  return {
    economyMods,
    localFleetValid,
    serverFleetValid,
    fleetValid,
    myReady,
    oppReady,
    mpGuards,
    startCombat,
    onRestart,
  }
}

export default useOutpostVm
