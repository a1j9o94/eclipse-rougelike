import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App integration', () => {
  it('renders new run modal and starts a run', async () => {
    localStorage.clear()
    localStorage.setItem('ui-starfield-enabled', 'false')
    render(<App />)
    // Should show the start page (Launch button visible)
    expect(screen.getByRole('button', { name: /^Launch$/ })).toBeInTheDocument()

    // Start on Easy and dismiss Rules when shown
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }))
    const launchBtns = screen.getAllByRole('button', { name: /^Launch$/ })
    fireEvent.click(launchBtns[launchBtns.length-1])
    // Dismiss initial Rules if present
    const howTo = screen.queryByText(/How to Play/i)
    if (howTo) {
      const goBtn = await screen.findByRole('button', { name: /Let’s go/i })
      fireEvent.click(goBtn)
    }
    // Find Start Combat if in Outpost
    const btns = screen.getAllByRole('button')
    const start = btns.find(b => /Start Combat/i.test(b.textContent||''))
    if (start) fireEvent.click(start)
    // Eventually we should see Victory after auto-resolve
    await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 })
  }, 15000)
})
