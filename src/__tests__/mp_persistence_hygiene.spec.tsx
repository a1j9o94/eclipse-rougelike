import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

// Will attach spies dynamically (do not replace implementation)

// Fast path through MP screens
vi.mock('../pages/MultiplayerStartPage', async () => {
  const React = await import('react')
  function MockStart({ onRoomJoined }: { onRoomJoined: (roomId: string) => void }){
    React.useEffect(()=>{ onRoomJoined('ROOM1') },[onRoomJoined])
    return <div>Mock Multiplayer Start</div>
  }
  return { default: MockStart }
})

vi.mock('../components/RoomLobby', () => ({
  RoomLobby: ({ onGameStart }: { onGameStart: () => void }) => (
    <div>
      <div>Mock Lobby</div>
      <button onClick={onGameStart}>Enter Game</button>
    </div>
  )
}))

// Minimal MP hook stub — difficulty should remain null so SP persistence never fires
vi.mock('../hooks/useMultiplayerGame', () => ({
  useMultiplayerGame: () => ({
    roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players: [{ playerId: 'P1', playerName: 'Alice', isReady: false }] },
    gameState: { currentTurn: 'P1', gamePhase: 'setup', playerStates: { P1: { lives: 3, fleetValid: true } }, roundNum: 1 },
    getPlayerId: () => 'P1', getCurrentPlayer: () => ({ playerId: 'P1', isReady: false }), getOpponent: () => null,
    isConvexAvailable: false,
  })
}))

describe('MP persistence hygiene', () => {
  it('does not call saveRunState/evaluateUnlocks while in multiplayer', async () => {
    localStorage.setItem('eclipse-player-id', 'P1')
    // Spy on real implementations without changing behavior
    const storage = await import('../game/storage')
    const saveSpy = vi.spyOn(storage, 'saveRunState')
    const evalSpy = vi.spyOn(storage, 'evaluateUnlocks')

    const { default: App } = await import('../App')
    render(<App />)
    // Enter MP → Lobby → Game
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    await screen.findByText(/Mock Lobby/i)
    fireEvent.click(screen.getByRole('button', { name: /Enter Game/i }))

    // Persistence effect in App is guarded by `if (!difficulty) return;` — verify no calls
    expect(saveSpy).not.toHaveBeenCalled()
    expect(evalSpy).not.toHaveBeenCalled()
  })
})
