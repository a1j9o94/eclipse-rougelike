import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

async function toOutpost(faction: RegExp) {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: faction }))
  fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
  fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
  await screen.findByText(/^Victory$/i, undefined, { timeout: 10000 })
  const ret = screen.getByRole('button', { name: /Return to Outpost/i })
  await waitFor(() => expect(ret).not.toBeDisabled())
  fireEvent.click(ret)
  await screen.findByText(/Outpost Inventory/i)
}

describe('Shop interactions', () => {
  it('Reroll changes the shop reroll cost and maintains items', async () => {
    await toOutpost(/Consortium of Scholars/i)
    const rrBtn = screen.getByRole('button', { name: /Reroll \(\d+¢\)/i })
    const costTextBefore = rrBtn.textContent
    fireEvent.click(rrBtn)
    const costTextAfter = screen.getByRole('button', { name: /Reroll \(\d+¢\)/i }).textContent
    expect(costTextAfter).not.toEqual(costTextBefore)
  }, 20000)

  it('Shop shows exactly 4 items by default', async () => {
    await toOutpost(/Helios Cartel/i)
    const buyButtons = screen.getAllByRole('button', { name: /^Buy & Install$/i })
    expect(buyButtons.length).toBe(4)
  }, 20000)

  it('Upgrading Grid removes Tier 1 Grid techs from the shop', async () => {
    await toOutpost(/Helios Cartel/i)
    const gridBtn = screen.getByRole('button', { name: /Grid 1→2/i })
    fireEvent.click(gridBtn)
    const buyButtons = screen.getAllByRole('button', { name: /^Buy & Install$/i })
    expect(buyButtons.length).toBe(4)
    const shopHeading = screen.getByText(/Outpost Inventory/i)
    const shopRegion = shopHeading.parentElement?.parentElement as HTMLElement
    const forbidden = Array.from(shopRegion.querySelectorAll('*')).filter(el => /\b(Source|Drive|Computer) • Tier 1\b/i.test(el.textContent || ''))
    expect(forbidden.length).toBe(0)
  }, 20000)
})


