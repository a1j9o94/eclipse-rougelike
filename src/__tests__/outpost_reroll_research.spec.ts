import { describe, it, expect } from 'vitest'
import { applyOutpostCommand } from '../engine/commands'
import type { OutpostEnv, OutpostState } from '../engine/state'
import { PARTS, getFrame, makeShip, type FrameId } from '../game'
import type { Research } from '../../shared/defaults'
import { ECONOMY } from '../../shared/economy'

function baseState(): OutpostState {
  const frameId: FrameId = 'interceptor'
  const baseBp = [
    PARTS.sources.find(p=>p.id==='fusion_source')!,
    PARTS.drives.find(p=>p.id==='fusion_drive')!,
  ] as const
  const ship = makeShip(getFrame(frameId), [...baseBp])
  return {
    resources: { credits: 200, materials: 200, science: 10 },
    research: { Military: 1, Grid: 1, Nano: 1 } as Research,
    blueprints: { interceptor: [...baseBp], cruiser: [], dread: [] } as Record<FrameId, typeof baseBp[number][]>,
    fleet: [ship as any],
    capacity: { cap: 5 },
    tonnageUsed: ship.frame.tonnage,
    focusedIndex: 0,
    rerollCost: ECONOMY.reroll.base,
    shopVersion: 0,
  }
}

const envMp: OutpostEnv = { gameMode: 'multiplayer', economyMods: { credits: 1, materials: 1 } }

describe('Outpost reroll + research commands', () => {
  it('reroll consumes credits, bumps rerollCost, and returns shop items', () => {
    const s0 = baseState()
    const credits0 = s0.resources.credits
    const rr0 = s0.rerollCost!
    const { state: s1, effects } = applyOutpostCommand(s0, envMp, { type: 'reroll' })
    expect(s1.resources.credits).toBe(credits0 - rr0)
    expect(s1.rerollCost).toBe(rr0 + ECONOMY.reroll.increment)
    expect(effects?.shopItems?.length).toBe(ECONOMY.shop.itemsBase)
    expect(s1.shopVersion).toBe((s0.shopVersion || 0) + 1)
  })

  it('research upgrades the track, adjusts resources, bumps rerollCost, and returns shop items', () => {
    const s0 = baseState()
    const rr0 = s0.rerollCost!
    const credits0 = s0.resources.credits
    const sci0 = s0.resources.science
    const { state: s1, effects } = applyOutpostCommand(s0, envMp, { type: 'research', track: 'Military' })
    expect(s1.research.Military).toBe(2)
    expect(s1.resources.credits).toBe(credits0 - 20)
    expect(s1.resources.science).toBe(sci0 - 1)
    expect(s1.rerollCost).toBe(rr0 + ECONOMY.reroll.increment)
    expect(effects?.shopItems?.length).toBe(ECONOMY.shop.itemsBase)
    expect(s1.shopVersion).toBe((s0.shopVersion || 0) + 1)
  })
})
