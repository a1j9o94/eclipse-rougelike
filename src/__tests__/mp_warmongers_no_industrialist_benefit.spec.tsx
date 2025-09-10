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

describe('MP Isolation — Warmongers do not inherit Industrialists economy', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('Warmongers vs Industrialists: reroll is 8¢ and build shows base cost (no discounts)', async () => {
    vi.mock('../hooks/useMultiplayerGame', () => {
      const interceptorSnap: ShipSnapshot = {
        frame: { id: 'interceptor', name: 'Interceptor' },
        weapons: [], riftDice: 0,
        stats: { init: 1, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 },
        hull: 1, alive: true,
        partIds: ['fusion_source','fusion_drive','plasma','positron']
      }
      const players = [
        { playerId: 'A', playerName: 'Alice', isHost: true, isReady: false, lives: 4, faction: 'warmongers' },
        { playerId: 'B', playerName: 'Bob', isHost: false, isReady: false, lives: 4, faction: 'industrialists' },
      ]
      const gameState: GameState = {
        currentTurn: 'A',
        gamePhase: 'setup',
        playerStates: {
          A: {
            resources: { credits: 20, materials: 5, science: 0 },
            research: { Military: 2, Grid: 1, Nano: 1 },
            modifiers: { capacityCap: 14 },
            blueprintIds: { interceptor: [], cruiser: [], dread: [] },
            fleet: [ { ...interceptorSnap }, { ...interceptorSnap }, { ...interceptorSnap } ],
            fleetValid: true,
          } as PlayerState,
          B: {
            resources: { credits: 40, materials: 10, science: 0 },
            economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
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
    // Room is already 'playing' in mock; Outpost should render directly

    // Reroll shows base 8¢ (no 0¢)
    await screen.findByText(/Reroll \(8¢\)/i)

    // Build shows base cost (no discounts). It may be disabled if unaffordable; accept the Need variant.
    const buildBtn = await screen.findByRole('button', { name: /Build Interceptor/i })
    expect(buildBtn.textContent).toMatch(/(Need 3🧱 \+ 30¢|\(3🧱 \+ 30¢\))/)
  })
})
