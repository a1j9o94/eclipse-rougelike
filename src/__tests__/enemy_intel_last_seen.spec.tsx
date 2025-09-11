import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CombatPlanModal } from '../components/modals'
import { setLastSeenFleet } from '../multiplayer/lastSeen'
import { makeShip, FRAMES } from '../game'

describe('Enemy Intel (MP) — last faced fleet', () => {
  it('renders last-faced fleet grid when lastSeen is present', async () => {
    const oppId = 'OPP'
    const ship = makeShip(FRAMES.interceptor, []) as any
    setLastSeenFleet(oppId, [ship])
    const multiStub = {
      getOpponent: () => ({ playerId: oppId, playerName: 'Opp' }),
      roomDetails: { players: [{ playerId: oppId, lives: 4 }] },
    }
    const { container } = render(
      <CombatPlanModal onClose={()=>{}} sector={1} endless={false} gameMode="multiplayer" multi={multiStub as any} />
    )
    expect(await screen.findByText(/Last faced fleet/i)).toBeInTheDocument()
    const nodes = container.querySelectorAll('[data-ship]')
    expect(nodes.length).toBeGreaterThan(0)
    expect(await screen.findByText(/Lives: 4/i)).toBeInTheDocument()
  })
})

