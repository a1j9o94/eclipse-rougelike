import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FleetRow } from '../components/FleetRow'
import type { Ship } from '../../shared/types'

function fakeShip(valid: boolean): Ship {
  return {
    id: 's1',
    frame: { id: 'interceptor', name: 'Interceptor', tiles: 3, baseHull: 3, tonnage: 1 },
    parts: [],
    hull: 2,
    alive: true,
    weapons: [],
    riftDice: 0,
    stats: { init: 1, hullCap: 3, powerUse: 0, powerProd: 0, valid, aim: 0, shieldTier: 0, regen: 0 },
  } as unknown as Ship
}

describe('FleetRow post-combat hides inoperable survivors', () => {
  it('does not render ships that are alive but invalid when combatOver=true', () => {
    const ships = [fakeShip(false)]
    render(<FleetRow ships={ships} side='E' activeIdx={-1} combatOver={true} />)
    expect(screen.queryAllByTestId('fleet-ship').length).toBe(0)
  })

  it('renders the same ship during combat', () => {
    const ships = [fakeShip(false)]
    render(<FleetRow ships={ships} side='E' activeIdx={-1} combatOver={false} />)
    expect(screen.queryAllByTestId('fleet-ship').length).toBe(1)
  })
})

