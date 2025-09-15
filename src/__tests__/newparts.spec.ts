import { describe, it, expect } from 'vitest'
import { makeShip, getFrame } from '../game'
import { PARTS, RARE_PARTS } from '../../shared/parts'
import { volley, buildInitiative } from '../game/combat'
import { precomputeDynamicStats } from '../../shared/effectsEngine'
import type { BattleCtx } from '../../shared/effects'

describe('New part mechanics', () => {
  it('Disruptor Beam only drains initiative', () => {
    const frame = getFrame('interceptor')
    const disruptor = RARE_PARTS.find(p=>p.id==='disruptor')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const attacker = makeShip(frame, [src, drv, disruptor])
    const defender = makeShip(frame, [src, drv])
    const log: string[] = []
    const beforeInit = defender.stats.init
    const beforeHull = defender.hull
    volley(attacker, defender, 'P', log, [attacker])
    expect(defender.stats.init).toBe(beforeInit - 1)
    expect(defender.hull).toBe(beforeHull)
  })

  it('Disruptor Cannon deals damage and reduces target initiative', () => {
    const frame = getFrame('interceptor')
    const cannon = RARE_PARTS.find(p=>p.id==='disruptor_cannon')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const attacker = makeShip(frame, [src, drv, cannon])
    const defender = makeShip(frame, [src, drv])
    const log: string[] = []
    const beforeInit = defender.stats.init
    const beforeHull = defender.hull
    const rng = { next: () => 0.99 }
    volley(attacker, defender, 'P', log, [attacker], rng)
    expect(defender.stats.init).toBe(beforeInit - 1)
    expect(defender.hull).toBe(beforeHull - 1)
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

  it('Rebound Blaster can reroll on a miss', () => {
    const frame = getFrame('interceptor')
    const rebound = PARTS.weapons.find(p=>p.id==='rebound_blaster')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const attacker = makeShip(frame, [src, drv, rebound])
    const defender = makeShip(frame, [src, drv])
    const log: string[] = []
    const rng = { vals: [0, 0, 0.9], idx: 0, next(){ return this.vals[this.idx++] } }
    const beforeHull = defender.hull
    ;(globalThis as any).battleCtx = { rng: () => 0, rerollsThisRun: 0, status: { corrosion: new Map(), painter: null, fleetTempShield: null } }
    volley(attacker, defender, 'P', log, [attacker], rng as any)
    delete (globalThis as any).battleCtx
    expect(defender.hull).toBe(beforeHull - 1)
  })

  it('Fleetfire Array gains dice per ally ship', () => {
    const frame = getFrame('interceptor')
    const fleetfire = PARTS.weapons.find(p=>p.id==='fleetfire_array')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const leader = makeShip(frame, [src, drv, fleetfire])
    const ally = makeShip(frame, [src, drv])
    const ctx: BattleCtx = { rng: () => 0, rerollsThisRun: 0, status: { corrosion: new Map(), painter: null, fleetTempShield: null } }
    precomputeDynamicStats([leader, ally], [], ctx)
    expect((leader.weapons[0] as any)._dynDice).toBe((fleetfire.dice || 0) + 1)
  })

  it('Hexfire Projector gains dice per unique weapon type', () => {
    const frame = getFrame('interceptor')
    const hex = PARTS.weapons.find(p=>p.id==='hexfire_projector')!
    const plasma = PARTS.weapons.find(p=>p.id==='plasma')!
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const ship = makeShip(frame, [src, drv, hex, plasma])
    const ctx: BattleCtx = { rng: () => 0, rerollsThisRun: 0, status: { corrosion: new Map(), painter: null, fleetTempShield: null } }
    precomputeDynamicStats([ship], [], ctx)
    expect((ship.weapons[0] as any)._dynDice).toBe((hex.dice || 0) + 1)
  })
})
