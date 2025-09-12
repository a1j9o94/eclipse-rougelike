import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutpostPage } from '../pages/OutpostPage'
import { PARTS } from '../../shared/parts'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import { getFrame, makeShip, type FrameId } from '../game'
import { ECONOMY } from '../../shared/economy'
import { applyEconomyModifiers } from '../game/economy'

// Silence audio
vi.mock('../game/sound', () => ({ playEffect: vi.fn(), playMusic: vi.fn() }))

describe('Outpost — economy labels (isolated)', () => {
  it('shows discounted build and dock costs with economyMods', async () => {
    const economyMods = { credits: 0.75, materials: 0.75 };
    const resources = { credits: 40, materials: 10, science: 0 };
    const blueprints: Record<FrameId, Part[]> = {
      interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.computers[0]],
      cruiser: [], dread: []
    };
    const fleet: Ship[] = [makeShip(getFrame('interceptor'), blueprints.interceptor) as unknown as Ship];
    render(<OutpostPage
      resources={resources}
      rerollCost={0}
      doReroll={()=>{}}
      research={{ Military:1, Grid:1, Nano:1 }}
      researchLabel={()=>'—'}
      canResearch={()=>false}
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
      economyMods={economyMods}
    />)
    const buildBtn = await screen.findByRole('button', { name: /Build Interceptor/i })
    const buildM = applyEconomyModifiers(ECONOMY.buildInterceptor.materials, economyMods, 'materials')
    const buildC = applyEconomyModifiers(ECONOMY.buildInterceptor.credits, economyMods, 'credits')
    expect(buildBtn).toHaveTextContent(`${buildM}🧱 + ${buildC}¢`)
  })
})
