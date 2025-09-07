import type { DifficultyId } from '../../shared/types'
import type { FactionId } from '../../shared/factions'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { Resources, Research } from '../../shared/defaults'
import type { Ship } from '../../shared/types'
import { getStartingLives } from '../../shared/difficulty'
import { initNewRun, getOpponentFaction } from '../game/setup'

export function useRunManagement(params: {
  setDifficulty: (d: DifficultyId | null) => void
  setFaction: (f: FactionId) => void
  setOpponent?: (f: FactionId) => void
  setShowNewRun: (v: boolean) => void
  playEffect: (k: string) => void | Promise<void>
  setEndless: (v: boolean) => void
  setLivesRemaining: (n: number) => void
  setResources: (r: Resources) => void
  setCapacity: (c: { cap: number }) => void
  setResearch: (r: Research) => void
  setRerollCost: (n: number) => void
  setBaseRerollCost: (n: number) => void
  setSector: (n: number) => void
  setBlueprints: (bp: Record<FrameId, Part[]>) => void
  setFleet: (f: Ship[]) => void
  setFocused: (n: number) => void
  setShop: (s: { items: Part[] }) => void
  startFirstCombat: () => void
  clearRunState: () => void
  setShowRules?: (v: boolean) => void
}){
  const p = params
  function newRun(diff: DifficultyId, pick: FactionId){
    p.clearRunState()
    p.setDifficulty(diff)
    p.setFaction(pick)
    p.setShowNewRun(false)
    void p.playEffect('page')
    p.setEndless(false)
    p.setLivesRemaining(getStartingLives(diff))
    const st = initNewRun({ difficulty: diff, faction: pick })
    const opp = getOpponentFaction()
    params.setOpponent?.(opp as FactionId)
    p.setResources(st.resources)
    p.setCapacity(st.capacity)
    p.setResearch(st.research)
    p.setRerollCost(st.rerollCost)
    p.setBaseRerollCost(st.rerollCost)
    p.setSector(st.sector)
    p.setBlueprints(st.blueprints)
    p.setFleet(st.fleet as unknown as Ship[])
    p.setFocused(0)
    p.setShop({ items: st.shopItems })
    p.startFirstCombat()
    params.setShowRules?.(true)
  }

  function resetRun(){
    p.clearRunState()
    p.setDifficulty(null)
    p.setShowNewRun(true)
    p.setEndless(false)
    p.setLivesRemaining(0)
  }

  return { newRun, resetRun }
}

export default useRunManagement
