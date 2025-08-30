import { describe, it, expect } from 'vitest'
import { successThreshold, rollInventory, getFrame, makeShip, PARTS, tierCap } from '../game'

describe('Runtime self-tests (moved from App)', () => {
  it('combat threshold clamps', () => {
    expect(successThreshold(-5, 10)).toBe(6)
    expect(successThreshold(10, -5)).toBe(2)
  })

  it('shop respects tier caps and returns requested count', () => {
    const research = {Military:1, Grid:1, Nano:1}
    const items = rollInventory(research, 8)
    const caps = tierCap(research)
    expect(items.length).toBe(8)
    expect(items.every(p => p.tier === caps[p.tech_category as 'Military'|'Grid'|'Nano'])).toBe(true)
  })

  it('makeShip valid for all frames', () => {
    ;(['interceptor','cruiser','dread'] as const).forEach(id => {
      const f = getFrame(id)
      const s = makeShip(f, [PARTS.sources[0], PARTS.drives[0]])
      expect(s.stats.hullCap).toBeGreaterThanOrEqual(1)
      expect(s.stats.valid).toBe(true)
    })
  })
})


