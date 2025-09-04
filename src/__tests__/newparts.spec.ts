import { describe, it, expect } from 'vitest'
import { makeShip, getFrame } from '../game'
import { PARTS, RARE_PARTS } from '../config/parts'
import { volley, buildInitiative } from '../game/combat'

describe('New part mechanics', () => {
  it('Disruptor Beam reduces target initiative', () => {
    const frame = getFrame('interceptor')
    const disruptor = RARE_PARTS.find(p=>p.id==='disruptor')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const attacker = makeShip(frame, [src, drv, disruptor])
    const defender = makeShip(frame, [src, drv])
    const log: string[] = []
    const before = defender.stats.init
    volley(attacker, defender, 'P', log, [attacker])
    expect(defender.stats.init).toBe(before - 1)
  })

  it('Auto-Repair Hull regenerates at round start', () => {
    const frame = getFrame('interceptor')
    const auto = RARE_PARTS.find(p=>p.id==='auto_repair')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const ship = makeShip(frame, [src, drv, auto])
    ship.hull -= 1
    buildInitiative([ship], [])
    expect(ship.hull).toBe(ship.stats.hullCap)
  })

  it('Two-slot weapons consume extra tiles', () => {
    const frame = getFrame('interceptor')
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const plasma = PARTS.weapons.find(p=>p.id==='plasma_battery')!
    const ship = makeShip(frame, [src, drv, plasma, plasma, PARTS.hull[0]])
    expect(ship.stats.valid).toBe(false)
  })
})
