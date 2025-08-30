import { describe, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('auto combat', () => {
  it('reaches victory without extra manual step', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Auto/i }))
    await screen.findByText(/Victory/i, undefined, { timeout: 10000 })
  })
})
