import { describe, it, expect } from 'vitest'
import { rollInventory } from '../game/shop'
import { createRng } from '../engine/rng'

describe('shop.rollInventory determinism with seeded RNG', () => {
  const research = { Military: 1, Grid: 1, Nano: 1 }

  it('same seed -> same items (by id sequence)', () => {
    const r1 = createRng('seed-42')
    const r2 = createRng('seed-42')
    const a = rollInventory(research, undefined, r1)
    const b = rollInventory(research, undefined, r2)
    expect(a.map(p => p.id)).toEqual(b.map(p => p.id))
  })

  it('different seeds -> different sequences usually', () => {
    const a = rollInventory(research, undefined, createRng('A'))
    const b = rollInventory(research, undefined, createRng('B'))
    // It is statistically unlikely to be equal; allow non-strict by checking at least one diff
    expect(a.map(p => p.id)).not.toEqual(b.map(p => p.id))
  })
})
