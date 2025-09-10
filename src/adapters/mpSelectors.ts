import type { Resources } from '../../shared/defaults'
import type { PlayerState } from '../../shared/mpTypes'
import type { EconMods } from '../game/economy'

export type MpBasics = {
  getPlayerId?: () => string | null
  gameState?: { playerStates?: Record<string, PlayerState> } | null
}

export function getMyPlayerState(multi: MpBasics | undefined): PlayerState | null {
  try {
    if (!multi) return null
    const myId = multi.getPlayerId?.() as string | null
    const pStates = multi.gameState?.playerStates as Record<string, PlayerState> | undefined
    return myId ? (pStates?.[myId] ?? null) : null
  } catch {
    return null
  }
}

export function getMyEconomyMods(multi: MpBasics | undefined): EconMods {
  try {
    const st = getMyPlayerState(multi)
    return {
      credits: st?.economy?.creditMultiplier ?? 1,
      materials: st?.economy?.materialMultiplier ?? 1,
    }
  } catch {
    return { credits: 1, materials: 1 }
  }
}

export function getMyResources(multi: MpBasics | undefined, fallback: Resources): Resources {
  try {
    const st = getMyPlayerState(multi)
    return (st?.resources as Resources | undefined) ?? fallback
  } catch {
    return fallback
  }
}

