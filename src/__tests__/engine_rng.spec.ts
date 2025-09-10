import { describe, it, expect } from 'vitest'
import { createRng, fromMathRandom } from '../engine/rng'

describe('engine rng', () => {
  it('same seed yields same sequence', () => {
    const a = createRng(1234)
    const b = createRng(1234)
    const seqA = Array.from({ length: 5 }, () => a.next())
    const seqB = Array.from({ length: 5 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('different seeds yield different sequences', () => {
    const a = createRng(1)
    const b = createRng(2)
    const sa = Array.from({ length: 5 }, () => a.next())
    const sb = Array.from({ length: 5 }, () => b.next())
    expect(sa).not.toEqual(sb)
  })

  it('fromMathRandom roughly in [0,1)', () => {
    const r = fromMathRandom()
    for (let i = 0; i < 3; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

