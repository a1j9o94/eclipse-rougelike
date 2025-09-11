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
import { isEnabled as isTutorialEnabled, event as tutorialEvent } from '../tutorial/state'
import { curatedShopFor } from '../tutorial/script'
import { ALL_PARTS } from '../../shared/parts'
import { currentGate } from '../tutorial/gates'
// (duplicates removed)

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
  multi?: { updateGameState?: (updates: Record<string, unknown>) => unknown }
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
    // Tutorial gate: allow only when permitted and, if specified, only certain part ids
    try {
      const gate = currentGate();
      if (gate) {
        if (!gate.canBuy) return;
        if (gate.allowedBuyIds && !gate.allowedBuyIds.includes(part.id)) return;
      }
    } catch { /* noop */ }
    const r = apply(OutpostIntents.buyAndInstall(part))
    if (r && gameMode === 'multiplayer' && multi?.updateGameState) {
      try { multi.updateGameState({ resources: r.next.resources }) } catch { /* noop */ }
    }
    sound?.('equip')
    if (isTutorialEnabled()) {
      if (part.id === 'composite') tutorialEvent('bought-composite')
      if (part.id === 'improved') tutorialEvent('bought-improved')
    }
  }, [apply, sound])

  const sellPart = useCallback((frameId: FrameId, idx: number) => {
    // Tutorial: allow specific sells when requested
    try {
      const gate = currentGate();
      if (gate) {
        if (!gate.allowedSellIds) return;
        const p = state.blueprints[frameId]?.[idx];
        if (!p || !gate.allowedSellIds.includes(p.id)) return;
      }
    } catch { /* noop */ }
    const r = apply(OutpostIntents.sellPart(frameId, idx))
    if (r && gameMode === 'multiplayer' && multi?.updateGameState) {
      try { multi.updateGameState({ resources: r.next.resources }) } catch { /* noop */ }
    }
    if (isTutorialEnabled()) {
      try { const p = state.blueprints[frameId]?.[idx]; if (p?.id==='composite') tutorialEvent('sold-composite') } catch { /* noop */ }
    }
  }, [apply])

  const buildShip = useCallback(() => {
    // Disallow building during tutorial (kept simple in first pass)
    try { const gate = currentGate(); if (gate) return } catch { /* noop */ }
    const r = apply(OutpostIntents.buildShip())
    if (r && gameMode === 'multiplayer' && multi?.updateGameState) {
      try { multi.updateGameState({ resources: r.next.resources }) } catch { /* noop */ }
    }
  }, [apply])

  const upgradeShip = useCallback((idx: number) => {
    try {
      const gate = currentGate();
      if (gate) {
        if (!gate.canUpgradeShip) return;
        if (gate.upgradeOnlyInterceptor) {
          const s = state.fleet?.[idx];
          if (!s || (s.frame.id as FrameId) !== 'interceptor') return;
        }
      }
    } catch { /* noop */ }
    const r = apply(OutpostIntents.upgradeShip(idx))
    if (r && gameMode === 'multiplayer' && multi?.updateGameState) {
      try { multi.updateGameState({ resources: r.next.resources }) } catch { /* noop */ }
    }
    if (isTutorialEnabled()) tutorialEvent('upgraded-interceptor')
  }, [apply])

  const upgradeDock = useCallback(() => {
    try { const gate = currentGate(); if (gate && !gate.canUpgradeDock) return } catch { /* noop */ }
    const r = apply(OutpostIntents.upgradeDock())
    if (r && gameMode === 'multiplayer' && multi?.updateGameState) {
      try { multi.updateGameState({ resources: r.next.resources }) } catch { /* noop */ }
    }
    sound?.('dock')
    if (isTutorialEnabled()) tutorialEvent('expanded-dock')
  }, [apply, sound])

  const reroll = useCallback(() => {
    try { const gate = currentGate(); if (gate && !gate.canReroll) return } catch { /* noop */ }
    const r = apply(OutpostIntents.reroll())
    if (!r) return
    // In MP, persist resource deltas to server so both clients stay in sync
    if (gameMode === 'multiplayer' && multi?.updateGameState) {
      try { multi.updateGameState({ research: r.next.research as Research, resources: r.next.resources, rerollCost: (r.next.rerollCost as number | undefined) }) } catch { /* noop */ }
    }
    sound?.('reroll')
    if (isTutorialEnabled()) tutorialEvent('rerolled')
  }, [apply, gameMode, multi, sound])

  const research = useCallback((track: 'Military'|'Grid'|'Nano') => {
    try {
      const gate = currentGate();
      if (gate) {
        if (!gate.canResearch) return;
        if (gate.allowedResearchTracks && !gate.allowedResearchTracks.includes(track)) return;
      }
    } catch { /* noop */ }
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
    if (isTutorialEnabled()) {
      if (track==='Nano') {
        tutorialEvent('researched-nano')
        try {
          const ids = curatedShopFor('buy-improved' as never)
          if (ids && ids.length) {
            const items = ids.map(id => (ALL_PARTS as Part[]).find(p => p.id===id)).filter(Boolean) as Part[]
            // Override any research-driven shop update immediately
            setters.setShop?.({ items })
          }
        } catch { /* noop */ }
      }
      if (track==='Military') tutorialEvent('researched-military')
    }
  }, [apply, gameMode, multi, sound])

  const startCombat = useCallback(() => {
    try { const gate = currentGate(); if (gate && !gate.canStartCombat) return } catch { /* noop */ }
    apply(OutpostIntents.startCombat())
    if (isTutorialEnabled()) tutorialEvent('started-combat')
  }, [apply])

  return { buyAndInstall, sellPart, buildShip, upgradeShip, upgradeDock, reroll, research, startCombat, apply }
}

export default useOutpostHandlers
