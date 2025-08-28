import { type Ship } from '../config/types'
import { genEnemyFleet } from './combat'

export function generateEnemyFleetFor(sector:number): Ship[]{
  return genEnemyFleet(sector) as unknown as Ship[];
}


