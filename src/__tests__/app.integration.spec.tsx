import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App integration', () => {
  it('renders new run modal and starts a run', async () => {
    render(<App />)
    // Should see Start New Run options
    expect(screen.getByText(/Start New Run/i)).toBeInTheDocument()

    // Start on Easy
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))

    // Should be in Combat mode (first tutorial fight)
    expect(screen.getByText(/^Enemy$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Player$/i)).toBeInTheDocument()

    // Auto-resolves to victory
    await screen.findByText(/Victory/i, undefined, { timeout: 10000 })
  }, 15000)
})


