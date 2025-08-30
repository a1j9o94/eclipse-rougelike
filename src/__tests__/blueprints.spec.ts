import { describe, it, expect } from 'vitest'
import { PARTS } from '../config/parts'
import { getFrame, makeShip } from '../game'
import { canInstallOnClass, updateBlueprint } from '../game/blueprints'
import type { FrameId } from '../config/frames'

describe('blueprint install rules', () => {
  it('allows installing parts that exceed power but marks ship invalid', () => {
    const frameId: FrameId = 'interceptor'
    const blueprints = { interceptor: [PARTS.sources[0], PARTS.drives[0]], cruiser: [], dread: [] }
    const chk = canInstallOnClass(blueprints, frameId, PARTS.weapons[2])
    expect(chk.ok).toBe(true)
    expect(chk.tmp.stats.valid).toBe(false)
    const res = updateBlueprint(blueprints, frameId, arr => [...arr, PARTS.weapons[2]], true)
    expect(res.updated).toBe(true)
    const ship = makeShip(getFrame(frameId), res.blueprints[frameId])
    expect(ship.stats.valid).toBe(false)
  })

  it('rejects parts when tile capacity would be exceeded', () => {
    const frameId: FrameId = 'interceptor'
    const frame = getFrame(frameId)
    const parts = Array(frame.tiles).fill(PARTS.sources[0])
    const blueprints = { interceptor: parts, cruiser: [], dread: [] }
    const chk = canInstallOnClass(blueprints, frameId, PARTS.sources[0])
    expect(chk.ok).toBe(false)
  })
})

