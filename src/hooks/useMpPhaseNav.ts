import { useEffect } from 'react'
import { fromSnapshotToShip, type ShipSnapshot } from '../multiplayer/snapshot'
import { setLastSeenFleet } from '../multiplayer/lastSeen'
import type { PlayerState } from '../../shared/mpTypes'
import { computePlaybackDelay } from '../utils/playback'

type MpNav = {
  getPlayerId?: () => string | null
  getOpponent?: () => ({ playerId: string } | null | undefined)
  gameState?: { gamePhase?: string; playerStates?: Record<string, PlayerState>; roundLog?: string[] } | null
  roomDetails?: { room?: { status?: string } } | null
  ackRoundPlayed?: () => void | Promise<void>
}

export function useMpPhaseNav(params: {
  gameMode: 'single'|'multiplayer'
  multi?: MpNav
  setters: {
    setMode: (m: 'OUTPOST'|'COMBAT') => void
    setFleet: (f: unknown[]) => void
    setEnemyFleet: (f: unknown[]) => void
    setMultiplayerPhase: (p: 'menu'|'lobby'|'game') => void
    setLog: (f: (l: string[]) => string[]) => void
  }
}){
  const { gameMode, multi, setters } = params
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !multi) return
    const phase = multi.gameState?.gamePhase
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    if (phase === 'setup') {
      // Only enter game view once the room is actually playing
      const isPlaying = multi.roomDetails?.room?.status === 'playing'
      if (isPlaying) {
        setters.setMultiplayerPhase('game')
        setters.setMode('OUTPOST')
      } else {
        try { console.debug('[MP] setup phase observed but room not playing; staying in lobby') } catch { /* noop */ }
      }
      return () => { if (timeoutId) clearTimeout(timeoutId) }
    }
    if (phase === 'combat') {
      // Optional: require playing status to be safe
      const isPlaying = multi.roomDetails?.room?.status === 'playing'
      if (!isPlaying) return () => { if (timeoutId) clearTimeout(timeoutId) }
      setters.setMode('COMBAT')
      try {
        const myId = multi.getPlayerId?.() as string | null
        const opp = multi.getOpponent?.()
        const pStates = multi.gameState?.playerStates as Record<string, PlayerState> | undefined
        const myFleet = myId ? pStates?.[myId]?.fleet : undefined
        const oppFleet = opp ? pStates?.[opp.playerId]?.fleet : undefined
        if (Array.isArray(myFleet)) setters.setFleet((myFleet as ShipSnapshot[]).map(fromSnapshotToShip) as unknown[])
        if (Array.isArray(oppFleet)) {
          const oppShips = (oppFleet as ShipSnapshot[]).map(fromSnapshotToShip) as unknown[]
          setters.setEnemyFleet(oppShips)
          // Record as last-seen for use in Outpost Enemy Intel
          if (opp?.playerId) setLastSeenFleet(opp.playerId, oppShips as never)
        }
      } catch { /* ignore */ }
      const lines = (multi.gameState?.roundLog as string[] | undefined) || ["Combat resolved."]
      setters.setLog(l => [...l, ...lines])
      const delay = computePlaybackDelay(lines as string[])
      timeoutId = setTimeout(() => { try { void multi.ackRoundPlayed?.() } catch { /* noop */ } }, delay)
      ;(timeoutId as unknown as { unref?: () => void })?.unref?.()
      return () => { if (timeoutId) clearTimeout(timeoutId) }
    } else if (phase === 'finished') {
      // GameRoot handles UI for winner modal; no-op here
    }
    return () => { if (timeoutId) clearTimeout(timeoutId) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, multi?.gameState?.gamePhase, multi?.roomDetails?.room?.status, multi?.gameState?.playerStates])
}

export default useMpPhaseNav
