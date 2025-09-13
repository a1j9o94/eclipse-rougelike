import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    vi.resetModules()
    await vi.doMock('../hooks/useMultiplayerGame', () => {
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
        // No snapshot for me → haveSnapshot=false guard should disable Start
        playerStates: { P1: { lives: 3, fleetValid: false, modifiers: { capacityCap: 3 } } as PlayerState, P2: { lives: 3, fleetValid: true } as PlayerState },
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
        isConvexAvailable: true,
      })}
    })

    vi.stubEnv('VITE_CONVEX_URL','http://test')
    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /Launch/i }))
    fireEvent.click(screen.getByRole('button', { name: /Versus/i }))
    fireEvent.click(screen.getByRole('button', { name: /Create Game/i }))

    // Wait until Outpost renders
    await screen.findByRole('button', { name: 'Start Combat' })
    const startBtn = await screen.findByRole('button', { name: 'Start Combat' })
    await waitFor(() => expect(startBtn).toHaveAttribute('disabled'))
    const spies = (globalThis as unknown as { mpSpies: { submitFleetSnapshot: any; updateFleetValidity: any; setReady: any } }).mpSpies
    const preSnapCalls = spies.submitFleetSnapshot.mock.calls.length
    const preValidCalls = spies.updateFleetValidity.mock.calls.length
    fireEvent.click(startBtn)
    expect(spies.setReady).not.toHaveBeenCalled()
    expect(spies.submitFleetSnapshot.mock.calls.length).toBe(preSnapCalls)
    expect(spies.updateFleetValidity.mock.calls.length).toBe(preValidCalls)
  })

  it('enables Start when fleetValid=true; toggles readiness and submits snapshot', async () => {
    vi.resetModules()
    await vi.doMock('../hooks/useMultiplayerGame', () => {
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
        // Ensure snapshot exists to satisfy haveSnapshot guard
        playerStates: { P1: { lives: 3, fleetValid: true, fleet: [
          { frame: { id: 'interceptor', name: 'I' }, weapons: [], riftDice: 0, stats: { init: 1, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 }, hull: 1, alive: true, partIds: ['fusion_source','fusion_drive'] },
        ] } as PlayerState, P2: { lives: 3, fleetValid: true } as PlayerState },
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
        isConvexAvailable: true,
      })}
    })

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /Launch/i }))
    fireEvent.click(screen.getByRole('button', { name: /Versus/i }))
    fireEvent.click(screen.getByRole('button', { name: /Create Game/i }))

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
