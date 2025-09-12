import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App integration', () => {
  it('renders start page with Launch button', async () => {
    localStorage.clear()
    localStorage.setItem('ui-starfield-enabled', 'false')
    render(<App />)
    // Should show the start page (Launch button visible)
    expect(screen.getByRole('button', { name: /^Launch$/ })).toBeInTheDocument()

    // Launch button visible on Start page
    expect(screen.getByRole('button', { name: /^Launch$/ })).toBeInTheDocument()
  }, 15000)
})
