import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import useOutpostController from '../controllers/useOutpostController'

function HookHarness({
  srvReroll,
  localReroll,
}: { srvReroll: number | undefined; localReroll: number }) {
  const multi = {
    getPlayerId: () => 'me',
    gameState: { playerStates: { me: { rerollCost: srvReroll } } },
  } as any
  const { outpost } = useOutpostController({
    gameMode: 'multiplayer',
    multi,
    state: {
      resources: { credits: 40, materials: 10, science: 0 },
      research: { Military: 1, Grid: 1, Nano: 1 },
      blueprints: { interceptor: [], cruiser: [], dread: [] },
      fleet: [],
      capacity: { cap: 6 },
      tonnage: { used: 0, cap: 6 },
      shop: { items: [] },
      focused: 0,
      rerollCost: localReroll,
      shopVersion: 0,
      sector: 1,
      endless: false,
    },
    setters: {
      setResources: () => {},
      setResearch: () => {},
      setBlueprints: () => {},
      setFleet: () => {},
      setCapacity: () => {},
      setFocused: () => {},
      setRerollCost: () => {},
      setShopVersion: () => {},
      setShop: () => {},
      setLastEffects: () => {},
      setBaseRerollCost: () => {},
      setMpSeeded: () => {},
      setMpSeedSubmitted: () => {},
      setMpServerSnapshotApplied: () => {},
      setMpLastServerApplyRound: () => {},
      setMpRerollInitRound: () => {},
    },
    sfx: { playEffect: () => {} },
    resetRun: () => {},
  })
  return <div data-rr={outpost.rerollCost} />
}

describe('useOutpostController — reroll label prefers non-regressive max(local, server)', () => {
  it('shows local 6 when server is 3', () => {
    const { container } = render(<HookHarness srvReroll={3} localReroll={6} />)
    const div = container.querySelector('div[data-rr]') as HTMLDivElement
    expect(div.getAttribute('data-rr')).toBe('6')
  })
})

