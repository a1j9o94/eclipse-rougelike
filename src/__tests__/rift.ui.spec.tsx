import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompactShip } from '../components/ui'
import { makeShip, getFrame, PARTS } from '../game'

describe('CompactShip rift dice display', () => {
  it('shows rift dice when only rift conductor is installed', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const conductor = PARTS.hull.find(p=>p.id==='rift_conductor')!
    const ship = makeShip(getFrame('interceptor'), [src, drv, conductor])
    render(<CompactShip ship={ship} side="P" active={false} />)
    expect(screen.queryByText(/No weapons/i)).toBeNull()
    expect(screen.getByText(/🕳️/)).toBeInTheDocument()
  })
})
