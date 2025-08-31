import { describe, it, expect } from 'vitest'
import { makeShip, getFrame, PARTS, RARE_PARTS } from '../game'
import { volley } from '../game/combat'

describe('weapon dice faces', () => {
  it('standard die uses weapon-specific damage face', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const antimatter = PARTS.weapons.find(p=>p.id==='antimatter')!
    const hullp = PARTS.hull.find(p=>p.id==='improved')!
    const attacker = makeShip(getFrame('interceptor'), [src, drv, antimatter])
    const defender = makeShip(getFrame('interceptor'), [src, drv, hullp])
    const seq = [0.95]
    const orig = Math.random
    Math.random = () => seq.shift()!
    volley(attacker, defender, 'P', [], [attacker])
    Math.random = orig
    expect(defender.hull).toBe(defender.stats.hullCap - antimatter.dmgPerHit!)
  })

  it('spike launcher deals big damage on spike face', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const spike = RARE_PARTS.find(p=>p.id==='spike_launcher')!
    const hullp = PARTS.hull.find(p=>p.id==='improved')!
    const attacker = makeShip(getFrame('interceptor'), [src, drv, spike])
    const defender = makeShip(getFrame('interceptor'), [src, drv, hullp])
    const seq = [0.95]
    const orig = Math.random
    Math.random = () => seq.shift()!
    volley(attacker, defender, 'P', [], [attacker])
    Math.random = orig
    expect(defender.hull).toBe(defender.stats.hullCap - 3)
  })
})
