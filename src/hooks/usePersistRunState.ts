import { useEffect } from 'react'
import type { Resources, Research } from '../../shared/defaults'
import type { CapacityState, Ship } from '../../shared/types'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import { saveRunState, evaluateUnlocks, type SavedRun } from '../game/storage'
import type { DifficultyId } from '../../shared/types'
import type { FactionId } from '../../shared/factions'

export function usePersistRunState(params: {
  difficulty: DifficultyId | null
  faction: FactionId
  opponent: FactionId
  resources: Resources
  research: Research
  rerollCost: number
  baseRerollCost: number
  capacity: CapacityState
  sector: number
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  shop: { items: Part[] }
  livesRemaining: number
}){
  useEffect(() => {
    if (!params.difficulty) return
    const st = {
      difficulty: params.difficulty,
      faction: params.faction,
      opponent: params.opponent,
      resources: params.resources,
      research: params.research,
      rerollCost: params.rerollCost,
      baseRerollCost: params.baseRerollCost,
      capacity: params.capacity,
      sector: params.sector,
      blueprints: params.blueprints,
      fleet: params.fleet,
      shop: params.shop,
      livesRemaining: params.livesRemaining,
    }
    saveRunState(st as SavedRun)
    evaluateUnlocks(st as Partial<SavedRun>)
  }, [params])
}

export default usePersistRunState
