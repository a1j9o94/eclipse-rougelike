import type { Resources, Research } from '../../shared/defaults'
import type { Part } from '../../shared/parts'
import type { CapacityState, Ship } from '../../shared/types'
import type { FrameId } from '../game'
import type { EconMods } from '../game/economy'

export type OutpostState = {
  resources: Resources
  research: Research
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  capacity: CapacityState
  tonnageUsed: number
  focusedIndex: number
  rerollCost?: number
  shopVersion?: number
}

export type OutpostEnv = {
  gameMode: 'single' | 'multiplayer'
  economyMods?: EconMods
}
