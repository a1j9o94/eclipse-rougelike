import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { PlayerState, GameState } from '../../shared/mpTypes'

vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

describe('MP Industrialists baseline class blueprint', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('shows default Interceptor class blueprint (not 0/6) when no ids/hints', async () => {
    vi.doMock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players: [{ playerId: 'A', playerName: 'Alice', isReady: false, faction: 'industrialists' }] },
        gameState: {
          currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
          playerStates: {
            A: { research: { Military:1, Grid:1, Nano:1 }, modifiers: { startingFrame: 'interceptor', capacityCap: 3 }, blueprintIds: { interceptor: [], cruiser: [], dread: [] }, fleetValid: true } as PlayerState,
          }
        } as unknown as GameState,
        getPlayerId: () => 'A', getCurrentPlayer: () => ({ playerId: 'A' }), getOpponent: () => null,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      })
    }))
    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    const lobby = screen.queryByText(/Mock Lobby/)
    if (lobby) fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    // Assert Class Blueprint — Interceptor shows non-zero slots used (baseline parts)
    const header = await screen.findByText(/Class Blueprint — Interceptor/i)
    expect((header.textContent||'')).not.toMatch(/0\/6/)
  })
})

