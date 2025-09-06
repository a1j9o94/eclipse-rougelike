import { describe, it, expect } from 'vitest'
import {
  successThreshold,
  tierCap,
  makeShip,
  getFrame,
  getSectorSpec,
  SECTORS,
  isDrive,
  isWeapon,
  isComputer,
  isShield,
  isHull,
} from '../game'
import { PARTS, RARE_PARTS, type Part } from '../../shared/parts'

describe('core helpers', () => {
  it('successThreshold clamps between 2 and 6', () => {
    expect(successThreshold(-5, 10)).toBe(6)
    expect(successThreshold(10, -5)).toBe(2)
  })

  it('tierCap clamps each track independently between 1 and 3', () => {
    expect(tierCap({ Military: 1, Grid: 1, Nano: 1 })).toEqual({ Military:1, Grid:1, Nano:1 })
    expect(tierCap({ Military: 3, Grid: 3, Nano: 3 })).toEqual({ Military:3, Grid:3, Nano:3 })
    expect(tierCap({ Military: 0, Grid: 4, Nano: 2 })).toEqual({ Military:1, Grid:3, Nano:2 })
  })

  it('makeShip validates required parts and power constraints', () => {
    const frame = getFrame('interceptor')
    // Missing drive invalid
    const s1 = makeShip(frame, [PARTS.sources[0]])
    expect(s1.stats.valid).toBe(false)
    // Missing source invalid
    const s2 = makeShip(frame, [PARTS.drives[0]])
    expect(s2.stats.valid).toBe(false)
    // Both present is valid
    const s3 = makeShip(frame, [PARTS.sources[0], PARTS.drives[0]])
    expect(s3.stats.valid).toBe(true)
    // Power overuse invalid
    const s4 = makeShip(frame, [PARTS.drives[1], PARTS.weapons[1]])
    expect(s4.stats.valid).toBe(false)
  })

  it('counts power from non-source parts with power production', () => {
    const frame = getFrame('interceptor')
    const absorption = RARE_PARTS.find(p => p.id === 'absorption')!
    const s = makeShip(frame, [PARTS.drives[0], absorption])
    expect(s.stats.powerProd).toBe(4)
    expect(s.stats.valid).toBe(true)
  })

  it('recognizes drives by init regardless of category', () => {
    const frame = getFrame('interceptor')
    const hybrid: Part = { id: 'bridge', name: 'Command Bridge', init: 1, powerCost: 0, tier: 1, cost: 0, cat: 'Computer', tech_category: 'Grid' }
    const s = makeShip(frame, [hybrid, PARTS.sources[0]])
    expect(isDrive(hybrid)).toBe(true)
    expect(s.drive).toBe(hybrid)
    expect(s.stats.valid).toBe(true)
  })

  it('recognizes weapons by dice regardless of category', () => {
    const frame = getFrame('interceptor')
    const hybrid: Part = { id: 'spiked_shield', name: 'Spiked Shield', dice: 1, dmgPerHit: 1, powerCost: 0, tier: 1, cost: 0, cat: 'Shield', tech_category: 'Nano', faces: [] }
    const s = makeShip(frame, [hybrid, PARTS.drives[0], PARTS.sources[0]])
    expect(isWeapon(hybrid)).toBe(true)
    expect(s.weapons).toContain(hybrid)
  })

  it('recognizes computers by aim regardless of category', () => {
    const frame = getFrame('interceptor')
    const hybrid: Part = { id: 'targeting_shield', name: 'Targeting Shield', aim: 1, powerCost: 0, tier: 1, cost: 0, cat: 'Shield', tech_category: 'Grid' }
    const s = makeShip(frame, [hybrid, PARTS.drives[0], PARTS.sources[0]])
    expect(isComputer(hybrid)).toBe(true)
    expect(s.computer).toBe(hybrid)
  })

  it('recognizes shields by shield tier regardless of category', () => {
    const frame = getFrame('interceptor')
    const hybrid: Part = { id: 'armored_computer', name: 'Armored Computer', shieldTier: 1, powerCost: 0, tier: 1, cost: 0, cat: 'Computer', tech_category: 'Nano' }
    const s = makeShip(frame, [hybrid, PARTS.drives[0], PARTS.sources[0]])
    expect(isShield(hybrid)).toBe(true)
    expect(s.shield).toBe(hybrid)
    expect(s.stats.shieldTier).toBe(1)
  })

  it('recognizes hull parts by extra hull regardless of category', () => {
    const frame = getFrame('interceptor')
    const hybrid = RARE_PARTS.find(p => p.id === 'sentient_hull')!
    const s = makeShip(frame, [hybrid, PARTS.drives[0], PARTS.sources[0]])
    expect(isHull(hybrid)).toBe(true)
    expect(s.hullParts).toContain(hybrid)
    expect(s.stats.hullCap).toBe(2)
  })

  it('getSectorSpec scales beyond predefined sectors', () => {
    const last = SECTORS[SECTORS.length-1]
    const next = getSectorSpec(last.sector + 1)
    expect(next.enemyTonnage).toBe(last.enemyTonnage + 1)
  })
})
