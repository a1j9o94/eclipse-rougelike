import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useOutpostPageProps } from '../hooks/useOutpostPageProps'
import { OutpostPage } from '../pages/OutpostPage'
import { PARTS } from '../../shared/parts'
import { getFrame, makeShip, type FrameId } from '../game'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'

function Harness(){
  const blueprints: Record<FrameId, Part[]> = {
    interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.computers[0]],
    cruiser: [], dread: []
  }
  const fleet: Ship[] = [makeShip(getFrame('interceptor'), blueprints.interceptor) as unknown as Ship]
  const resolve = vi.fn(() => Promise.resolve())
  const multi = {
    getPlayerId: () => 'me',
    getCurrentPlayer: () => ({ isReady: false }),
    getOpponent: () => ({ playerId: 'opp', isReady: false }),
    resolveCombatResult: (winnerId: string) => { resolve(winnerId); return Promise.resolve() },
    gameState: { gamePhase: 'setup', playerStates: { me: { lives: 1 }, opp: { lives: 1 } } },
  }
  const props = useOutpostPageProps({
    gameMode: 'multiplayer',
    resources: { credits: 0, materials: 0, science: 0 },
    research: { Military: 1, Grid: 1, Nano: 1 },
    blueprints,
    fleet,
    capacity: { cap: 0 }, // force invalid fleet to reveal Restart/Resign UI
    tonnage: { used: fleet[0].frame.tonnage, cap: 0 },
    shop: { items: [] },
    focused: 0,
    setFocused: () => {},
    rerollCost: 8,
    researchLabel: ()=>'—',
    canResearch: ()=>false,
    researchTrack: ()=>{},
    buildShip: ()=>{},
    upgradeShip: ()=>{},
    upgradeDock: ()=>{},
    ghost: ()=>({ targetName:'', use:0, prod:0, valid:false, slotsUsed:0, slotCap:4, slotOk:false, initBefore:0, initAfter:0, initDelta:0, hullBefore:1, hullAfter:1, hullDelta:0 }),
    sellPart: ()=>{},
    buyAndInstall: ()=>{},
    sector: 1,
    endless: false,
    multi: multi as any,
    spStartCombat: ()=>{},
    resetRun: ()=>{},
    setBlueprints: ()=>{},
    setResources: ()=>{},
    setResearch: ()=>{},
    setCapacity: ()=>{},
    setRerollCost: ()=>{},
    setBaseRerollCost: ()=>{},
    setMpSeeded: ()=>{},
    setMpSeedSubmitted: ()=>{},
    setMpServerSnapshotApplied: ()=>{},
    setMpLastServerApplyRound: ()=>{},
    setMpRerollInitRound: ()=>{},
    doReroll: ()=>{},
    upgradeLockInfo: ()=>null,
  })
  ;(globalThis as any).__resignSpy = resolve
  return <OutpostPage {...props} />
}

describe('MP Outpost — Resign button', () => {
  it('shows "Resign" instead of Restart, and calls resolveCombatResult for opponent', async () => {
    render(<Harness />)
    const btn = await screen.findByRole('button', { name: /Resign/i })
    fireEvent.click(btn)
    await Promise.resolve()
    const spy = (globalThis as any).__resignSpy
    expect(spy).toHaveBeenCalledWith('opp')
  })
})

