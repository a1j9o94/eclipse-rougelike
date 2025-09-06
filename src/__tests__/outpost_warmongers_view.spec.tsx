import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from '../App'
import type { FrameId } from '../../shared/factions'
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

describe('Outpost — Warmongers first render', () => {
  beforeEach(()=>{
    localStorage.setItem('eclipse-player-id', 'A')
  })

  it('shows Cruiser class blueprint and 3× Cruiser fleet with correct capacity used', async () => {
    vi.mock('../hooks/useMultiplayerGame', () => {
      const cruiserSnap: ShipSnapshot = {
        frame: { id: 'cruiser', name: 'Cruiser' },
        weapons: [], riftDice: 0,
        stats: { init: 2, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 },
        hull: 1, alive: true,
        partIds: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite']
      }
      const players = [
        { playerId: 'A', playerName: 'Alice', isHost: true, isReady: false, lives: 3, faction: 'warmongers' },
        { playerId: 'B', playerName: 'Bob', isHost: false, isReady: false, lives: 3, faction: 'industrialists' },
      ]
      const gameState: GameState = {
        currentTurn: 'A',
        gamePhase: 'setup',
        playerStates: {
          A: {
            resources: { credits: 20, materials: 5, science: 0 },
            research: { Military: 2, Grid: 1, Nano: 1 },
            modifiers: { startingFrame: 'cruiser' as FrameId, capacityCap: 14 },
            blueprintIds: { interceptor: [], cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'], dread: [] },
            fleet: [ { ...cruiserSnap }, { ...cruiserSnap }, { ...cruiserSnap } ],
            fleetValid: true,
            lives: 3, faction: 'warmongers', isAlive: true,
          } as PlayerState,
          B: { lives: 3, fleetValid: true } as PlayerState,
        },
        roundNum: 1,
      } as unknown as GameState

      return { useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 3, livesPerPlayer: 3 } }, players },
        gameState,
        getPlayerId: () => 'A', getCurrentPlayer: () => players[0], getOpponent: () => players[1],
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      })}
    })

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    // Header reflects Cruiser class blueprint
    await screen.findByText(/Class Blueprint — Cruiser/i)

    // Fleet card shows Cruiser (t2)
    const cruisers = await screen.findAllByText(/Cruiser/i)
    const card = cruisers.find(el => (el.textContent || '').match(/\(t2\)/))
    expect(card, 'Cruiser (t2) label not found in fleet card').toBeTruthy()

    // Group count ×3 visible somewhere in the hangar section
    expect(screen.getByText(/×3/)).toBeTruthy()

    // Capacity line shows Used: 6 (3 cruisers × tonnage 2); Cap: 14
    const capacityRow = await screen.findByText(/Capacity:/)
    const text = capacityRow.textContent || ''
    expect(text).toMatch(/Capacity: 14/i)
    expect(text).toMatch(/Used: 6/i)
  })
})
