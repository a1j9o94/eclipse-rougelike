import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('Shop interactions', () => {
  it('Reroll changes the shop reroll cost and maintains items', () => {
    render(<App />)
    // Pick a faction and start on Easy
    fireEvent.click(screen.getByRole('button', { name: /Consortium of Scholars/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    // Dismiss rules then switch to Outpost (top nav button)
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Outpost$/i }))

    const rrBtn = screen.getByRole('button', { name: /Reroll \(\d+¢\)/i })
    const costTextBefore = rrBtn.textContent
    fireEvent.click(rrBtn)
    const costTextAfter = screen.getByRole('button', { name: /Reroll \(\d+¢\)/i }).textContent
    expect(costTextAfter).not.toEqual(costTextBefore)
  })

  it('Shop shows exactly 4 items by default', () => {
    render(<App />)
    // Pick a faction that starts with baseline research/resources
    // Helios Cartel gives +10 credits to afford early research but does not change shop size
    fireEvent.click(screen.getByRole('button', { name: /Helios Cartel/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Outpost$/i }))

    // Count item cards via their Buy button
    const buyButtons = screen.getAllByRole('button', { name: /^Buy & Install$/i })
    expect(buyButtons.length).toBe(4)
  })

  it('Upgrading Grid removes Tier 1 Grid techs from the shop', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Helios Cartel/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Outpost$/i }))

    // Perform Grid 1→2 research (Industrialists start with enough credits: 10 base + 10 = 20, science 1)
    const gridBtn = screen.getByRole('button', { name: /Grid 1→2/i })
    fireEvent.click(gridBtn)

    // Ensure shop still shows 4 items
    const buyButtons = screen.getAllByRole('button', { name: /^Buy & Install$/i })
    expect(buyButtons.length).toBe(4)

    // Ensure no Grid Tier 1 items appear in the Shop cards
    const shopHeading = screen.getByText(/Outpost Inventory/i)
    const shopRegion = shopHeading.parentElement?.parentElement as HTMLElement
    const forbidden = Array.from(shopRegion.querySelectorAll('*')).filter(el => /\b(Source|Drive|Computer) • Tier 1\b/i.test(el.textContent || ''))
    expect(forbidden.length).toBe(0)
  })
})


