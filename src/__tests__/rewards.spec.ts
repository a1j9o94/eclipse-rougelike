import { describe, it, expect } from 'vitest'
import { calcRewards } from '../game/rewards'
import { makeShip, getFrame } from '../game'
import { PARTS } from '../config/parts'

describe('rewards', () => {
  it('treats every fifth sector as a boss', () => {
    const enemy = [makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]])] as any
    const normal = calcRewards(enemy, 16)
    const boss = calcRewards(enemy, 15)
    expect(boss.s).toBe(normal.s + 1)
    expect(boss.m).toBe(normal.m + 1)
  })
})
