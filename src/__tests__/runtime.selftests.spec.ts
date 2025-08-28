import { describe, it, expect } from 'vitest'
import { successThreshold, rollInventory, getFrame, makeShip, PARTS, type Part } from '../game'

describe('Runtime self-tests (moved from App)', () => {
  it('combat threshold clamps', () => {
    expect(successThreshold(-5, 10)).toBe(6)
    expect(successThreshold(10, -5)).toBe(2)
  })

  it('shop guarantees include basics', () => {
    const items = rollInventory({Military:1, Grid:1, Nano:1}, 8)
    const has = (pred:(p:Part)=>boolean)=> items.some(pred)
    const isSource = (p:Part)=> 'powerProd' in p
    const isDrive = (p:Part)=> 'init' in p
    const isWeapon = (p:Part)=> 'dice' in p
    expect(has(isDrive)).toBe(true)
    expect(has(isSource)).toBe(true)
    expect(has(isWeapon)).toBe(true)
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


