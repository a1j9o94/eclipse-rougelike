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
})


