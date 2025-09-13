import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('auto combat', () => {
  it('reaches victory without extra manual step', async () => {
    render(<App />)
    // Open Launch panel and start a Solo Easy run (default)
    fireEvent.click(screen.getByRole('button', { name: /Launch/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/i }))
    const wins = await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 })
    expect(wins.length).toBeGreaterThan(0)
  }, 15000)
})
