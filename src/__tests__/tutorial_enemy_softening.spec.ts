import { describe, it, expect } from 'vitest'
import { buildEnemyFleet } from '../game/enemy'
import { enable as tutEnable, setStep as tutSet, disable as tutDisable } from '../tutorial/state'

const basePartIds = ['fusion_source','fusion_drive','plasma']

describe('tutorial enemy softening', () => {
  it('ramps interceptor count each combat during tutorial and falls back afterwards', () => {
    localStorage.clear()
    tutEnable();

    tutSet('intro-combat' as any)
    const first = buildEnemyFleet(1)
    expect(first).toHaveLength(1)
    first.forEach(s => {
      expect(s.frame.id).toBe('interceptor')
      expect(s.parts.map(p=>p.id)).toEqual(basePartIds)
    })

    tutSet('combat-2' as any)
    const second = buildEnemyFleet(1)
    expect(second).toHaveLength(2)
    second.forEach(s => {
      expect(s.frame.id).toBe('interceptor')
      expect(s.parts.map(p=>p.id)).toEqual(basePartIds)
    })

    tutSet('combat-3' as any)
    const third = buildEnemyFleet(1)
    expect(third).toHaveLength(3)
    third.forEach(s => {
      expect(s.frame.id).toBe('interceptor')
      expect(s.parts.map(p=>p.id)).toEqual(basePartIds)
    })

    // Finish tutorial
    tutDisable()
    const normal = buildEnemyFleet(1)
    expect(normal.length).toBeGreaterThanOrEqual(1)
  })
})
