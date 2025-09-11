import { describe, it, expect } from 'vitest'
import { applyOutpostCommand } from '../engine/commands'

describe('Engine reroll increments unified via mods', () => {
  it('MP Industrialists: increment is 3 with credits 0.75', () => {
    const state = {
      resources: { credits: 20, materials: 10, science: 0 },
      research: { Military: 1, Grid: 1, Nano: 1 },
      blueprints: { interceptor: [], cruiser: [], dread: [] },
      fleet: [],
      capacity: { cap: 6 },
      tonnageUsed: 0,
      focusedIndex: 0,
      rerollCost: 3,
      shopVersion: 0,
    }
    const env = { gameMode: 'multiplayer' as const, economyMods: { credits: 0.75, materials: 0.75 } }
    const { state: next } = applyOutpostCommand(state as any, env as any, { type: 'reroll' })
    expect(next.resources.credits).toBe(17)
    expect(next.rerollCost).toBe(6) // +3 increment
  })

  it('SP default: increment is 4 with default mods', () => {
    const state = {
      resources: { credits: 20, materials: 10, science: 0 },
      research: { Military: 1, Grid: 1, Nano: 1 },
      blueprints: { interceptor: [], cruiser: [], dread: [] },
      fleet: [],
      capacity: { cap: 6 },
      tonnageUsed: 0,
      focusedIndex: 0,
      rerollCost: 8,
      shopVersion: 0,
    }
    const env = { gameMode: 'single' as const }
    const { state: next } = applyOutpostCommand(state as any, env as any, { type: 'reroll' })
    expect(next.resources.credits).toBe(12)
    expect(next.rerollCost).toBe(12) // +4 increment
  })
})

