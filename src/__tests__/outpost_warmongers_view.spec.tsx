import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderOutpost } from '../test/harness/renderOutpost'
import { makeShip, getFrame, PARTS } from '../game'

describe('Outpost — Warmongers first render', () => {
  it('shows Cruiser class blueprint and 3× Cruiser fleet with correct capacity used', async () => {
    const parts = [
      PARTS.sources.find(p=>p.id==='tachyon_source')!,
      PARTS.drives.find(p=>p.id==='tachyon_drive')!,
      PARTS.weapons.find(p=>p.id==='plasma_array')!,
      PARTS.computers.find(p=>p.id==='positron')!,
      PARTS.weapons.find(p=>p.id==='gauss')!,
      PARTS.platings.find(p=>p.id==='composite')!,
    ]
    const cruiser = makeShip(getFrame('cruiser'), parts)
    renderOutpost({ initial: { fleet: [cruiser, cruiser, cruiser], capacityCap: 14 } })

    // Header reflects Cruiser class blueprint
    await screen.findByText(/Class Blueprint — Cruiser/i)

    // Fleet card shows Cruiser (t2)
    const cruisers = await screen.findAllByText(/Cruiser/i)
    const card = cruisers.find(el => (el.textContent || '').match(/\(t2\)/))
    expect(card, 'Cruiser (t2) label not found in fleet card').toBeTruthy()

    // Group count ×3 visible somewhere in the hangar section
    expect(screen.getByText(/×3/)).toBeTruthy()

    // Capacity line shows Used: 6 (3 cruisers × tonnage 2); Cap: 14
    const capacityRow = await screen.findByText(/Capacity:/)
    const text = capacityRow.textContent || ''
    expect(text).toMatch(/Capacity: 14/i)
    expect(text).toMatch(/Used: 6/i)
  })
})
