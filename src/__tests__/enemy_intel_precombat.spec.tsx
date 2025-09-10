import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CombatPlanModal } from '../components/modals'
import type { ShipSnapshot } from '../../shared/mpTypes'

function makeCruiserSnap(): ShipSnapshot {
  return {
    frame: { id: 'cruiser', name: 'Cruiser' },
    weapons: [{ name: 'Plasma', dice: 1, dmgPerHit: 1 }],
    riftDice: 0,
    stats: { init: 2, hullCap: 6, valid: true, aim: 1, shieldTier: 0, regen: 0 },
    hull: 6,
    alive: true,
  }
}

describe('Enemy Intel (MP) — pre-combat seeded view', () => {
  it('uses opponent snapshot at setup when available, shows name and round', async () => {
    const multi = {
      getOpponent: () => ({ playerId: 'B', playerName: 'Bob' }),
      gameState: { gamePhase: 'setup', roundNum: 1, playerStates: { B: { fleet: [makeCruiserSnap(), makeCruiserSnap()] } } },
      roomDetails: { room: { gameConfig: { startingShips: 2 } }, players: [{ playerId: 'B', playerName: 'Bob' }] },
    }
    const { container } = render(<CombatPlanModal onClose={()=>{}} sector={1} endless={false} gameMode="multiplayer" multi={multi as any} />)
    // Title
    expect(await screen.findByText(/Enemy Intel/i)).toBeInTheDocument()
    // Name and round
    expect(await screen.findByText(/Bob — Round 1/i)).toBeInTheDocument()
    // Two ships and cruiser titles present
    const nodes = container.querySelectorAll('[data-ship]')
    expect(nodes.length).toBe(2)
    nodes.forEach(n => expect(n.getAttribute('title')).toMatch(/Cruiser/i))
  })
})
