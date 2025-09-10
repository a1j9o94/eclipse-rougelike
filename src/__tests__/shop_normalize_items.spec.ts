import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeShopItems, rollInventory, setRareTechChance, getRareTechChance } from '../game/shop'
import { ECONOMY } from '../../shared/economy'
import { ALL_PARTS, RARE_PARTS, type Part } from '../../shared/parts'

describe('normalizeShopItems', () => {
  let rndSpy: ReturnType<typeof vi.spyOn> | null = null
  let prevRare = 0
  beforeEach(() => {
    rndSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9) // avoid rare and pick first indices
    prevRare = getRareTechChance()
    setRareTechChance(0)
  })
  afterEach(() => { rndSpy?.mockRestore(); setRareTechChance(prevRare) })

  it('filters to current tier per track and fills to count with valid items', () => {
    const research = { Military: 2, Grid: 1, Nano: 3 }
    const count = ECONOMY.shop.itemsBase
    const capByCat: Record<'Military'|'Grid'|'Nano', number> = { Military: 2, Grid: 1, Nano: 3 }

    // Seed items including invalid tiers and a rare
    const badTier = ALL_PARTS.find(p => !p.rare && p.tech_category === 'Grid' && p.tier === 2) as Part
    const okTier = ALL_PARTS.find(p => !p.rare && p.tech_category === 'Grid' && p.tier === capByCat.Grid) as Part
    const rare = RARE_PARTS[0]
    const seed: Part[] = [badTier, okTier, rare].filter(Boolean) as Part[]

    const out = normalizeShopItems(seed, research, count)
    expect(out.length).toBe(count)
    // All parts match their track caps and are not rare
    for (const p of out) {
      expect(p.rare).not.toBe(true)
      expect(p.tier).toBe(capByCat[p.tech_category as 'Military'|'Grid'|'Nano'])
    }
  })

  it('returns first N items when already valid and sufficient', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 }
    const count = ECONOMY.shop.itemsBase
    const seed = rollInventory(research, count + 2)
    const out = normalizeShopItems(seed, research, count)
    expect(out).toEqual(seed.slice(0, count))
  })
})
