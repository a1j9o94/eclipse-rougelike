import { describe, it, expect } from 'vitest'
// UI helpers not used in this file
import { getFaction } from '../../shared/factions'
import { initNewRun } from '../game/setup'

describe('Factions', () => {
  it('Scientists start at Tier 2 across all tracks', () => {
    const run = initNewRun({ difficulty: 'easy', faction: 'scientists' })
    expect(run.research.Military).toBe(2)
    expect(run.research.Grid).toBe(2)
    expect(run.research.Nano).toBe(2)
  })

  it('Warmongers start with a Cruiser on the field', () => {
    const run = initNewRun({ difficulty: 'easy', faction: 'warmongers' })
    expect(run.fleet.some(s => s.frame.id === 'cruiser')).toBe(true)
  })

  it('Raiders start with T2 weapon (Antimatter Cannon) on Interceptor', () => {
    const run = initNewRun({ difficulty: 'easy', faction: 'raiders' })
    const i = run.fleet.find(s => s.frame.id === 'interceptor')!
    const ids = i.parts.map(p => p.id)
    expect(ids).toContain('antimatter')
  })

  it('Industrialists start with free reroll and discounted build costs', () => {
    const f = getFaction('industrialists')
    expect(f.config.economy?.rerollBase).toBe(0)
    expect(f.config.economy?.creditMultiplier).toBeLessThan(1)
  })

  it('Faction config exposes starting frame and capacity', () => {
    const warmongers = getFaction('warmongers')
    expect(warmongers.config.startingFrame).toBe('cruiser')
    expect(warmongers.config.capacity).toBeGreaterThan(10)
  })

  it('Timekeepers start with Disruptor Beam and Plasma Cannon blueprints', () => {
    const f = getFaction('timekeepers')
    const ids = f.config.blueprints.interceptor.map(p=>p.id)
    expect(ids).toContain('disruptor')
    expect(ids).toContain('plasma')
    expect(ids).not.toContain('positron')
  })

  it('Collective begin with Auto-Repair Hull', () => {
    const f = getFaction('collective')
    const ids = f.config.blueprints.interceptor.map(p=>p.id)
    expect(ids).toContain('auto_repair')
  })
})
