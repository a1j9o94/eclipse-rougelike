import { describe, it, expect } from 'vitest'
import {
  successThreshold,
  tierCap,
  makeShip,
  getFrame,
  PARTS,
} from '../App'

describe('core helpers', () => {
  it('successThreshold clamps between 2 and 6', () => {
    expect(successThreshold(-5 as any, 10 as any)).toBe(6)
    expect(successThreshold(10 as any, -5 as any)).toBe(2)
  })

  it('tierCap averages and clamps 1..3', () => {
    expect(tierCap({ Military: 1, Grid: 1, Nano: 1 })).toBe(1)
    expect(tierCap({ Military: 3, Grid: 3, Nano: 3 })).toBe(3)
    expect(tierCap({ Military: 1, Grid: 3, Nano: 2 })).toBeGreaterThanOrEqual(1)
    expect(tierCap({ Military: 1, Grid: 3, Nano: 2 })).toBeLessThanOrEqual(3)
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
})


