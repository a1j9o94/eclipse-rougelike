import { describe, it, expect } from 'vitest'
import { targetIndex } from '../game/combat'
import { makeShip, getFrame, PARTS } from '../game'
import { triggerHook } from '../../shared/effectsEngine'
import type { BattleCtx } from '../../shared/effects'

function ctx(): BattleCtx {
  return { rng: () => 0, rerollsThisRun: 0, status: { corrosion: new WeakMap(), painter: null, fleetTempShield: { P: null, E: null }, tempShield: new WeakMap() } }
}

describe('magnet parts draw fire', () => {
  it('prioritizes magnetized ships over others', () => {
    const frame = getFrame('interceptor')
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const magnetHull = PARTS.hull.find(p=>p.id==='magnet_hull')!
    const normal = makeShip(frame, [src, drv])
    const magnet = makeShip(frame, [src, drv, magnetHull])
    const fleet = [normal, magnet]
    const c = ctx()
    triggerHook(magnet.parts as any, 'onPreCombat', magnet as any, null, { allies: fleet as any, enemies: [] as any }, c)
    // ensure magnet ship has higher hull so kill-strategy would pick normal without magnet
    normal.hull = 1
    const idxKill = targetIndex(fleet as any, 'kill')
    const idxGuns = targetIndex(fleet as any, 'guns')
    expect(idxKill).toBe(1)
    expect(idxGuns).toBe(1)
  })
})

