import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompactShip } from '../components/ui'
import { makeShip, getFrame, PARTS } from '../game'

describe('CompactShip hull display', () => {
  it('switches to numeric hull when cap is large', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const ship = makeShip(getFrame('interceptor'), [src, drv])
    ship.stats.hullCap = 25
    ship.hull = 10
    render(<CompactShip ship={ship} side="P" active={false} />)
    expect(screen.getByText('10/25 🤎')).toBeInTheDocument()
  })
})
