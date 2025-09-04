import { describe, it, expect } from 'vitest'
import { randomEnemyPartsFor } from '../game/enemy'
import { FRAMES } from '../config/frames'

describe('enemy build variants', () => {
  it('aim focus includes a computer', () => {
    const parts = randomEnemyPartsFor(FRAMES.interceptor, 3, false, 'aim')
    expect(parts.some(p => p.aim)).toBe(true)
  })
  it('shield focus includes a shield', () => {
    const parts = randomEnemyPartsFor(FRAMES.interceptor, 3, false, 'shields')
    expect(parts.some(p => p.shieldTier)).toBe(true)
  })
  it('burst focus starts with multiple weapons', () => {
    const parts = randomEnemyPartsFor(FRAMES.interceptor, 3, false, 'burst')
    const weaponCount = parts.filter(p => p.dice !== undefined).length
    expect(weaponCount).toBeGreaterThanOrEqual(2)
  })
})
