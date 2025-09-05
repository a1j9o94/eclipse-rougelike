import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { FleetRow } from '../components/FleetRow'
import { makeShip, getFrame, PARTS } from '../game'

describe('FleetRow', () => {
  let original: PropertyDescriptor | undefined
  beforeAll(() => {
    original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 200 })
  })
  afterAll(() => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', original)
    }
  })

  it('groups ships when width is small', async () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const ships = Array.from({length:5}, () => makeShip(getFrame('interceptor'), [src, drv]))
    render(<FleetRow ships={ships} side='P' activeIdx={-1} />)
    await waitFor(() => expect(screen.getByText('×5')).toBeInTheDocument())
  })

  it('removes destroyed ships from stacks', async () => {
    const src = PARTS.sources[0]
    const drv = PARTS.drives[0]
    const ships = Array.from({length:3}, () => makeShip(getFrame('interceptor'), [src, drv]))
    ships[0].hull = 0
    ships[0].alive = false
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 150 })
    render(<FleetRow ships={ships} side='P' activeIdx={-1} />)
    await waitFor(() => expect(screen.getByText('×2')).toBeInTheDocument())
    expect(screen.queryByText('×3')).toBeNull()
  })

  it('positions ships with measured width', () => {
    const ship1 = makeShip(getFrame('interceptor'), [])
    const ship2 = makeShip(getFrame('interceptor'), [])
    render(<FleetRow ships={[ship1, ship2]} side='P' activeIdx={-1} />)
    const row = screen.getByTestId('fleet-row') as HTMLElement
    Object.defineProperty(row, 'offsetWidth', { value: 200, configurable: true })
    const cards = row.querySelectorAll('[data-ship]')
    cards.forEach(card => Object.defineProperty(card, 'offsetWidth', { value: 80, configurable: true }))
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    const ships = screen.getAllByTestId('fleet-ship')
    expect(ships[1].style.left).toBe('88px')
  })
})
