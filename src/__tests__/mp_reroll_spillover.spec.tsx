import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn() }))

const RUN_KEY = 'eclipse-run'

describe('MP Reroll Spillover Reset', () => {
  beforeEach(()=>{ localStorage.setItem('eclipse-player-id', 'A') })

  it('Warmongers reset reroll to base (8¢) even if saved SP reroll=0', async () => {
    // Seed a SP save with rerollCost=0
    localStorage.setItem(RUN_KEY, JSON.stringify({
      difficulty: 'easy', faction: 'industrialists', opponent: 'warmongers',
      resources: { credits: 40, materials: 10, science: 0 },
      research: { Military: 1, Grid: 1, Nano: 1 },
      rerollCost: 0, baseRerollCost: 0,
      capacity: { cap: 3 }, sector: 1,
      blueprints: { interceptor: [], cruiser: [], dread: [] },
      fleet: [], shop: { items: [] }, livesRemaining: 1,
    }))

    // MP Warmongers with no econ.rerollBase
    vi.doMock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players: [{ playerId:'A', isReady:false, faction:'warmongers'}] },
        gameState: {
          currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
          playerStates: { A: { modifiers: { startingFrame:'cruiser', capacityCap: 14 }, blueprintIds: { interceptor:[], cruiser:['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'], dread:[] }, fleetValid: true } }
        },
        getPlayerId: ()=>'A', getCurrentPlayer:()=>({ playerId:'A', isReady:false }), getOpponent:()=>null,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(), isConvexAvailable: false,
      })
    }))
    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    const btn = await screen.findByRole('button', { name: /Reroll \(8¢\)/i })
    expect(btn).toBeTruthy()
  })

  it('Industrialists keep reroll at 0¢ in MP', async () => {
    localStorage.removeItem(RUN_KEY)
    vi.doMock('../hooks/useMultiplayerGame', () => ({
      useMultiplayerGame: () => ({
        roomDetails: { room: { status: 'playing', gameConfig: { startingShips: 1, livesPerPlayer: 3 } }, players: [{ playerId:'A', isReady:false, faction:'industrialists'}] },
        gameState: {
          currentTurn: 'A', gamePhase: 'setup', roundNum: 1,
          playerStates: { A: { economy: { rerollBase: 0 }, modifiers: { startingFrame:'interceptor', capacityCap: 3 }, blueprintIds: { interceptor:[], cruiser:[], dread:[] }, fleetValid: true } }
        },
        getPlayerId: ()=>'A', getCurrentPlayer:()=>({ playerId:'A', isReady:false }), getOpponent:()=>null,
        submitFleetSnapshot: vi.fn(), updateFleetValidity: vi.fn(), setReady: vi.fn(), isConvexAvailable: false,
      })
    }))
    const { default: App } = await import('../App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /multiplayer/i }))
    // Assert directly on the reroll button's label via test id
    const rerollBtn = await screen.findByTestId('reroll-button')
    await vi.waitFor(() => {
      expect(rerollBtn).toHaveTextContent(/Reroll \(0¢\)/i)
    }, { timeout: 1000 })
  })
})
