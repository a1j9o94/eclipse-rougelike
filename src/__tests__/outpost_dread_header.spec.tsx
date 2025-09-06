import { describe, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

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

describe('Outpost — Dreadnought header when startingFrame=dread', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('shows Class Blueprint — Dreadnought on first render', async () => {
    vi.mock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 2, livesPerPlayer: 3 } }, players: [{ playerId: 'A', playerName: 'Alice', isReady: false }] },
        gameState: {
          currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
          playerStates: {
            A: {
              research: { Military: 3, Grid: 2, Nano: 2 },
              modifiers: { startingFrame: 'dread', capacityCap: 10 },
              blueprintIds: { interceptor: [], cruiser: [], dread: ['zero_point','warp_drive','plasma_battery','neutrino','omega','monolith_plating'] },
              fleet: [
                { frame: { id: 'dread', name: 'Dreadnought' }, weapons: [], riftDice: 0, stats: { init: 3, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 }, hull: 1, alive: true, partIds: ['zero_point','warp_drive','plasma_battery','neutrino','omega','monolith_plating'] },
                { frame: { id: 'dread', name: 'Dreadnought' }, weapons: [], riftDice: 0, stats: { init: 3, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 }, hull: 1, alive: true, partIds: ['zero_point','warp_drive','plasma_battery','neutrino','omega','monolith_plating'] }
              ],
              fleetValid: true,
            }
          }
        },
        getPlayerId: () => 'A', getCurrentPlayer: () => ({ playerId: 'A' }), getOpponent: () => null,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      })
    }))

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    await screen.findByText(/Class Blueprint — Dreadnought/i)
  })
})
