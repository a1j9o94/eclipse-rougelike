import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { PlayerState, GameState } from '../../shared/mpTypes'

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

// Minimal lobby
vi.mock('../components/RoomLobby', () => ({
  RoomLobby: ({ onGameStart }: { onGameStart: () => void }) => (
    <div>
      <div>Mock Lobby</div>
      <button onClick={onGameStart}>Enter Game</button>
    </div>
  )
}))

describe('MP Research Persistence', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('calls updateGameState with upgraded research after upgrading a track', async () => {
    ;(globalThis as any).__spyUpdate = vi.fn()
    vi.mock('../hooks/useMultiplayerGame', () => {
      const players = [ { playerId: 'A', playerName: 'Alice', isReady: false, faction: 'industrialists' } ]
      const gameState: GameState = {
        currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
        playerStates: {
          A: {
            resources: { credits: 40, materials: 10, science: 2 },
            research: { Military: 1, Grid: 1, Nano: 2 },
            economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
            modifiers: { startingFrame: 'interceptor', capacityCap: 3 },
            blueprintIds: { interceptor: [], cruiser: [], dread: [] },
            fleet: [ { frame: { id: 'interceptor', name: 'I' }, weapons: [], riftDice: 0, stats: { init: 1, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 }, hull: 1, alive: true, partIds: ['fusion_source','fusion_drive','plasma','positron'] } ],
            fleetValid: true,
          } as PlayerState
        }
      } as unknown as GameState
      return {
        useMultiplayerGame: () => ({
          roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players },
          gameState,
          getPlayerId: () => 'A', getCurrentPlayer: () => players[0], getOpponent: () => null,
          updateGameState: (...args: unknown[]) => { (globalThis as any).__spyUpdate(...args) },
          submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
          isConvexAvailable: false,
        })
      }
    })

    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    // Click the Nano upgrade button (we start at Nano: 2, so upgrade to 3)
    const nanoBtn = await screen.findByRole('button', { name: /Nano/i })
    fireEvent.click(nanoBtn)

    // Failing until persistence is wired: allow async tick
    await new Promise(r => setTimeout(r, 0))
    await new Promise(r => setTimeout(r, 0))
    const spy = (globalThis as any).__spyUpdate
    expect(spy).toHaveBeenCalled()
    const args = spy.mock.calls.at(-1)?.[0]
    expect(args?.updates?.research?.Nano).toBe(3)
  })
})
