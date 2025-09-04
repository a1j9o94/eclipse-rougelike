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
    const filled = screen.getAllByTestId('frame-slot-filled')
    expect(filled.length).toBe(ship.parts.length)
    expect(screen.getAllByTestId('frame-slot-empty').length).toBe(Math.max(0, ship.frame.tiles - used))
    const icons = filled.map(el => el.textContent)
    expect(icons).toContain('⚡+')
    expect(icons).toContain('🚀')
    expect(icons).toContain('2🎲')
  })

  it('shows black hearts for destroyed hull', () => {
    const hull = PARTS.hull[0]
    const ship = makeShip(getFrame('interceptor'), [hull])
    ship.hull = 1
    render(<CompactShip ship={ship} side="P" active={false} />)
    const icons = screen.getAllByTestId('frame-slot-filled').map(el => el.textContent)
    expect(icons).toContain('🖤')
    expect(icons).not.toContain('❤️')
  })

  it('arranges rows based on frame layout', () => {
    const cruiser = makeShip(getFrame('cruiser'), [])
    render(<CompactShip ship={cruiser} side="P" active={false} />)
    const rows = screen.getAllByTestId('frame-slot-row')
    expect(rows.length).toBe(3)
    expect(rows[0].children.length).toBe(3)
    expect(rows[1].children.length).toBe(3)
    expect(rows[2].children.length).toBe(2)
  })
})
