import { describe, it, expect } from 'vitest'
import { calcRewards, graceRecoverFleet, ensureGraceResources } from '../game/rewards'
import { makeShip, getFrame } from '../game'
import { PARTS } from '../../shared/parts'
import { INITIAL_BLUEPRINTS, INITIAL_RESOURCES } from '../../shared/defaults'
import { ECONOMY, calcRewardsForFrameId } from '../../shared/economy'

describe('rewards', () => {
  it('treats every fifth sector as a boss', () => {
    const enemy = [makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]])]
    enemy[0].alive = false
    const normal = calcRewards(enemy, 16)
    const boss = calcRewards(enemy, 15)
    expect(boss.s).toBe(normal.s + 1)
    expect(boss.m).toBe(normal.m + 1)
  })

  it('only counts destroyed ships for rewards', () => {
    const dead = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]])
    const alive = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]])
    dead.alive = false
    const rw = calcRewards([dead, alive], 1)
    const base = calcRewardsForFrameId('interceptor')
    expect(rw.c).toBe(base.c)
    expect(rw.m).toBe(base.m)
    expect(rw.s).toBe(base.s)
  })

  it('recovers the entire fleet on grace', () => {
    const fleet = [
      makeShip(getFrame('interceptor'), INITIAL_BLUEPRINTS.interceptor),
      makeShip(getFrame('cruiser'), INITIAL_BLUEPRINTS.cruiser)
    ]
    const recovered = graceRecoverFleet(fleet, INITIAL_BLUEPRINTS)
    expect(recovered.length).toBe(2)
    expect(recovered[0].frame.id).toBe('interceptor')
    expect(recovered[1].frame.id).toBe('cruiser')
  })

  it('ensures a minimum resource grant based on config', () => {
    const res = ensureGraceResources({ credits: 0, materials: 0, science: 0 })
    const minC = Math.max(ECONOMY.buildInterceptor.credits, INITIAL_RESOURCES.credits)
    const minM = Math.max(ECONOMY.buildInterceptor.materials, INITIAL_RESOURCES.materials)
    expect(res.credits).toBe(minC)
    expect(res.materials).toBe(minM)
  })
})
