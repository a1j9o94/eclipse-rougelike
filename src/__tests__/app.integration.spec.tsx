import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App integration', () => {
  it('renders new run modal and starts a run', async () => {
    localStorage.clear()
    render(<App />)
    // Should show the start page
    expect(screen.getByText(/Choose your game mode/i)).toBeInTheDocument()

    // Start on Easy
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))

    // Should be in Combat mode (first tutorial fight)
    expect(screen.getByText(/^Enemy$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Player$/i)).toBeInTheDocument()

    // Auto-resolves to victory
    await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 })
    await new Promise(r => setTimeout(r, 200))
  }, 15000)
})


