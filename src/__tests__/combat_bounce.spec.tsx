import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FleetRow } from '../components/FleetRow'
import { makeShip, getFrame, PARTS } from '../game'
import type { Ship } from '../../shared/types'

function twoShips(): Ship[] {
  const a = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]])
  const b = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]])
  return [a, b]
}

describe('Combat bounce cue on firing ship', () => {
  it('applies upward bounce for player side', () => {
    const ships = twoShips()
    render(<FleetRow ships={ships} side='P' activeIdx={1} />)
    const wrappers = screen.getAllByTestId('fleet-ship')
    const active = wrappers[1].querySelector('[data-ship]') as HTMLElement
    const idle = wrappers[0].querySelector('[data-ship]') as HTMLElement
    expect(active.className).toContain('fire-bounce-up')
    expect(idle.className).not.toContain('fire-bounce-up')
    expect(idle.className).not.toContain('fire-bounce-down')
  })

  it('applies downward bounce for enemy side', () => {
    const ships = twoShips()
    render(<FleetRow ships={ships} side='E' activeIdx={0} />)
    const wrappers = screen.getAllByTestId('fleet-ship')
    const active = wrappers[0].querySelector('[data-ship]') as HTMLElement
    const idle = wrappers[1].querySelector('[data-ship]') as HTMLElement
    expect(active.className).toContain('fire-bounce-down')
    expect(idle.className).not.toContain('fire-bounce-up')
    expect(idle.className).not.toContain('fire-bounce-down')
  })
})

