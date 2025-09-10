import { useCallback } from 'react'
import type { Resources, Research } from '../../shared/defaults'
import type { Part } from '../../shared/parts'
import type { CapacityState, Ship } from '../../shared/types'
import type { FrameId } from '../game'
import type { EconMods } from '../game/economy'
import { OutpostIntents } from '../adapters/outpostAdapter'
import { applyOutpostCommand, type OutpostEffects } from '../engine/commands'
import type { OutpostState, OutpostEnv } from '../engine/state'
import { normalizeShopItems } from '../game/shop'
import type { EffectKey } from '../game/sound'

export type UseOutpostHandlersParams = {
  gameMode: 'single' | 'multiplayer'
  economyMods?: EconMods
  state: {
    resources: Resources
    research: Research
    blueprints: Record<FrameId, Part[]>
    fleet: Ship[]
    capacity: CapacityState
    tonnageUsed: number
    focusedIndex: number
    rerollCost?: number
    shopVersion?: number
  }
  setters: {
    setResources: (r: Resources) => void
    setResearch: (r: Research) => void
    setBlueprints: (bp: Record<FrameId, Part[]>) => void
    setFleet: (f: Ship[]) => void
    setCapacity: (c: CapacityState) => void
    setFocused: (n: number) => void
    setRerollCost?: (n: number) => void
    setShopVersion?: (n: number) => void
    setShop?: (s: { items: Part[] }) => void
    setLastEffects?: (fx: OutpostEffects | undefined) => void
  }
  multi?: { updateGameState?: (updates: { research: Research; resources: { credits:number; materials:number; science:number } }) => unknown }
  sound?: (key: EffectKey) => void
}

export type OutpostHandlers = {
  buyAndInstall: (part: Part) => void
  sellPart: (frameId: FrameId, idx: number) => void
  buildShip: () => void
  upgradeShip: (idx: number) => void
  upgradeDock: () => void
  reroll: () => void
  research: (track: 'Military'|'Grid'|'Nano') => void
  startCombat: () => void
  apply: (cmd: ReturnType<typeof OutpostIntents[keyof typeof OutpostIntents]>) => { next: OutpostState; effects?: OutpostEffects } | undefined
}

export function useOutpostHandlers(params: UseOutpostHandlersParams): OutpostHandlers {
  const { gameMode, economyMods, state, setters, multi, sound } = params

  const apply = useCallback((cmd: ReturnType<typeof OutpostIntents[keyof typeof OutpostIntents]>) => {
    const st: OutpostState = {
      resources: state.resources,
      research: state.research,
      blueprints: state.blueprints,
      fleet: state.fleet,
      capacity: state.capacity,
      tonnageUsed: state.tonnageUsed,
      focusedIndex: state.focusedIndex,
      rerollCost: state.rerollCost,
      shopVersion: state.shopVersion,
    }
    const env: OutpostEnv = { gameMode, economyMods }
    const { state: next, effects } = applyOutpostCommand(st, env, cmd)
    setters.setResources(next.resources)
    setters.setResearch(next.research as Research)
    setters.setBlueprints(next.blueprints as Record<FrameId, Part[]>)
    setters.setFleet(next.fleet as unknown as Ship[])
    setters.setCapacity(next.capacity)
    setters.setFocused(next.focusedIndex)
    if (typeof next.rerollCost === 'number' && setters.setRerollCost) setters.setRerollCost(next.rerollCost as number)
    if (typeof next.shopVersion === 'number' && setters.setShopVersion) setters.setShopVersion(next.shopVersion as number)
    if (effects?.shopItems && setters.setShop) {
      try {
        const normalized = normalizeShopItems(effects.shopItems, next.research as Research)
        setters.setShop({ items: normalized })
      } catch { setters.setShop({ items: effects.shopItems }) }
    }
    setters.setLastEffects?.(effects)
    return { next, effects }
  }, [gameMode, economyMods, state, setters])

  const buyAndInstall = useCallback((part: Part) => {
    apply(OutpostIntents.buyAndInstall(part))
    sound?.('equip')
  }, [apply, sound])

  const sellPart = useCallback((frameId: FrameId, idx: number) => {
    apply(OutpostIntents.sellPart(frameId, idx))
  }, [apply])

  const buildShip = useCallback(() => {
    apply(OutpostIntents.buildShip())
  }, [apply])

  const upgradeShip = useCallback((idx: number) => {
    apply(OutpostIntents.upgradeShip(idx))
  }, [apply])

  const upgradeDock = useCallback(() => {
    apply(OutpostIntents.upgradeDock())
    sound?.('dock')
  }, [apply, sound])

  const reroll = useCallback(() => {
    apply(OutpostIntents.reroll())
    sound?.('reroll')
  }, [apply, sound])

  const research = useCallback((track: 'Military'|'Grid'|'Nano') => {
    const r = apply(OutpostIntents.research(track))
    if (!r) return
    // MP: persist research/resources so they survive across phases
    if (gameMode === 'multiplayer' && multi?.updateGameState) {
      try {
        const updates = { research: r.next.research as Research, resources: r.next.resources } as { research: Research; resources: { credits:number; materials:number; science:number } }
        multi.updateGameState(updates)
      } catch {/* noop */}
    }
    sound?.('tech')
  }, [apply, gameMode, multi, sound])

  const startCombat = useCallback(() => {
    apply(OutpostIntents.startCombat())
  }, [apply])

  return { buyAndInstall, sellPart, buildShip, upgradeShip, upgradeDock, reroll, research, startCombat, apply }
}

export default useOutpostHandlers
