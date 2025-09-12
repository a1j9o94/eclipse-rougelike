import { FRAMES } from '../../shared/frames'
import { PARTS } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import { makeShip } from '../game/ship'
import { getStep } from './state'

const BASE_PARTS = [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0]]

export function buildTutorialEnemyFleet(): Ship[] {
  const step = getStep()
  const count = step === 'combat-2' ? 2 : step === 'intro-combat' ? 1 : 3
  const ships: Ship[] = [] as unknown as Ship[]
  for (let i = 0; i < count; i++) {
    ships.push(makeShip(FRAMES.interceptor, BASE_PARTS) as unknown as Ship)
  }
  return ships
}
