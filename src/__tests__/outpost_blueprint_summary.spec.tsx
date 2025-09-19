import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import BlueprintSummary from '../components/outpost/BlueprintSummary'
import { getFrame, makeShip } from '../game'
import { PARTS } from '../../shared/parts'

describe('BlueprintSummary', () => {
  it('counts multi-slot parts toward total slot usage', () => {
    const source = PARTS.sources[0]
    const drive = PARTS.drives[0]
    const multiSlot = PARTS.weapons.find(p => p.slots === 2)!
    const ship = makeShip(getFrame('interceptor'), [source, drive, multiSlot])

    render(<BlueprintSummary ship={ship} />)

    expect(screen.getByText(`⬛ 4/${ship.frame.tiles}`)).toBeInTheDocument()
  })
})
