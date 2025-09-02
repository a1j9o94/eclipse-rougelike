import { render, screen, waitFor } from '@testing-library/react'
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
    const ships = Array.from({length:5}, () => makeShip(getFrame('interceptor'), [src, drv]) as any)
    render(<FleetRow ships={ships} side='P' activeIdx={-1} />)
    await waitFor(() => expect(screen.getByText('×5')).toBeInTheDocument())
  })
})
