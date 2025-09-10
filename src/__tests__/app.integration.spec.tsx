import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App integration', () => {
  it('renders new run modal and starts a run', async () => {
    localStorage.clear()
    render(<App />)
    // Should show the start page
    expect(screen.getByText(/Choose your game mode/i)).toBeInTheDocument()

    // Start on Easy and dismiss Rules when shown
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    const goBtn = await screen.findByRole('button', { name: /Let’s go/i })
    fireEvent.click(goBtn)

    // Should be in Combat mode (first tutorial fight)
    expect(screen.getByText(/^Enemy$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Player$/i)).toBeInTheDocument()

    // Auto-resolves to victory
    await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 })
  }, 15000)
})

