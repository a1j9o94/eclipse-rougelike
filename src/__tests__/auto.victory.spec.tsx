import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('auto combat', () => {
  it('reaches victory without extra manual step', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    const wins = await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 })
    expect(wins.length).toBeGreaterThan(0)
  }, 15000)
})
