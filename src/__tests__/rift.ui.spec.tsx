import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompactShip } from '../components/ui'
import { makeShip, getFrame, PARTS, type Part } from '../game'

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

  it('shows dice on non-weapon parts with dice', () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const hybrid: Part = {
      id: 'shield_gun',
      name: 'Shield Gun',
      cat: 'Shield',
      tier: 1,
      cost: 0,
      tech_category: 'Nano',
      shieldTier: 1,
      dice: 1,
      dmgPerHit: 1,
      faces: [{ dmg: 1 }],
    }
    const ship = makeShip(getFrame('interceptor'), [src, drv, hybrid])
    render(<CompactShip ship={ship} side="P" active={false} />)
    expect(screen.queryByText(/No weapons/i)).toBeNull()
    expect(screen.getByText('1🎲 × 1')).toBeInTheDocument()
  })
})
