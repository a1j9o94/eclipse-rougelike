import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutpostPage } from '../pages/OutpostPage'
import { useOutpostPageProps } from '../hooks/useOutpostPageProps'
import { PARTS } from '../../shared/parts'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import { getFrame, makeShip, type FrameId } from '../game'
import React from 'react'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn() }))

function TestOutpost({ multi, credits, rerollCost }: { multi: any; credits: number; rerollCost: number }){
  const resources = { credits, materials: 10, science: 0 }
  const blueprints: Record<FrameId, Part[]> = {
    interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.computers[0]],
    cruiser: [], dread: []
  }
  const fleet: Ship[] = [makeShip(getFrame('interceptor'), blueprints.interceptor) as unknown as Ship]
  const props = useOutpostPageProps({
    gameMode: 'multiplayer',
    resources,
    research: { Military:1, Grid:1, Nano:1 },
    blueprints,
    fleet,
    capacity: { cap: 6 },
    tonnage: { used: fleet[0].frame.tonnage, cap: 6 },
    shop: { items: [] },
    focused: 0,
    setFocused: () => {},
    rerollCost,
    researchLabel: ()=>'—',
    canResearch: () => false,
    researchTrack: () => {},
    buildShip: () => {},
    upgradeShip: () => {},
    upgradeDock: () => {},
    ghost: () => ({ targetName:'', use:0, prod:0, valid:true, slotsUsed:0, slotCap:4, slotOk:true, initBefore:0, initAfter:0, initDelta:0, hullBefore:1, hullAfter:1, hullDelta:0 }),
    sellPart: () => {},
    buyAndInstall: () => {},
    sector: 1,
    endless: false,
    // vm extras
    multi,
    spStartCombat: () => {},
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
    doReroll: () => {},
    upgradeLockInfo: () => null,
  })
  return <OutpostPage {...props} />
}

describe('MP Outpost — reroll uses authoritative cost', () => {
  it('Industrialists: shows Reroll (3¢) and disables with credits < 3', async () => {
    const multi = {
      getPlayerId: () => 'me',
      getCurrentPlayer: () => ({ isReady: false }),
      getOpponent: () => ({ playerId: 'opp', isReady: false }),
      gameState: {
        gamePhase: 'setup',
        roundNum: 1,
        playerStates: {
          me: {
            economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
            rerollCost: 3,
            resources: { credits: 2, materials: 10, science: 0 },
          },
        },
      },
    }

    render(<TestOutpost multi={multi} credits={2} rerollCost={3} />)
    const btn = await screen.findByTestId('reroll-button')
    expect(btn.textContent).toMatch(/Reroll \(3¢\)/)
    // Should be disabled because 2 < 3
    expect(btn).toHaveAttribute('disabled')
  })
})
