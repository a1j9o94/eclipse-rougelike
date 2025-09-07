import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useResourceBarVm } from '../hooks/useResourceBarVm'

describe('useResourceBarVm', () => {
  const base = {
    resources: { credits: 40, materials: 10, science: 0 },
    tonnage: { used: 5, cap: 6 },
    sector: 1,
    onReset: () => {},
  }

  it('maps SP props with lives and without MP fields', () => {
    const { result } = renderHook(() => useResourceBarVm({ ...base, gameMode: 'single', singleLives: 2 }))
    expect(result.current.lives).toBe(2)
    expect(result.current.meName).toBeUndefined()
    expect(result.current.opponent).toBeUndefined()
    expect(result.current.phase).toBeUndefined()
    expect(result.current.credits).toBe(40)
  })

  it('maps MP props with names, factions, lives, and phase', () => {
    const multi = {
      getCurrentPlayer: () => ({ playerId: 'P1', playerName: 'Alice', faction: 'industrialists' }),
      getOpponent: () => ({ playerId: 'P2', playerName: 'Bob', faction: 'warmongers' }),
      roomDetails: { players: [ { playerId: 'P1', lives: 3 }, { playerId: 'P2', lives: 2 } ] },
      gameState: { gamePhase: 'setup' as const },
    }
    const { result } = renderHook(() => useResourceBarVm({ ...base, gameMode: 'multiplayer', multi }))
    expect(result.current.meName).toBe('Alice')
    expect(result.current.meFaction).toBe('industrialists')
    expect(result.current.opponent?.name).toBe('Bob')
    expect(result.current.opponentFaction).toBe('warmongers')
    expect(result.current.lives).toBe(3)
    expect(result.current.phase).toBe('setup')
  })
})

