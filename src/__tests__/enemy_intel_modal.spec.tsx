import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderOutpost } from '../test/harness/renderOutpost'

describe('Enemy Intel modal (renamed + MP content)', () => {
  it('shows button and modal title as "Enemy Intel" in single-player and retains sector list', async () => {
    renderOutpost()
    // Button is renamed
    await screen.findByRole('button', { name: /Enemy Intel/i })
    fireEvent.click(screen.getByRole('button', { name: /Enemy Intel/i }))

    // Modal title/button show renamed label
    const labels = await screen.findAllByText(/Enemy Intel/i)
    expect(labels.length).toBeGreaterThan(0)
    // Single-player keeps the sector list
    expect(screen.getByText(/Sector 5 \(Boss\)/i)).toBeInTheDocument()
  })

  it('hides sector list and shows MP intel placeholder in multiplayer', async () => {
    renderOutpost({ gameMode: 'multiplayer' })
    await screen.findByRole('button', { name: /Enemy Intel/i })
    fireEvent.click(screen.getByRole('button', { name: /Enemy Intel/i }))

    // In MP, sector list is not meaningful; it should be hidden
    expect(screen.queryByText(/Sector 5 \(Boss\)/i)).toBeNull()
    // Placeholder until last-faced intel is available
    expect(await screen.findByText(/No data yet — defaults shown/i)).toBeInTheDocument()
  })
})
