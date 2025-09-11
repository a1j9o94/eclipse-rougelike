import { describe, it, expect } from 'vitest'
import { buildEnemyFleet } from '../game/enemy'
import { enable as tutEnable, setStep as tutSet, disable as tutDisable } from '../tutorial/state'

describe('tutorial enemy softening', () => {
  it('uses a basic interceptor during tutorial and normal pacing afterwards', () => {
    localStorage.clear()
    tutEnable(); tutSet('intro-combat' as any)
    const soft = buildEnemyFleet(1)
    expect(soft).toHaveLength(1)
    expect(soft[0].frame.id).toBe('interceptor')
    // Finish tutorial
    tutDisable()
    const normal = buildEnemyFleet(1)
    // Normal pacing allows multiple ships and different frames
    expect(normal.length).toBeGreaterThanOrEqual(1)
  })
})

