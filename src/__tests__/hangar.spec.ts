import { describe, it, expect } from 'vitest'
import { expandDock, upgradeShipAt } from '../game/hangar'
import { ECONOMY } from '../config/economy'
import { makeShip, getFrame } from '../game'
import { PARTS } from '../config/parts'
import { INITIAL_BLUEPRINTS } from '../config/defaults'

describe('dock expansion', () => {
  it('cannot expand beyond capacity max', () => {
    const cap = ECONOMY.dockUpgrade.capacityMax
    const result = expandDock({ credits: 100, materials: 100 }, { cap })
    expect(result).toBeNull()
  })
})

describe('ship upgrade', () => {
  it('retains existing parts when upgrading', () => {
    const extra = PARTS.hull[2]
    const base = [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.computers[0], extra]
    const ship = makeShip(getFrame('interceptor'), base)
    const fleet = [ship] as any
    const result = upgradeShipAt(0, fleet, INITIAL_BLUEPRINTS, { credits: 100, materials: 100 }, { Military: 3 }, { cap: 10 }, 1)
    expect(result?.upgraded.parts).toContain(extra)
  })
})
