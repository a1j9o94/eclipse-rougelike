import { describe, it, expect } from 'vitest'
import { getFrame, makeShip, type FrameId } from '../game'
import type { Ship } from '../../shared/types'
import { PARTS } from '../../shared/parts'

// Import lazily to ensure TS types align with existing exports
import * as Hangar from '../game/hangar'

const econ = { credits: 1, materials: 1 } as const

describe('MP ship upgrade parity with SP', () => {
  it('seeds cruiser blueprint from first interceptor upgrade (MP)', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0]]
    const fleet: Ship[] = [makeShip(getFrame('interceptor'), interceptorParts)]
    const blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: [], dread: [] }
    const res = Hangar.upgradeShipAtWithMods(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0, econ)
    expect(res?.upgraded.parts.map(p=>p.id)).toEqual(interceptorParts.map(p=>p.id))
    expect(res?.blueprints.cruiser.map(p=>p.id)).toEqual(interceptorParts.map(p=>p.id))
  })

  it('first upgrade inherits parts even if target blueprint prefilled (no cruiser exists) (MP)', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0]]
    const prefilledCruiser = [PARTS.sources[1], PARTS.drives[1]]
    const fleet: Ship[] = [makeShip(getFrame('interceptor'), interceptorParts)]
    const blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: prefilledCruiser as typeof interceptorParts, dread: [] as typeof interceptorParts }
    const res = Hangar.upgradeShipAtWithMods(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0, econ)
    const inheritedIds = interceptorParts.map(p=>p.id)
    expect(res?.upgraded.parts.map(p=>p.id)).toEqual(inheritedIds)
    expect(res?.blueprints.cruiser.map(p=>p.id)).toEqual(inheritedIds)
  })

  it('subsequent upgrade uses established class blueprint when a cruiser exists (MP)', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0]]
    const cruiserBp = [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[1]]
    const fleet: Ship[] = [
      makeShip(getFrame('cruiser'), cruiserBp),
      makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0], PARTS.computers[0]]),
    ]
    const blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: cruiserBp as typeof interceptorParts, dread: [] as typeof interceptorParts }
    const res = Hangar.upgradeShipAtWithMods(1, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, fleet[0].frame.tonnage, econ)
    const expectedIds = cruiserBp.map(p=>p.id)
    expect(res?.upgraded.frame.id).toBe('cruiser')
    expect(res?.upgraded.parts.map(p=>p.id)).toEqual(expectedIds)
  })

  it('applies updated blueprints to subsequent upgrades (MP)', () => {
    const interceptorParts = [PARTS.sources[0], PARTS.drives[0]]
    let blueprints: Record<FrameId, typeof interceptorParts> = { interceptor: interceptorParts, cruiser: [], dread: [] }
    const fleet: Ship[] = [
      makeShip(getFrame('interceptor'), interceptorParts),
      makeShip(getFrame('interceptor'), interceptorParts)
    ]

    const first = Hangar.upgradeShipAtWithMods(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0, econ)
    if(first){
      blueprints = first.blueprints
      fleet[0] = first.upgraded
    }

    blueprints.cruiser = [...blueprints.cruiser, PARTS.weapons[2]]

    const second = Hangar.upgradeShipAtWithMods(1, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0, econ)
    expect(second?.upgraded.parts.map(p=>p.id)).toEqual(blueprints.cruiser.map(p=>p.id))
  })

  it('seeds dreadnought blueprint from first cruiser upgrade (MP)', () => {
    const cruiserParts = [PARTS.sources[0], PARTS.drives[0]]
    const fleet: Ship[] = [makeShip(getFrame('cruiser'), cruiserParts)]
    const blueprints: Record<FrameId, typeof cruiserParts> = { interceptor: cruiserParts, cruiser: cruiserParts, dread: [] }
    const res = Hangar.upgradeShipAtWithMods(0, fleet, blueprints, { credits: 1000, materials: 1000 }, { Military: 3 }, { cap: 999 }, 0, econ)
    expect(res?.upgraded.parts.map(p=>p.id)).toEqual(cruiserParts.map(p=>p.id))
    expect(res?.blueprints.dread.map(p=>p.id)).toEqual(cruiserParts.map(p=>p.id))
  })
})

