import type { Ship } from '../../shared/types'
import type { PlayerState } from '../../shared/mpTypes'
import { getLastSeenFleet } from '../multiplayer/lastSeen'
import { fromSnapshotToShip, type ShipSnapshot } from '../multiplayer/snapshot'
import { seedFleetFromBlueprints } from '../multiplayer/blueprintHints'

export type MpOpponentBasics = {
  getOpponent?: () => ({ playerId: string; playerName?: string } | null | undefined)
  gameState?: { playerStates?: Record<string, PlayerState>; roundNum?: number } | null
  roomDetails?: { room?: { gameConfig?: { startingShips?: number } }; players?: Array<{ playerId:string; playerName?:string; lives?: number }> } | null
}

export function selectOpponentIntel(gameMode: 'single'|'multiplayer', multi?: MpOpponentBasics): {
  source: 'default'|'last_combat'
  fleet: Ship[] | null
  round?: number
  opponentName?: string
  opponentLives?: number
} {
  if (gameMode !== 'multiplayer' || !multi?.getOpponent) return { source: 'default', fleet: null }
  try {
    const opp = multi.getOpponent?.()
    if (!opp?.playerId) return { source: 'default', fleet: null }
    const round = (multi.gameState?.roundNum as number | undefined) || 1
    const players = multi.roomDetails?.players || []
    const opponentName = opp.playerName || players.find(p=>p.playerId===opp.playerId)?.playerName
    const opponentLives = players.find(p=>p.playerId===opp.playerId)?.lives
    const last = getLastSeenFleet(opp.playerId)
    if (last && last.length > 0) return { source: 'last_combat', fleet: last as Ship[], round, opponentName, opponentLives }
    // Pre-combat/default: try opponent's current snapshot first
    const st = (multi.gameState?.playerStates as Record<string, PlayerState> | undefined)?.[opp.playerId]
    const snapFleet = Array.isArray(st?.fleet) ? (st!.fleet as unknown as ShipSnapshot[]) : []
    if (snapFleet.length > 0) {
      const ships = snapFleet.map(fromSnapshotToShip) as Ship[]
      return { source: 'default', fleet: ships, round, opponentName, opponentLives }
    }
    // Fallback to blueprint-based seed if server exposes ids/hints + startingShips
    const starting = (multi.roomDetails?.room?.gameConfig?.startingShips as number | undefined) || 1
    const sf = (st?.modifiers?.startingFrame as ('interceptor'|'cruiser'|'dread') | undefined) || 'interceptor'
    const ids = ((st?.blueprintIds as Record<'interceptor'|'cruiser'|'dread', string[]> | undefined)?.[sf])
      || ((st?.modifiers?.blueprintHints as Record<string, string[]> | undefined)?.[sf])
      || []
    if (ids.length > 0 && starting > 0) {
      const ships = seedFleetFromBlueprints(sf, ids, starting)
      return { source: 'default', fleet: ships as Ship[], round, opponentName, opponentLives }
    }
    return { source: 'default', fleet: null, round, opponentName, opponentLives }
  } catch {
    return { source: 'default', fleet: null }
  }
}
