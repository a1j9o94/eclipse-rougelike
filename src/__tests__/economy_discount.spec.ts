import { describe, expect, it } from 'vitest'
import { applyFleetDiscounts, applyEconomyModifiers } from '../game/economy'
import { PARTS, getFrame, makeShip } from '../game'
import type { FrameId } from '../game'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'

function makeTestShip(frameId: FrameId, partIds: string[]): ReturnType<typeof makeShip> {
  const frame = getFrame(frameId)
  const parts: Part[] = partIds
    .map(id => PARTS.sources.find(p => p.id === id)
      || PARTS.drives.find(p => p.id === id)
      || PARTS.weapons.find(p => p.id === id)
      || PARTS.computers.find(p => p.id === id)
      || PARTS.shields.find(p => p.id === id)
      || PARTS.hull.find(p => p.id === id))
    .filter((p): p is Part => !!p)
  return makeShip(frame, parts)
}

describe('economy discounts from fleet effects', () => {
  it('returns base modifiers when no discounts are present', () => {
    const ship = makeTestShip('interceptor', ['fusion_source', 'fusion_drive', 'plasma']) as unknown as Ship
    const mods = applyFleetDiscounts({ credits: 1, materials: 1 }, [ship])
    expect(mods).toEqual({ credits: 1, materials: 1 })
  })

  it('applies stacked percentage discounts for Bargain Plasma', () => {
    const leader = makeTestShip('interceptor', ['fusion_source', 'fusion_drive', 'bargain_plasma']) as unknown as Ship
    const wing = makeTestShip('interceptor', ['fusion_source', 'fusion_drive', 'bargain_plasma']) as unknown as Ship
    const mods = applyFleetDiscounts({ credits: 1, materials: 1 }, [leader, wing])
    expect(mods.credits).toBeCloseTo(0.81, 5)
    expect(mods.materials).toBe(1)
  })

  it('reduces shop purchase prices when Bargain Plasma is installed', () => {
    const ship = makeTestShip('interceptor', ['fusion_source', 'fusion_drive', 'bargain_plasma']) as unknown as Ship
    const fleet = [ship]
    const econ = applyFleetDiscounts({ credits: 1, materials: 1 }, fleet)
    const part = PARTS.weapons.find(p => p.id === 'plasma')!
    const discounted = applyEconomyModifiers(part.cost || 0, econ, 'credits')
    expect(discounted).toBe(22)
  })
})

