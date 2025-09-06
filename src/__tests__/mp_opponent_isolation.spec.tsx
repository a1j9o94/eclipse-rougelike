import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { PlayerState, GameState, ShipSnapshot } from '../../shared/mpTypes'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

// Fast path through MP menu
vi.mock('../pages/MultiplayerStartPage', async () => {
  const React = await import('react')
  function MockStart({ onRoomJoined }: { onRoomJoined: (roomId: string) => void }){
    React.useEffect(()=>{ onRoomJoined('ROOM1') },[onRoomJoined])
    return <div>Mock Multiplayer Start</div>
  }
  return { default: MockStart }
})

// Minimal lobby that lets us enter the game
vi.mock('../components/RoomLobby', () => ({
  RoomLobby: ({ onGameStart }: { onGameStart: () => void }) => (
    <div>
      <div>Mock Lobby</div>
      <button onClick={onGameStart}>Enter Game</button>
    </div>
  )
}))

describe('MP Isolation — opponent faction does not affect my shop/capacity', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('Industrialists vs Warmongers: A keeps discounted economy but does NOT receive 14 capacity from opponent', async () => {
    vi.mock('../hooks/useMultiplayerGame', () => {
      const interceptorSnap: ShipSnapshot = {
        frame: { id: 'interceptor', name: 'Interceptor' },
        weapons: [], riftDice: 0,
        stats: { init: 1, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 },
        hull: 1, alive: true,
        partIds: ['fusion_source','fusion_drive','plasma','positron']
      }
      const players = [
        { playerId: 'A', playerName: 'Alice', isHost: true, isReady: false, lives: 4, faction: 'industrialists' },
        { playerId: 'B', playerName: 'Bob', isHost: false, isReady: false, lives: 4, faction: 'warmongers' },
      ]
      const gameState: GameState = {
        currentTurn: 'A',
        gamePhase: 'setup',
        playerStates: {
          A: {
            resources: { credits: 40, materials: 10, science: 0 },
            research: { Military: 1, Grid: 1, Nano: 1 },
            economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
            blueprintIds: { interceptor: [], cruiser: [], dread: [] },
            fleet: [ { ...interceptorSnap }, { ...interceptorSnap }, { ...interceptorSnap } ],
            fleetValid: true,
          } as PlayerState,
          B: {
            // Opponent has Warmonger capacityCap; my client must not apply it
            modifiers: { capacityCap: 14 },
            research: { Military: 2, Grid: 1, Nano: 1 },
            fleetValid: true,
          } as PlayerState,
        },
        roundNum: 1,
      } as unknown as GameState

      const stub = {
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 3, livesPerPlayer: 4 } }, players },
        gameState,
        getPlayerId: () => 'A', getCurrentPlayer: () => players[0], getOpponent: () => players[1],
        getMyGameState: () => gameState.playerStates['A'] as PlayerState,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      }
      return { useMultiplayerGame: () => stub }
    })

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    // My econ: reroll is 0¢ and build shows discounted cost
    await screen.findByText(/Reroll \(0¢\)/i)
    // Build button may be disabled due to capacity, so assert discounted dock cost instead
    const dockBtn = await screen.findByRole('button', { name: /Expand Capacity/i })
    expect(dockBtn.textContent).toMatch(/\(2🧱 \+ (11|12)¢\)/)

    // Capacity must NOT be 14 just because opponent is warmongers
    const capacityRow = await screen.findByText(/Capacity:/i)
    expect(capacityRow.textContent || '').not.toMatch(/Capacity: 14/i)
  })
})
