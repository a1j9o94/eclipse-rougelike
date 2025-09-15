import { describe, it, expect } from 'vitest'
import { targetIndex } from '../game/combat'
import { makeShip, getFrame, PARTS } from '../game'
import { triggerHook } from '../../shared/effectsEngine'
import type { BattleCtx } from '../../shared/effects'

function ctx(): BattleCtx {
  return { rng: () => 0, rerollsThisRun: 0, status: { corrosion: new WeakMap(), painter: null, fleetTempShield: { P: null, E: null }, tempShield: new WeakMap() } }
}

describe('magnet parts draw fire', () => {
  it('prioritizes magnets and applies strategy within them', () => {
    const frame = getFrame('interceptor')
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const magnetHull = PARTS.hull.find(p=>p.id==='magnet_hull')!
    const normal = makeShip(frame, [src, drv, PARTS.weapons[0], PARTS.weapons[1], PARTS.weapons[2]])
    const magnetA = makeShip(frame, [src, drv, PARTS.weapons[0], PARTS.weapons[1], magnetHull])
    const magnetB = makeShip(frame, [src, drv, PARTS.weapons[0], magnetHull])
    const fleet = [normal, magnetA, magnetB]
    const c = ctx()
    triggerHook(magnetA.parts as any, 'onPreCombat', magnetA as any, null, { allies: fleet as any, enemies: [] as any }, c)
    triggerHook(magnetB.parts as any, 'onPreCombat', magnetB as any, null, { allies: fleet as any, enemies: [] as any }, c)
    // normal has lowest hull and most guns but is not magnetized
    normal.hull = 1
    magnetA.hull = 5
    magnetB.hull = 2
    const idxKill = targetIndex(fleet as any, 'kill')
    const idxGuns = targetIndex(fleet as any, 'guns')
    expect(idxKill).toBe(2) // magnetB lower hull
    expect(idxGuns).toBe(1) // magnetA more guns among magnets
  })
})

