import { describe, it, expect } from 'vitest'
import { getStartingLives, getDefeatPolicy } from '../../shared/difficulty'

describe('Single-player lives configuration', () => {
  it('provides explicit starting lives per difficulty', () => {
    expect(getStartingLives('easy')).toBe(1)
    expect(getStartingLives('medium')).toBe(1)
    expect(getStartingLives('hard')).toBe(0)
  })

  it('defeat policy derives from lives for backward compatibility', () => {
    expect(getDefeatPolicy('easy')).toBe('grace')
    expect(getDefeatPolicy('medium')).toBe('grace')
    expect(getDefeatPolicy('hard')).toBe('reset')
  })
})

