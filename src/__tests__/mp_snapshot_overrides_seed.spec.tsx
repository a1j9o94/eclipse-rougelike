import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { GameState, PlayerState, ShipSnapshot } from '../../shared/mpTypes'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

// Minimal lobby to enter the game
vi.mock('../components/RoomLobby', () => ({
  RoomLobby: ({ onGameStart }: { onGameStart: () => void }) => (
    <div>
      <div>Mock Lobby</div>
      <button onClick={onGameStart}>Enter Game</button>
    </div>
  )
}))

describe('MP snapshot overrides any local fallback seed', () => {
  beforeEach(() => {
    localStorage.setItem('eclipse-player-id', 'A')
    vi.useFakeTimers()
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    ;(console.debug as unknown as { mockClear: () => void }).mockClear?.()
  })

  it('Outpost shows Cruiser after server sends cruiser snapshots', async () => {
    vi.resetModules()

    const players = [
      { playerId: 'A', playerName: 'Alice', isReady: false, faction: 'warmongers' },
      { playerId: 'B', playerName: 'Bob', isReady: false, faction: 'industrialists' },
    ]
    const gs: { gameState: GameState } = {
      gameState: {
        currentTurn: 'A',
        gamePhase: 'setup',
        roundNum: 1,
        playerStates: {
          A: {
            research: { Military: 2, Grid: 1, Nano: 1 },
            modifiers: { startingFrame: 'cruiser', capacityCap: 14 },
            blueprintIds: { interceptor: [], cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'], dread: [] },
            fleetValid: true,
          } as PlayerState,
          B: { lives: 3, fleetValid: true } as PlayerState,
        }
      } as unknown as GameState
    }

    // Mock MP hook exposing shared gameState ref and disable Convex to use test tick
    await vi.doMock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 3, livesPerPlayer: 3 } }, players },
        getPlayerId: () => 'A', getCurrentPlayer: () => players[0], getOpponent: () => players[1],
        gameState: gs.gameState,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      })
    }))

    // Fast path through MultiplayerStartPage: auto-join
    await vi.doMock('../pages/MultiplayerStartPage', async () => {
      const React = await import('react')
      function MockStart({ onRoomJoined }: { onRoomJoined: (roomId: string) => void }) {
        React.useEffect(() => { onRoomJoined('ROOM1') }, [onRoomJoined])
        return <div>Mock MP Menu</div>
      }
      return { default: MockStart }
    })

    const { default: App } = await import('../App')
    render(<App />)
    // DEBUG breadcrumbs
    console.log('[TEST] Rendered App')

    // Enter MP → Game
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    console.log('[TEST] Clicked Multiplayer')
    // RoomLobby shows; enter game
    await screen.findByText(/Mock Lobby/i)
    console.log('[TEST] In Lobby')
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))
    console.log('[TEST] Clicked Enter Game')

    // Drive the internal test interval long enough for any fallback seed to occur
    vi.advanceTimersByTime(150)
    console.log('[TEST] Advanced timers 150ms')
    // Ensure Outpost is on screen
    await screen.findByText(/Hangar \(Class Blueprints\)/i, {}, { timeout: 1500 })
    console.log('[TEST] Outpost visible')

    // Late server snapshot with cruisers
    const cruiserSnap: ShipSnapshot = {
      frame: { id: 'cruiser', name: 'Cruiser' },
      weapons: [], riftDice: 0,
      stats: { init: 2, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 },
      hull: 1, alive: true,
      partIds: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite']
    }
    ;(gs.gameState.playerStates as any)['A'].fleet = [ { ...cruiserSnap }, { ...cruiserSnap }, { ...cruiserSnap } ]
    vi.advanceTimersByTime(300)
    console.log('[TEST] Injected server fleet and advanced 300ms')

    // Now Outpost should show Cruiser header (server snapshot adopted)
    await screen.findByText(/Class Blueprint — Cruiser/i, {}, { timeout: 2000 })
    console.log('[TEST] Found Cruiser header')
  })
})
