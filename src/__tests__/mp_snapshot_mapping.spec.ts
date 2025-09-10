import { describe, it, expect } from 'vitest'
import { fromSnapshotToShip } from '../multiplayer/snapshot'
import type { ShipSnapshot } from '../../shared/mpTypes'

describe('fromSnapshotToShip', () => {
  it('maps a cruiser snapshot to a Cruiser ship', () => {
    const snap: ShipSnapshot = {
      frame: { id: 'cruiser', name: 'Cruiser' },
      weapons: [],
      riftDice: 0,
      stats: { init: 2, hullCap: 2, valid: true, aim: 0, shieldTier: 0, regen: 0 },
      hull: 2,
      alive: true,
      partIds: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite']
    }
    const ship = fromSnapshotToShip(snap)
    expect(ship.frame.id).toBe('cruiser')
    expect(ship.frame.name.toLowerCase()).toContain('cruiser')
    expect(ship.stats.valid).toBe(true)
  })
})

