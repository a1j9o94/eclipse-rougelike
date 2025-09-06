import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import type { PlayerState, GameState } from '../../shared/mpTypes'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

// Fast path through multiplayer menu
vi.mock('../pages/MultiplayerStartPage', async () => {
  const React = await import('react')
  function MockStart({ onRoomJoined }: { onRoomJoined: (roomId: string) => void }){
    React.useEffect(()=>{ onRoomJoined('ROOM1') },[onRoomJoined])
    return <div>Mock MP Menu</div>
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

describe('Multiplayer Start button readiness + validity guards', () => {
  beforeEach(()=>{
    localStorage.setItem('eclipse-player-id', 'P1')
  })

  it('disables Start when fleetValid=false and does not toggle readiness', async () => {
    // Mock MP hook (define spies inside the factory and expose on globalThis)
    vi.mock('../hooks/useMultiplayerGame', () => {
      const submitFleetSnapshot = vi.fn();
      const updateFleetValidity = vi.fn();
      const setReady = vi.fn();
      ;(globalThis as unknown as { mpSpies?: any }).mpSpies = { submitFleetSnapshot, updateFleetValidity, setReady };
      const players = [
        { playerId: 'P1', playerName: 'Alice', isHost: true, isReady: false, lives: 3, faction: 'industrialists' },
        { playerId: 'P2', playerName: 'Bob', isHost: false, isReady: false, lives: 3, faction: 'warmongers' },
      ]
      const gameState: GameState = {
        currentTurn: 'P1', gamePhase: 'setup',
        playerStates: { P1: { lives: 3, fleetValid: false } as PlayerState, P2: { lives: 3, fleetValid: true } as PlayerState },
        roundNum: 1,
      } as unknown as GameState
      return { useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players },
        gameState,
        getPlayerId: () => 'P1',
        getCurrentPlayer: () => players[0],
        getOpponent: () => players[1],
        submitFleetSnapshot,
        updateFleetValidity,
        setReady,
        isConvexAvailable: false,
      })}
    })

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)

    // Enter MP, then game
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    // Start button should be disabled due to fleetValid=false
    const startBtn = await screen.findByRole('button', { name: 'Start Combat' })
    expect(startBtn).toHaveAttribute('disabled')
    fireEvent.click(startBtn)
    const spies = (globalThis as unknown as { mpSpies: { submitFleetSnapshot: any; updateFleetValidity: any; setReady: any } }).mpSpies
    expect(spies.setReady).not.toHaveBeenCalled()
    expect(spies.submitFleetSnapshot).not.toHaveBeenCalled()
    expect(spies.updateFleetValidity).not.toHaveBeenCalled()
  })

  it('enables Start when fleetValid=true; toggles readiness and submits snapshot', async () => {
    vi.mock('../hooks/useMultiplayerGame', () => {
      const submitFleetSnapshot = vi.fn();
      const updateFleetValidity = vi.fn();
      const setReady = vi.fn();
      ;(globalThis as unknown as { mpSpies?: any }).mpSpies = { submitFleetSnapshot, updateFleetValidity, setReady };
      const players = [
        { playerId: 'P1', playerName: 'Alice', isHost: true, isReady: false, lives: 3, faction: 'industrialists' },
        { playerId: 'P2', playerName: 'Bob', isHost: false, isReady: false, lives: 3, faction: 'warmongers' },
      ]
      const gameState: GameState = {
        currentTurn: 'P1', gamePhase: 'setup',
        playerStates: { P1: { lives: 3, fleetValid: true } as PlayerState, P2: { lives: 3, fleetValid: true } as PlayerState },
        roundNum: 1,
      } as unknown as GameState
      return { useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players },
        gameState,
        getPlayerId: () => 'P1',
        getCurrentPlayer: () => players[0],
        getOpponent: () => players[1],
        submitFleetSnapshot,
        updateFleetValidity,
        setReady,
        isConvexAvailable: false,
      })}
    })

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    const startBtn = await screen.findByRole('button', { name: 'Start Combat' })
    expect(startBtn).not.toHaveAttribute('disabled')
    fireEvent.click(startBtn)
    const spies = (globalThis as unknown as { mpSpies: { submitFleetSnapshot: any; updateFleetValidity: any; setReady: any } }).mpSpies
    expect(spies.setReady).toHaveBeenCalledTimes(1)
    // snapshot + validity update attempts are sent
    expect(spies.submitFleetSnapshot).toHaveBeenCalled()
    expect(spies.updateFleetValidity).toHaveBeenCalledWith(true)
  })
})
