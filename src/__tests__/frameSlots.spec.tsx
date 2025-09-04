import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompactShip } from '../components/ui'
import { makeShip, getFrame, PARTS } from '../game'

describe('CompactShip frame slots display', () => {
  it('shows filled and empty slots based on parts', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const ship = makeShip(getFrame('interceptor'), [src, drv])
    render(<CompactShip ship={ship} side='P' active={false} />)
    expect(screen.getAllByTestId('frame-slot-filled')).toHaveLength(2)
    expect(screen.getAllByTestId('frame-slot-empty')).toHaveLength(4)
  })

  it('handles multi-slot parts', () => {
    const weapon = PARTS.weapons.find(p => p.slots === 2)!
    const ship = makeShip(getFrame('cruiser'), [weapon])
    render(<CompactShip ship={ship} side='P' active={false} />)
    expect(screen.getAllByTestId('frame-slot-filled')).toHaveLength(2)
    expect(screen.getAllByTestId('frame-slot-empty')).toHaveLength(6)
  })
})
