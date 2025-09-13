import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import useOutpostHandlers from '../hooks/useOutpostHandlers'
import type { Research, Resources } from '../../shared/defaults'
import type { FrameId } from '../game'
import { INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_CAPACITY } from '../../shared/defaults'

// Create a minimal inline test that constructs the hook logic via a wrapper component and captures the spy from global.

describe('useOutpostHandlers — research persistence (MP, global spy)', () => {
  it('calls updateGameState with upgraded Nano tier', async () => {
    ;(globalThis as any).__spyUpdate = vi.fn()
    function GlobalSpyHarness(){
      const [resources, setResources] = React.useState<Resources>({ credits: 40, materials: 10, science: 2 })
      const [research, setResearch] = React.useState<Research>({ ...INITIAL_RESEARCH, Nano: 2 })
      const [blueprints, setBlueprints] = React.useState<Record<FrameId, any>>({ ...INITIAL_BLUEPRINTS } as any)
      const [fleet, setFleet] = React.useState<any[]>([])
      const [capacity, setCapacity] = React.useState<{ cap: number }>({ cap: INITIAL_CAPACITY.cap })
      const [focusedIndex, setFocused] = React.useState(0)
      const [rerollCost, setRerollCost] = React.useState(8)
      const [shopVersion, setShopVersion] = React.useState(0)
      const setLastEffects = vi.fn()
      const multi = { updateGameState: (...args: unknown[]) => { (globalThis as any).__spyUpdate(...args) } }
      const { research: doResearch } = useOutpostHandlers({
        gameMode: 'multiplayer',
        economyMods: { credits: 0.75, materials: 0.75 },
        state: { resources, research, blueprints: blueprints as any, fleet: fleet as any, capacity, tonnageUsed: 0, focusedIndex, rerollCost, shopVersion },
        setters: { setResources, setResearch, setBlueprints: (bp)=>setBlueprints(bp as any), setFleet: (f)=>setFleet(f as any), setCapacity, setFocused, setRerollCost, setShopVersion, setLastEffects },
        multi,
        sound: undefined,
      })
      return <button onClick={() => doResearch('Nano')}>Research Nano</button>
    }
    render(<GlobalSpyHarness />)
    fireEvent.click(screen.getByRole('button', { name: /Research Nano/i }))
    await Promise.resolve(); await Promise.resolve()
    const spy = (globalThis as any).__spyUpdate
    expect(spy).toHaveBeenCalled()
    const args = spy.mock.calls.at(-1)?.[0]
    expect(args?.research?.Nano).toBe(3)
    expect(typeof args?.resources?.credits).toBe('number')
  })
})
