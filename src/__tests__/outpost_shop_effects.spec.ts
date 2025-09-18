import { describe, it, expect } from 'vitest'
import { applyOutpostCommand } from '../engine/commands'
import type { OutpostEnv, OutpostState } from '../engine/state'
import { makeShip, getFrame, ALL_PARTS } from '../game'
import type { Part } from '../../shared/parts'
import type { EffectfulPart } from '../../shared/effects'
import type { Research, Resources } from '../../shared/defaults'

const BASE_RESOURCES: Resources = { credits: 200, materials: 0, science: 0 }
const BASE_RESEARCH: Research = { Military: 1, Grid: 1, Nano: 1 }

function clonePart(id: string): EffectfulPart {
  const base = (ALL_PARTS as EffectfulPart[]).find(p => p.id === id)
  if (!base) throw new Error(`Unknown part ${id}`)
  return {
    ...base,
    effects: base.effects?.map(e => ({ hook: e.hook, effect: { ...e.effect } })),
  }
}

function makeState(parts: EffectfulPart[]): OutpostState {
  const frame = getFrame('interceptor')
  const ship = makeShip(frame, parts as Part[])
  return {
    resources: { ...BASE_RESOURCES },
    research: { ...BASE_RESEARCH },
    blueprints: {
      interceptor: parts as Part[],
      cruiser: [],
      dread: [],
    },
    fleet: [ship],
    capacity: { cap: 3 },
    tonnageUsed: frame.tonnage,
    focusedIndex: 0,
    rerollCost: 8,
    rerollsThisRun: 0,
    shopVersion: 0,
  }
}

describe('shop-triggered part effects', () => {
  it('destroys parts with destroyOnShopReroll on reroll when the chance succeeds', () => {
    const parts = [
      clonePart('discount_source'),
      clonePart('overtuned_drive'),
      clonePart('plasma'),
      clonePart('positron'),
    ]
    const state = makeState(parts)
    const env: OutpostEnv = { gameMode: 'single', shopRng: () => 0 }

    const { state: next } = applyOutpostCommand(state, env, { type: 'reroll' })

    expect(next.blueprints.interceptor?.find(p => p.id === 'discount_source')).toBeUndefined()
    expect(next.fleet[0].parts.find(p => p.id === 'discount_source')).toBeUndefined()
  })

  it('downgrades stats for downgradeOnReroll when triggered', () => {
    const parts = [
      clonePart('discount_source'),
      clonePart('overtuned_drive'),
      clonePart('plasma'),
      clonePart('positron'),
    ]
    const state = makeState(parts)
    const env: OutpostEnv = { gameMode: 'single', shopRng: () => 0 }

    const { state: next } = applyOutpostCommand(state, env, { type: 'reroll' })
    const drive = next.blueprints.interceptor?.find(p => p.id === 'overtuned_drive')

    expect(drive?.init).toBe(1)
    expect(next.fleet[0].parts.find(p => p.id === 'overtuned_drive')?.init).toBe(1)
  })

  it('destroys parts with destroyOnPurchase after buying an item', () => {
    const parts = [
      clonePart('discount_source'),
      clonePart('fusion_drive'),
      clonePart('plasma'),
      clonePart('unstable_shield'),
    ]
    const state = makeState(parts)
    const env: OutpostEnv = { gameMode: 'single', shopRng: () => 0 }

    const buyPart = clonePart('positron')
    const { state: next } = applyOutpostCommand(state, env, { type: 'buy_and_install', part: buyPart as Part })

    expect(next.blueprints.interceptor?.find(p => p.id === 'unstable_shield')).toBeUndefined()
    expect(next.fleet[0].parts.find(p => p.id === 'unstable_shield')).toBeUndefined()
  })
})
