import { describe, it, expect } from 'vitest'
// UI helpers not used in this file
import { FACTIONS, getFaction } from '../../shared/factions'
import type { Part } from '../../shared/parts'
import { initNewRun } from '../game/setup'

const partDealsDamage = (part: Part) => {
  if (part.cat !== 'Weapon') return false
  if ((part.dmgPerHit ?? 0) > 0) return true
  if ((part.riftDice ?? 0) > 0) return true
  return part.faces?.some(face => (face.dmg ?? 0) > 0) ?? false
}

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

  it('Each faction starting blueprint includes a damaging weapon', () => {
    for (const faction of FACTIONS) {
      const frame = faction.config.startingFrame
      const bp = faction.config.blueprints[frame]
      const hasDamage = bp.some(partDealsDamage)
      expect(hasDamage).toBe(true)
    }
  })
})
