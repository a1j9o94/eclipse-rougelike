import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { useOutpostHandlers } from '../hooks/useOutpostHandlers'

// Sanity: building/interacting in MP should persist resource deltas via updateGameState
describe('MP outpost resource persistence', () => {
  it('build/upgrade/dock call updateGameState with new resources', () => {
    const multi = { updateGameState: vi.fn() }
    const base = {
      resources: { credits: 100, materials: 100, science: 0 },
      research: { Military: 1, Grid: 1, Nano: 1 },
      blueprints: { interceptor: [], cruiser: [], dread: [] } as Record<'interceptor'|'cruiser'|'dread', any[]>,
      fleet: [],
      capacity: { cap: 10 },
      tonnageUsed: 0,
      focusedIndex: 0,
      rerollCost: 8,
      shopVersion: 0,
    }
    function Harness(){
      const [state, setState] = React.useState(base)
      const handlers = useOutpostHandlers({
        gameMode: 'multiplayer',
        state,
        setters: {
          setResources: (r:any)=> setState(s=>({ ...s, resources:r })),
          setResearch: (r:any)=> setState(s=>({ ...s, research:r })),
          setBlueprints: (bp:any)=> setState(s=>({ ...s, blueprints:bp })),
          setFleet: (f:any)=> setState(s=>({ ...s, fleet:f })),
          setCapacity: (c:any)=> setState(s=>({ ...s, capacity:c })),
          setFocused: () => {},
          setRerollCost: () => {},
          setShopVersion: () => {},
          setShop: () => {},
          setLastEffects: () => {},
        },
        multi: multi as any,
      })
      // Invoke actions when instructed via global flags
      ;(window as any).__mpHandlers = handlers
      return null
    }
    render(React.createElement(Harness))
    let handlers = (window as any).__mpHandlers as ReturnType<typeof useOutpostHandlers>
    handlers.buildShip()
    expect(multi.updateGameState).toHaveBeenCalled()
    const [{ resources }] = (multi.updateGameState as any).mock.calls.at(-1)
    expect(resources.credits).toBeLessThan(100)
    // Grab latest handlers after state update (re-render)
    handlers = (window as any).__mpHandlers as ReturnType<typeof useOutpostHandlers>
    handlers.upgradeDock()
    const [{ resources: r2 }] = (multi.updateGameState as any).mock.calls.at(-1)
    expect(r2.credits).toBeLessThan(100)
  })
})
