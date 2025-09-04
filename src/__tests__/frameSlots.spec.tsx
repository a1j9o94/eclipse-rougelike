import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompactShip } from '../components/ui'
import { makeShip, getFrame, PARTS } from '../game'

// Ensure ship frame slots render filled and empty boxes based on installed parts
describe('CompactShip frame slot display', () => {
  it('fills slots according to part slot usage', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const bigWeapon = PARTS.weapons.find(p => p.id === 'plasma_battery')!
    const ship = makeShip(getFrame('interceptor'), [src, drv, bigWeapon])
    render(<CompactShip ship={ship} side="P" active={false} />)
    const used = ship.parts.reduce((a, p) => a + (p.slots || 1), 0)
    expect(screen.getAllByTestId('frame-slot-filled').length).toBe(used)
    expect(screen.getAllByTestId('frame-slot-empty').length).toBe(ship.frame.tiles - used)
  })
})
