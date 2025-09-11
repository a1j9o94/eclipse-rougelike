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
    expect(result.current.multiplayer).toBe(false)
    expect(result.current.credits).toBe(40)
  })

  it('maps MP props with lives and multiplayer flag only', () => {
    const multi = {
      getCurrentPlayer: () => ({ playerId: 'P1', playerName: 'Alice', faction: 'industrialists' }),
      roomDetails: { players: [ { playerId: 'P1', lives: 3 }, { playerId: 'P2', lives: 2 } ] },
    }
    const { result } = renderHook(() => useResourceBarVm({ ...base, gameMode: 'multiplayer', multi }))
    expect(result.current.lives).toBe(3)
    expect(result.current.multiplayer).toBe(true)
    expect(result.current).not.toHaveProperty('meName')
    expect(result.current).not.toHaveProperty('opponent')
    expect(result.current).not.toHaveProperty('phase')
  })
})

