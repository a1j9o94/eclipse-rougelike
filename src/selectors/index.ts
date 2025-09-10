import type { Ship } from '../../shared/types'
import type { CapacityState } from '../../shared/types'

export type Tonnage = { used: number; cap: number }

export function selectTonnage(fleet: Ship[], capacity: CapacityState): Tonnage {
  const used = fleet.reduce((a, s) => a + (s.alive ? s.frame.tonnage : 0), 0)
  return { used, cap: capacity.cap }
}

export function isFleetValid(fleet: Ship[], capacity: CapacityState): boolean {
  const ton = selectTonnage(fleet, capacity)
  const allValid = fleet.every(s => s.stats.valid)
  return allValid && ton.used <= ton.cap
}

