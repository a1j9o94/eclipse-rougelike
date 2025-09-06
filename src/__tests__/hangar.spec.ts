import { describe, it, expect } from 'vitest'
import { expandDock, upgradeShipAt } from '../game/hangar'
import { ECONOMY } from '../config/economy'
import { makeShip, getFrame, type FrameId } from '../game'
import type { Ship } from '../config/types'
import { PARTS } from '../config/parts'

describe('dock expansion', () => {
  it('cannot expand beyond capacity max', () => {
    const cap = ECONOMY.dockUpgrade.capacityMax
    const result = expandDock({ credits: 100, materials: 100 }, { cap })
    expect(result).toBeNull()
  })
})

describe('ship upgrade', () => {
  it('seeds cruiser blueprint from first interceptor upgrade', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0]]
    const fleet: Ship[] = [makeShip(getFrame('interceptor'), interceptorParts)]
    const blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: [], dread: [] }
    const result = upgradeShipAt(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0)
    expect(result?.upgraded.parts.map(p=>p.id)).toEqual(interceptorParts.map(p=>p.id))
    expect(result?.blueprints.cruiser.map(p=>p.id)).toEqual(interceptorParts.map(p=>p.id))
  })

  it('first upgrade inherits parts even if target blueprint was prefilled (no cruiser exists)', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0]]
    const prefilledCruiser = [PARTS.sources[1], PARTS.drives[1]]
    const fleet: Ship[] = [makeShip(getFrame('interceptor'), interceptorParts)]
    const blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: prefilledCruiser as any, dread: [] as any }
    const result = upgradeShipAt(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0)
    const inheritedIds = interceptorParts.map(p=>p.id)
    expect(result?.upgraded.parts.map(p=>p.id)).toEqual(inheritedIds)
    expect(result?.blueprints.cruiser.map(p=>p.id)).toEqual(inheritedIds)
  })

  it('subsequent upgrade uses established class blueprint when a cruiser exists', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0]]
    const cruiserBp = [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[1]]
    const fleet: Ship[] = [
      makeShip(getFrame('cruiser'), cruiserBp), // cruiser already in fleet
      makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0], PARTS.computers[0]]),
    ]
    const blueprints: Record<FrameId, any> = { interceptor: interceptorParts, cruiser: cruiserBp, dread: [] }
    const result = upgradeShipAt(1, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, fleet[0].frame.tonnage)
    const expectedIds = cruiserBp.map(p=>p.id)
    expect(result?.upgraded.frame.id).toBe('cruiser')
    expect(result?.upgraded.parts.map(p=>p.id)).toEqual(expectedIds)
  })
  it('applies updated blueprints to subsequent upgrades', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0]]
    let blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: [], dread: [] }
    const fleet: Ship[] = [
      makeShip(getFrame('interceptor'), interceptorParts),
      makeShip(getFrame('interceptor'), interceptorParts)
    ]

    const first = upgradeShipAt(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0)
    if(first){
      blueprints = first.blueprints
      fleet[0] = first.upgraded
    }

    blueprints.cruiser = [...blueprints.cruiser, PARTS.weapons[2]]

    const second = upgradeShipAt(1, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0)
    expect(second?.upgraded.parts.map(p=>p.id)).toEqual(blueprints.cruiser.map(p=>p.id))
  })

  it('seeds dreadnought blueprint from first cruiser upgrade', () => {
    const cruiserParts = [PARTS.sources[0], PARTS.drives[0]]
    const fleet: Ship[] = [makeShip(getFrame('cruiser'), cruiserParts)]
    const blueprints: Record<FrameId, typeof cruiserParts> = { interceptor: cruiserParts, cruiser: cruiserParts, dread: [] }
    const result = upgradeShipAt(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0)
    expect(result?.upgraded.parts.map(p=>p.id)).toEqual(cruiserParts.map(p=>p.id))
    expect(result?.blueprints.dread.map(p=>p.id)).toEqual(cruiserParts.map(p=>p.id))
  })
})
