import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ECONOMY } from '../../shared/economy'
import { applyEconomyModifiers } from '../game/economy'

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

describe('Outpost — economy labels reflect faction (MP)', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('Industrialists see discounted costs and free initial reroll; Warmongers do not', async () => {
    vi.mock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } },
          players: [
            { playerId: 'A', playerName: 'Alice', isReady: false, faction: 'industrialists' },
            { playerId: 'B', playerName: 'Bob', isReady: false, faction: 'warmongers' },
          ] },
        gameState: {
          currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
          playerStates: {
            A: { // industrialists
              resources: { credits: 40, materials: 10, science: 0 },
              research: { Military: 1, Grid: 1, Nano: 1 },
              economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
              modifiers: { startingFrame: 'interceptor', capacityCap: 3 },
              blueprintIds: { interceptor: [], cruiser: [], dread: [] },
              fleet: [ { frame: { id: 'interceptor', name: 'Interceptor' }, weapons: [], riftDice: 0, stats: { init: 1, hullCap: 1, valid: true, aim: 0, shieldTier: 0, regen: 0 }, hull: 1, alive: true, partIds: ['fusion_source','fusion_drive','plasma','positron'] } ],
              fleetValid: true,
            },
          }
        },
        getPlayerId: () => 'A', getCurrentPlayer: () => ({ playerId: 'A' }), getOpponent: () => ({ playerId: 'B' }),
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(),
        isConvexAvailable: false,
      })
    }))

    vi.stubEnv('VITE_CONVEX_URL','http://test')
    const { default: AppImpl } = await import('../App')
    render(<AppImpl />)
    fireEvent.click(screen.getByRole('button', { name: /Launch/i }))
    fireEvent.click(screen.getByRole('button', { name: /Versus/i }))
    fireEvent.click(screen.getByRole('button', { name: /Create Game/i }))

    // Industrialists: reroll shows 0¢ initially
    await screen.findByText(/Reroll \(0¢\)/i)
    const buildBtn = await screen.findByRole('button', { name: /Build Interceptor/i })
    const econMods = { credits: 0.75, materials: 0.75 }
    const buildM = applyEconomyModifiers(ECONOMY.buildInterceptor.materials, econMods, 'materials')
    const buildC = applyEconomyModifiers(ECONOMY.buildInterceptor.credits, econMods, 'credits')
    expect(buildBtn).toHaveTextContent(`${buildM}🧱 + ${buildC}¢`)
  })
})
