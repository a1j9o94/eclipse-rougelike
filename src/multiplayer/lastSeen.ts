import type { Ship } from '../../shared/types'

const lastSeenByOpponent: Record<string, { fleet: Ship[]; at: number }> = {}

export function setLastSeenFleet(opponentId: string, fleet: Ship[]) {
  try {
    lastSeenByOpponent[opponentId] = { fleet: [...fleet], at: Date.now() }
  } catch { /* ignore */ }
}

export function getLastSeenFleet(opponentId: string): Ship[] | null {
  try {
    const rec = lastSeenByOpponent[opponentId]
    return rec ? [...rec.fleet] : null
  } catch { return null }
}

