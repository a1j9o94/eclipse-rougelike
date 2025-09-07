import type { Ship } from '../../shared/types'

export function upgradeLockInfo(ship: Ship | null | undefined){
  if (!ship) return null
  if (ship.frame.id === 'interceptor') return { need: 2, next: 'Cruiser' }
  if (ship.frame.id === 'cruiser') return { need: 3, next: 'Dreadnought' }
  return null
}

export default upgradeLockInfo

