import { describe, it, expect } from 'vitest'
import { OutpostIntents } from '../adapters/outpostAdapter'
import { applyOutpostCommand } from '../engine/commands'
import type { OutpostEnv, OutpostState } from '../engine/state'
import { PARTS, getFrame, makeShip, type FrameId } from '../game'
import type { Research } from '../../shared/defaults'

function baseState(): OutpostState {
  const frameId: FrameId = 'interceptor'
  const baseBp = [
    PARTS.sources.find(p=>p.id==='fusion_source')!,
    PARTS.drives.find(p=>p.id==='fusion_drive')!,
  ] as const
  const ship = makeShip(getFrame(frameId), [...baseBp])
  return {
    resources: { credits: 200, materials: 200, science: 0 },
    research: { Military: 1, Grid: 1, Nano: 1 } as Research,
    blueprints: { interceptor: [...baseBp], cruiser: [], dread: [] } as Record<FrameId, typeof baseBp[number][]>,
    fleet: [ship as any],
    capacity: { cap: 3 },
    tonnageUsed: ship.frame.tonnage,
    focusedIndex: 0,
  }
}

const envMp: OutpostEnv = { gameMode: 'multiplayer', economyMods: { credits: 1, materials: 1 } }

describe('Outpost intent → command mapping + apply', () => {
  it('buy_and_install installs a valid part and deducts credits', () => {
    const st0 = baseState()
    const cmd = OutpostIntents.buyAndInstall(PARTS.weapons.find(p=>p.id==='plasma')!)
    const { state: st1 } = applyOutpostCommand(st0, envMp, cmd)
    expect(st1.resources.credits).toBeLessThan(st0.resources.credits)
    expect(st1.blueprints.interceptor.length).toBe(st0.blueprints.interceptor.length + 1)
    expect(st1.fleet[0].stats.valid).toBe(true)
  })

  it('sell_part removes part and refunds credits', () => {
    const st0 = (() => {
      const s = baseState()
      // first buy a part so we can sell
      const { state: s1 } = applyOutpostCommand(s, envMp, OutpostIntents.buyAndInstall(PARTS.weapons.find(p=>p.id==='plasma')!))
      return s1
    })()
    const creditsBefore = st0.resources.credits
    const bpLen = st0.blueprints.interceptor.length
    const { state: st1 } = applyOutpostCommand(st0, envMp, OutpostIntents.sellPart('interceptor', bpLen - 1))
    expect(st1.resources.credits).toBeGreaterThan(creditsBefore)
    expect(st1.blueprints.interceptor.length).toBe(bpLen - 1)
  })

  it('build_ship adds an interceptor and focuses it', () => {
    const st0 = baseState()
    const fleetBefore = st0.fleet.length
    const { state: st1 } = applyOutpostCommand(st0, envMp, OutpostIntents.buildShip())
    expect(st1.fleet.length).toBe(fleetBefore + 1)
    expect(st1.focusedIndex).toBe(fleetBefore)
  })

  it('upgrade_ship promotes Interceptor → Cruiser when research allows', () => {
    const s0 = baseState()
    s0.research.Military = 2
    const { state: s1 } = applyOutpostCommand(s0, envMp, OutpostIntents.upgradeShip(0))
    expect(s1.fleet[0].frame.id).toBe('cruiser')
  })

  it('upgrade_dock increases capacity and charges resources', () => {
    const s0 = baseState()
    const cap0 = s0.capacity.cap
    const credits0 = s0.resources.credits
    const { state: s1 } = applyOutpostCommand(s0, envMp, OutpostIntents.upgradeDock())
    expect(s1.capacity.cap).toBe(cap0 + 1)
    expect(s1.resources.credits).toBeLessThan(credits0)
  })
})
