import { useEffect } from 'react'
import type { PlayerState } from '../../shared/mpTypes'
import type { FrameId } from '../game'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import { getFrame, makeShip } from '../game'
// INITIAL_BLUEPRINTS not needed here (prefer server bpIds or current blueprints)
import { seedFleetFromBlueprints } from '../multiplayer/blueprintHints'

export function useMpSeedSubmit(params: {
  gameMode: 'single'|'multiplayer'
  multi?: {
    isConvexAvailable?: boolean
    gameState?: { gamePhase?: string; playerStates?: Record<string, PlayerState>; roundNum?: number } | null
    roomDetails?: { room?: { gameConfig?: { startingShips?: number } } } | null
    getPlayerId?: () => string | null
    submitFleetSnapshot?: (payload: unknown, valid: boolean) => void | Promise<void>
  }
  mpServerSnapshotApplied: boolean
  mpSeedSubmitted: boolean
  mpSeeded: boolean
  setMpSeedSubmitted: (v: boolean) => void
  setMpSeeded: (v: boolean) => void
  setFleet: (s: Ship[]) => void
  setCapacity: (fn: (c: { cap: number }) => { cap: number }) => void
  setFocused: (n: number) => void
  blueprints: Record<FrameId, Part[]>
  fleetValid: boolean
}){
  const { gameMode, multi, mpServerSnapshotApplied, mpSeedSubmitted, mpSeeded, setMpSeedSubmitted, setFleet, setCapacity, setFocused, blueprints, fleetValid } = params
  useEffect(() => {
    if (gameMode !== 'multiplayer') return
    if (!multi || !multi.isConvexAvailable) return
    if (multi.gameState?.gamePhase !== 'setup') return
    try {
      const myId = multi.getPlayerId?.() as string | null
      const st = myId ? (multi.gameState?.playerStates as Record<string, PlayerState> | undefined)?.[myId] : null
      const serverFleet = Array.isArray(st?.fleet) ? (st.fleet as unknown[]) : []
      const roundNum = (multi.gameState?.roundNum || 1) as number
      const starting = (multi.roomDetails?.room?.gameConfig?.startingShips as number | undefined) || 1
      if (!mpServerSnapshotApplied && !mpSeedSubmitted && !mpSeeded && roundNum === 1 && serverFleet.length === 0) {
        const mods = (st?.modifiers as { startingFrame?: 'interceptor'|'cruiser'|'dread'; blueprintHints?: Record<string, string[]> } | undefined)
        const bpIds = (st?.blueprintIds as Record<FrameId, string[]> | undefined)
        const sf = (mods?.startingFrame as FrameId | undefined) || 'interceptor'
        const idsForFrame: string[] = Array.isArray(bpIds?.[sf]) && bpIds![sf].length>0
          ? (bpIds as Record<FrameId, string[]>)[sf]
          : ((mods?.blueprintHints as Record<string, string[]> | undefined)?.[sf] || [])
        let ships: Ship[]
        if (idsForFrame.length > 0) {
          ships = seedFleetFromBlueprints(sf, idsForFrame, Math.max(1, starting))
        } else {
          const bp = blueprints
          ships = Array.from({ length: Math.max(1, starting) }, () => makeShip(getFrame(sf), [ ...(bp[sf] || []) ])) as unknown as Ship[]
        }
        setFleet(ships)
        setCapacity(c => ({ cap: Math.max(c.cap, ships.length) }))
        setFocused(0)
        setMpSeedSubmitted(true)
        try { void multi.submitFleetSnapshot?.(ships as unknown, fleetValid) } catch {/* ignore */}
      }
    } catch {/* ignore */}
  }, [gameMode, multi?.gameState?.gamePhase, multi?.gameState?.playerStates, multi?.roomDetails?.room?.gameConfig?.startingShips, mpServerSnapshotApplied, mpSeedSubmitted, mpSeeded, blueprints, fleetValid, multi, setCapacity, setFleet, setFocused, setMpSeedSubmitted])
}

export default useMpSeedSubmit
