import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('Help menu modals', () => {
  it('opens Rules and Tech modals from help buttons', async () => {
    localStorage.clear()
    render(<App />)

    // Enter a run (Easy) and dismiss the initial Rules prompt
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    const letsGo = await screen.findByRole('button', { name: /Let’s go/i })
    fireEvent.click(letsGo)

    // Desktop help buttons should be visible (sm breakpoint)
    const rulesBtn = await screen.findByRole('button', { name: /❓ Rules/i })
    fireEvent.click(rulesBtn)
    expect(await screen.findByText(/How to Play/i)).toBeInTheDocument()

    // Dismiss rules
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))

    // Open Tech list from help button
    const techBtn = await screen.findByRole('button', { name: /🔬 Tech/i })
    fireEvent.click(techBtn)
    expect(await screen.findByText(/Tech List/i)).toBeInTheDocument()
  }, 15000)
})

