import { describe, it, expect } from 'vitest'
import { expandDock } from '../game/hangar'
import { ECONOMY } from '../config/economy'

describe('dock expansion', () => {
  it('cannot expand beyond capacity max', () => {
    const cap = ECONOMY.dockUpgrade.capacityMax
    const result = expandDock({ credits: 100, materials: 100 }, { cap })
    expect(result).toBeNull()
  })
})
