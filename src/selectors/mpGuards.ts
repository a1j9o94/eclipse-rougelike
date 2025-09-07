import type { PlayerState } from '../../shared/mpTypes'

export type MpBasics = {
  getPlayerId?: () => string | null
  getCurrentPlayer?: () => { isReady?: boolean } | null | undefined
  getOpponent?: () => { isReady?: boolean; playerId: string } | null | undefined
  gameState?: { playerStates?: Record<string, PlayerState> } | null
}

export type MpGuards = {
  myReady: boolean
  oppReady: boolean
  localValid: boolean
  serverValid: boolean | undefined
  haveSnapshot: boolean
}

export function buildMpGuards(multi: MpBasics | undefined, localFleetValid: boolean): MpGuards {
  try {
    const myId = multi?.getPlayerId?.() as string | null
    const pStates = multi?.gameState?.playerStates as Record<string, PlayerState> | undefined
    const st = myId ? pStates?.[myId] : undefined
    const haveSnapshot = Array.isArray(st?.fleet) && (st!.fleet as unknown[]).length > 0
    const myReady = !!multi?.getCurrentPlayer?.()?.isReady
    const oppReady = !!multi?.getOpponent?.()?.isReady
    const serverValid = typeof st?.fleetValid === 'boolean' ? st.fleetValid : undefined
    return { myReady, oppReady, localValid: localFleetValid, serverValid, haveSnapshot }
  } catch {
    return { myReady: false, oppReady: false, localValid: localFleetValid, serverValid: undefined, haveSnapshot: false }
  }
}

