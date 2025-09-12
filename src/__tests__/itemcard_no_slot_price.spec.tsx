import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItemCard } from '../components/ui'
import type { Part } from '../../shared/parts'
import type { GhostDelta } from '../../shared/types'

describe('ItemCard', () => {
  it('shows price when disabled for slot', () => {
    const part: Part = { id: 'p1', name: 'Test Part', tier: 1, cost: 123, tech_category: 'Military', cat: 'Hull', slots: 1 }
    const ghost: GhostDelta = {
      targetName: 'ship',
      use: 0,
      prod: 0,
      valid: true,
      slotsUsed: 2,
      slotCap: 1,
      slotOk: false,
      initBefore: 0,
      initAfter: 0,
      initDelta: 0,
      hullBefore: 0,
      hullAfter: 0,
      hullDelta: 0,
    }
    render(
      <ItemCard item={part} price={part.cost} canAfford={true} onBuy={() => {}} ghostDelta={ghost} />
    )
    const btn = screen.getByRole('button', { name: /No Slot/i })
    expect(btn.textContent).toContain('123¢')
  })
})
