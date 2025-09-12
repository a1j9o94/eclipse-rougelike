import { describe, it, expect } from 'vitest'
import { buildEnemyFleet } from '../game/enemy'
import { enable as tutEnable, setStep as tutSet, disable as tutDisable } from '../tutorial/state'

describe('tutorial enemy softening', () => {
  it('scales interceptor count during tutorial and falls back afterwards', () => {
    localStorage.clear()
    tutEnable();
    tutSet('intro-combat' as any)

    const round1 = buildEnemyFleet(1)
    expect(round1).toHaveLength(1)
    expect(round1[0].frame.id).toBe('interceptor')
    expect(round1[0].parts).toHaveLength(3)

    const round2 = buildEnemyFleet(2)
    expect(round2).toHaveLength(2)
    expect(round2.every(s => s.frame.id === 'interceptor')).toBe(true)
    expect(round2.every(s => s.parts.length === 3)).toBe(true)

    const round4 = buildEnemyFleet(4)
    expect(round4).toHaveLength(3)
    expect(round4.every(s => s.frame.id === 'interceptor')).toBe(true)

    // Finish tutorial
    tutDisable()
    const normal = buildEnemyFleet(1)
    // Normal pacing allows multiple ships and different frames
    expect(normal.length).toBeGreaterThanOrEqual(1)
  })
})

