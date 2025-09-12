import type { DifficultyId } from '../../shared/types'
import type { FactionId } from '../../shared/factions'
import type { FrameId } from '../game'
import type { Resources, Research } from '../../shared/defaults'
import type { Ship } from '../../shared/types'
import { getStartingLives } from '../../shared/difficulty'
import { initNewRun, getOpponentFaction } from '../game/setup'
import { enable as tutorialEnable, setStep as tutorialSetStep } from '../tutorial/state'
import { getFrame, makeShip } from '../game'
import type { Part } from '../../shared/parts'

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

  function newRunTutorial(){
    // Start tutorial on Easy with the Helios Cartel to ensure economy matches guidance
    const diff: DifficultyId = 'easy'
    const pick: FactionId = 'industrialists'
    p.clearRunState()
    p.setDifficulty(diff)
    p.setFaction(pick)
    p.setShowNewRun(false)
    void p.playEffect('page')
    p.setEndless(false)
    p.setLivesRemaining(1)
    const st = initNewRun({ difficulty: diff, faction: pick })
    const opp = getOpponentFaction()
    params.setOpponent?.(opp as FactionId)
    // Override fleet: five Interceptors with default (faction) blueprint
    const interceptor = getFrame('interceptor')
    const intBlueprint = [ ...(st.blueprints.interceptor || []) ] as Part[]
    const fleet = Array.from({ length: 5 }, () => makeShip(interceptor, intBlueprint)) as unknown as Ship[]
    const blueprints = { ...st.blueprints, interceptor: [ ...intBlueprint ] } as Record<FrameId, Part[]>
    p.setResources(st.resources)
    p.setCapacity(st.capacity)
    p.setResearch(st.research)
    p.setRerollCost(st.rerollCost)
    p.setBaseRerollCost(st.rerollCost)
    p.setSector(1)
    p.setBlueprints(blueprints)
    p.setFleet(fleet as unknown as Ship[])
    p.setFocused(0)
    // Initial tutorial shop will be set after first combat; keep current
    p.setShop({ items: st.shopItems })
    // Do not auto-start combat. Show tutorial intro first; GameRoot will start combat on Next.
    tutorialEnable(); tutorialSetStep('intro-combat')
  }

  function resetRun(){
    p.clearRunState()
    p.setDifficulty(null)
    p.setShowNewRun(true)
    p.setEndless(false)
    p.setLivesRemaining(0)
  }

  return { newRun, newRunTutorial, resetRun }
}

export default useRunManagement
