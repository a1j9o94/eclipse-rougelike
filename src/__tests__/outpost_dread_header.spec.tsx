import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderOutpost } from '../test/harness/renderOutpost'
import { makeShip, getFrame, PARTS } from '../game'

describe('Outpost — Dreadnought header when startingFrame=dread', () => {
  it('shows Class Blueprint — Dreadnought on first render', async () => {
    const dread = makeShip(
      getFrame('dread'),
      [
        PARTS.sources.find(p=>p.id==='zero_point')!,
        PARTS.drives.find(p=>p.id==='warp_drive')!,
        PARTS.weapons.find(p=>p.id==='plasma_battery')!,
        PARTS.computers.find(p=>p.id==='neutrino')!,
        PARTS.shields.find(p=>p.id==='omega')!,
        PARTS.hull.find(p=>p.id==='monolith_plating')!,
      ]
    )
    renderOutpost({ initial: { fleet: [dread], capacityCap: 10 } })
    expect(await screen.findByText(/Class Blueprint — Dreadnought/i)).toBeTruthy()
  })
})
