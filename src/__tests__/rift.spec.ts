import { describe, it, expect } from 'vitest'
import { makeShip, getFrame, PARTS, RARE_PARTS } from '../game'
import { volley } from '../game/combat'

describe('rift weapons', () => {
  it('assigns self-damage to largest killable rift ship', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const rift = RARE_PARTS.find(p=>p.id==='rift_cannon')!
    const attacker = makeShip(getFrame('interceptor'), [src, drv, rift])
    const ally = makeShip(getFrame('dread'), [src, drv, rift])
    const defender = makeShip(getFrame('interceptor'), [src, drv])
    const seq = [0.5] // face 4 -> self-damage only
    const orig = Math.random
    Math.random = () => seq.shift()!
    volley(attacker, defender, 'P', [], [attacker, ally])
    Math.random = orig
    expect(ally.alive).toBe(false)
    expect(attacker.alive).toBe(true)
  })

  it('rift conductor grants extra rift die', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const rift = RARE_PARTS.find(p=>p.id==='rift_cannon')!
    const conductor = RARE_PARTS.find(p=>p.id==='rift_conductor')!
    const attacker = makeShip(getFrame('interceptor'), [src, drv, rift, conductor])
    const defender = makeShip(getFrame('interceptor'), [src, drv])
    const seq = [0, 0.2] // faces 1 and 2 -> total 3 dmg
    const orig = Math.random
    Math.random = () => seq.shift()!
    volley(attacker, defender, 'P', [], [attacker])
    Math.random = orig
    expect(defender.alive).toBe(false)
    expect(attacker.alive).toBe(true)
  })
})

