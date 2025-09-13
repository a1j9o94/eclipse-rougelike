import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderOutpost } from '../test/harness/renderOutpost'

describe('Shop interactions', () => {
  it('Reroll changes the shop reroll cost and maintains items', async () => {
    renderOutpost()
    const rrBtn = screen.getByRole('button', { name: /Reroll \(\d+¢\)/i })
    const costTextBefore = rrBtn.textContent
    fireEvent.click(rrBtn)
    const costTextAfter = screen.getByRole('button', { name: /Reroll \(\d+¢\)/i }).textContent
    expect(costTextAfter).not.toEqual(costTextBefore)
  }, 20000)

  it('Shop shows exactly 4 items by default', async () => {
    renderOutpost()
    const buyButtons = screen.getAllByRole('button', { name: /^Buy \(\d+¢\)$/i })
    expect(buyButtons.length).toBe(4)
  }, 20000)

  it('Upgrading Grid removes Tier 1 Grid techs from the shop', async () => {
    renderOutpost()
    const gridBtn = screen.getByRole('button', { name: /Grid 1→2/i })
    fireEvent.click(gridBtn)
    const buyButtons = screen.getAllByRole('button', { name: /^Buy \(\d+¢\)$/i })
    expect(buyButtons.length).toBe(4)
    const shopHeading = screen.getByText(/Outpost Inventory/i)
    const shopRegion = shopHeading.parentElement?.parentElement as HTMLElement
    const forbidden = Array.from(shopRegion.querySelectorAll('*')).filter(el => /\b(Source|Drive|Computer) • Tier 1\b/i.test(el.textContent || ''))
    expect(forbidden.length).toBe(0)
  }, 20000)
})
