import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutpostPage } from '../pages/OutpostPage'
import { PARTS } from '../../shared/parts'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import { getFrame, makeShip, type FrameId } from '../game'

describe('Outpost — dock roster smoke', () => {
  it('renders dock roster and blueprint header', async () => {
    const blueprints: Record<FrameId, Part[]> = {
      interceptor: [PARTS.sources[0], PARTS.drives[0]],
      cruiser: [], dread: []
    }
    const fleet: Ship[] = [makeShip(getFrame('interceptor'), blueprints.interceptor) as unknown as Ship]
    render(
      <OutpostPage
        resources={{credits:50, materials:20, science:0}}
        rerollCost={3}
        doReroll={()=>{}}
        research={{ Military:1, Grid:1, Nano:1 }}
        researchLabel={(t)=>t}
        canResearch={()=>true}
        researchTrack={()=>{}}
        fleet={fleet}
        focused={0}
        setFocused={()=>{}}
        buildShip={()=>{}}
        upgradeShip={()=>{}}
        upgradeDock={()=>{}}
        upgradeLockInfo={()=>null}
        blueprints={blueprints}
        sellPart={()=>{}}
        shop={{ items: [] }}
        ghost={()=>({ targetName:'', use:0, prod:0, valid:true, slotsUsed:0, slotCap:4, slotOk:true, initBefore:0, initAfter:0, initDelta:0, hullBefore:1, hullAfter:1, hullDelta:0 })}
        buyAndInstall={()=>{}}
        capacity={{ cap: 6 }}
        tonnage={{ used: fleet[0].frame.tonnage, cap: 6 }}
        sector={1}
        endless={false}
        fleetValid={true}
        startCombat={()=>{}}
        onRestart={()=>{}}
      />
    )
    expect(screen.getByTestId('reroll-button')).toBeInTheDocument()
    expect(document.querySelector('[data-tutorial="dock-roster"]')).toBeTruthy()
    expect(screen.getByText(/Class Blueprint —/)).toBeInTheDocument()
  })
})

