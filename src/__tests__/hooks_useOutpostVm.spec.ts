import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOutpostVm } from '../hooks/useOutpostVm'

const bp = { interceptor: [], cruiser: [], dread: [] } as any
const emptyFleet: any[] = []
const cap = { cap: 6 }
const ton = { used: 0, cap: 6 }
const shop = { items: [] }

describe('useOutpostVm', () => {
  const common = {
    resources: { credits: 40, materials: 10, science: 0 },
    research: { Military: 1, Grid: 1, Nano: 1 },
    blueprints: bp,
    fleet: emptyFleet as any,
    capacity: cap,
    tonnage: ton,
    shop,
    focused: 0,
    setFocused: () => {},
    rerollCost: 8,
    researchLabel: () => 'Grid 1→2',
    canResearch: () => true,
    researchTrack: () => {},
    buildShip: () => {},
    upgradeShip: () => {},
    upgradeDock: () => {},
    ghost: () => null,
    sellPart: () => {},
    buyAndInstall: () => {},
    sector: 1,
    endless: false,
    resetRun: () => {},
    setBlueprints: () => {},
    setResources: () => {},
    setResearch: () => {},
    setCapacity: () => {},
    setRerollCost: () => {},
    setBaseRerollCost: () => {},
    setMpSeeded: () => {},
    setMpSeedSubmitted: () => {},
    setMpServerSnapshotApplied: () => {},
    setMpLastServerApplyRound: () => {},
    setMpRerollInitRound: () => {},
  }

  it('SP: startCombat delegates to spStartCombat', () => {
    const spStart = vi.fn()
    const { result } = renderHook(() => useOutpostVm({ ...common, gameMode: 'single', multi: undefined as any, spStartCombat: spStart }))
    expect(result.current.fleetValid).toBe(true)
    act(() => { result.current.startCombat() })
    expect(spStart).toHaveBeenCalledTimes(1)
  })

  it('MP: startCombat toggles readiness and submits snapshot', async () => {
    const submitFleetSnapshot = vi.fn()
    const updateFleetValidity = vi.fn()
    const setReady = vi.fn()
    const multi = {
      getPlayerId: () => 'P1',
      getCurrentPlayer: () => ({ isReady: false }),
      getOpponent: () => ({ playerId: 'P2', isReady: false }),
      submitFleetSnapshot,
      updateFleetValidity,
      setReady,
      gameState: { gamePhase: 'setup', playerStates: { P1: { fleetValid: true, fleet: [{}, {}] } } },
    }
    const { result } = renderHook(() => useOutpostVm({ ...common, gameMode: 'multiplayer', multi: multi as any, spStartCombat: vi.fn() }))
    expect(result.current.fleetValid).toBe(true)
    expect(result.current.myReady).toBe(false)
    await act(async () => { result.current.startCombat() })
    expect(submitFleetSnapshot).toHaveBeenCalled()
    expect(updateFleetValidity).toHaveBeenCalledWith(true)
    expect(setReady).toHaveBeenCalledWith(true)
  })
})

