import type { EffectfulPart } from '../../shared/effects'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import { getFrame, makeShip, type FrameId } from '../game'

export type ShopEffectHook = 'onShopReroll' | 'onShopPurchase'

export type ShopEffectState = {
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
}

export function applyShopEffects(
  state: ShopEffectState,
  hook: ShopEffectHook,
  rng: () => number,
): ShopEffectState {
  const changes = new Map<FrameId, EffectfulPart[]>()

  for (const [frameId, parts] of Object.entries(state.blueprints) as [FrameId, Part[]][]) {
    if (!parts || parts.length === 0) continue

    let mutated = false
    const kept: EffectfulPart[] = []

    for (const original of parts as EffectfulPart[]) {
      const hooks = original.effects?.filter(e => e.hook === hook)
      if (!hooks || hooks.length === 0) {
        kept.push(original)
        continue
      }

      let current: EffectfulPart = original
      let removed = false

      for (const { effect } of hooks) {
        if (effect.kind === 'destroyOnShopReroll' && hook === 'onShopReroll') {
          if (rng() * 100 < effect.chancePct) {
            removed = true
            mutated = true
            break
          }
        } else if (effect.kind === 'destroyOnPurchase' && hook === 'onShopPurchase') {
          if (rng() * 100 < effect.chancePct) {
            removed = true
            mutated = true
            break
          }
        } else if (effect.kind === 'downgradeOnReroll' && hook === 'onShopReroll') {
          if (rng() * 100 < effect.chancePct) {
            const stat = effect.stat as keyof Part
            const currVal = typeof current[stat] === 'number' ? (current[stat] as number) : 0
            const nextVal = Math.max(effect.min, currVal - 1)
            if (nextVal !== currVal) {
              current = { ...current, [stat]: nextVal } as EffectfulPart
              mutated = true
            }
          }
        }
      }

      if (!removed) {
        kept.push(current)
      }
    }

    if (mutated) {
      changes.set(frameId, kept)
    }
  }

  if (changes.size === 0) {
    return state
  }

  const nextBlueprints = { ...state.blueprints }
  for (const [frameId, updatedParts] of changes.entries()) {
    nextBlueprints[frameId] = updatedParts as Part[]
  }

  const nextFleet = state.fleet.map(ship => {
    const frameId = ship.frame.id as FrameId
    if (!changes.has(frameId)) return ship
    const parts = nextBlueprints[frameId] ?? []
    return makeShip(getFrame(frameId), parts) as Ship
  })

  return { blueprints: nextBlueprints, fleet: nextFleet }
}
