import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { useMpPhaseNav } from '../hooks/useMpPhaseNav'
import { CombatPlanModal } from '../components/modals'
import type { ShipSnapshot, PlayerState } from '../../shared/mpTypes'

function makeIntSnap(): ShipSnapshot {
  return {
    frame: { id: 'interceptor', name: 'Interceptor' },
    weapons: [{ name: 'Auto', dice: 1, dmgPerHit: 1 }],
    riftDice: 0,
    stats: { init: 2, hullCap: 3, valid: true, aim: 1, shieldTier: 0, regen: 0 },
    hull: 3,
    alive: true,
  }
}

function PhaseNavHarness({ multi }: { multi: any }){
  useMpPhaseNav({ gameMode: 'multiplayer', multi, setters: {
    setMode: () => {}, setFleet: () => {}, setEnemyFleet: () => {}, setMultiplayerPhase: () => {}, setLog: () => {},
  } })
  return null
}

describe('Enemy Intel — integration via phase nav cache', () => {
  it('stores last-seen on combat and modal reads it as "Last faced fleet"', async () => {
    const playerStates: Record<string, PlayerState> = {
      A: { fleet: [makeIntSnap()] },
      B: { fleet: [makeIntSnap()] },
    }
    const multi = {
      getPlayerId: () => 'A',
      getOpponent: () => ({ playerId: 'B', playerName: 'Bob' }),
      gameState: { gamePhase: 'combat', playerStates, roundLog: ['hit'], roundNum: 1 },
      roomDetails: { room: { status: 'playing' }, players: [{ playerId: 'B', playerName: 'Bob' }] },
      ackRoundPlayed: () => {},
    }

    // PhaseNav writes lastSeen cache during combat
    render(<PhaseNavHarness multi={multi} />)

    // Open modal in setup (cache should persist)
    const multiSetup = { ...multi, gameState: { ...multi.gameState, gamePhase: 'setup' } }
    render(<CombatPlanModal onClose={()=>{}} sector={1} endless={false} gameMode="multiplayer" multi={multiSetup as any} />)

    expect(await screen.findByText(/Last faced fleet/i)).toBeInTheDocument()
  })
})

