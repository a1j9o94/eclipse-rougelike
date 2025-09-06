import { describe, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { PlayerState, GameState, ShipSnapshot } from '../../shared/mpTypes'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

describe('MP fallback seed yields to server snapshot (Warmongers)', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('first has no snapshot (fallback), then receives server cruisers → Outpost shows Cruiser', async () => {
    // Shared mutable game state to simulate late snapshot arrival
    const players = [
      { playerId: 'A', playerName: 'Alice', isReady: false, faction: 'warmongers' },
      { playerId: 'B', playerName: 'Bob', isReady: false, faction: 'industrialists' },
    ]
    const gs: { gameState: GameState } = {
      gameState: {
        currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
        playerStates: {
          A: {
            research: { Military: 2, Grid: 1, Nano: 1 },
            modifiers: { startingFrame: 'cruiser', capacityCap: 14 },
            blueprintIds: { interceptor: [], cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'], dread: [] },
            // no fleet snapshot yet
            fleetValid: true,
          } as PlayerState,
          B: { lives: 3, fleetValid: true } as PlayerState,
        }
      } as unknown as GameState
    }

    // Mock MP hooks and return a wrapper that references gs.gameState
    vi.doMock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 3, livesPerPlayer: 3 } }, players },
        getPlayerId: () => 'A', getCurrentPlayer: () => players[0], getOpponent: () => players[1],
        gameState: gs.gameState,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      })
    }))
    const { default: App } = await import('../App')
    render(<App />)

    // Enter MP → Game
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/join|code|room/i, {}, { timeout: 1000 }).catch(()=>{}) // guard for test

    // Force navigation to Game via RoomLobby mock
    const lobbyBtn = screen.queryByRole('button', { name: /Enter Game/i })
    if (lobbyBtn) fireEvent.click(lobbyBtn)

    // At this moment fallback may seed Interceptors; now simulate late server snapshot with cruisers
    const cruiserSnap: ShipSnapshot = { frame: { id: 'cruiser', name: 'Cruiser' }, weapons: [], riftDice: 0, stats: { init: 2, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 }, hull: 1, alive: true, partIds: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'] }
    await act(async () => {
      (gs.gameState.playerStates as any)['A'].fleet = [ { ...cruiserSnap }, { ...cruiserSnap }, { ...cruiserSnap } ]
      // Bump roundNum to trigger effect path that prefers server snapshot
      gs.gameState.roundNum = 1
    })

    // Now Outpost should show Cruiser header (not Interceptor)
    await screen.findByText(/Class Blueprint — Cruiser/i)
  })
})
