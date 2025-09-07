import type { Resources } from '../../shared/defaults'

type PlayerLite = { playerId?: string; playerName?: string; faction?: string } | null | undefined
type RoomLite = { players?: Array<{ playerId: string; lives: number }>; status?: string } | null | undefined

export type MpUiBasics = {
  getCurrentPlayer?: () => PlayerLite
  getOpponent?: () => PlayerLite
  roomDetails?: { room?: RoomLite; players?: Array<{ playerId: string; lives: number }> } | null
  gameState?: { gamePhase?: 'setup' | 'combat' | 'finished' } | null
}

export function useResourceBarVm(params: {
  resources: Resources
  tonnage: { used: number; cap: number }
  sector: number
  onReset: () => void
  gameMode: 'single' | 'multiplayer'
  singleLives?: number
  multi?: MpUiBasics
}) {
  const { resources, tonnage, sector, onReset, gameMode, singleLives, multi } = params

  const me = multi?.getCurrentPlayer?.() || null
  const opp = multi?.getOpponent?.() || null
  const phase = (multi?.gameState?.gamePhase as 'setup'|'combat'|'finished'|undefined)
  const lives = gameMode === 'single'
    ? singleLives
    : ((): number | undefined => {
        try {
          const pid = (me?.playerId || '') as string
          const players = (multi?.roomDetails as { players?: Array<{ playerId: string; lives: number }> } | null | undefined)?.players || []
          return players.find(p => p.playerId === pid)?.lives
        } catch { return undefined }
      })()

  return {
    credits: resources.credits,
    materials: resources.materials,
    science: resources.science,
    tonnage,
    sector,
    onReset,
    lives,
    meName: gameMode === 'multiplayer' ? (me?.playerName || 'You') : undefined,
    meFaction: gameMode === 'multiplayer' ? (me?.faction as string | undefined) : undefined,
    opponent: gameMode === 'multiplayer' && opp ? { name: opp.playerName || 'Opponent', lives: ((): number => {
      try {
        const pid = (opp?.playerId || '') as string
        const players = (multi?.roomDetails as { players?: Array<{ playerId: string; lives: number }> } | null | undefined)?.players || []
        return players.find(p => p.playerId === pid)?.lives ?? 0
      } catch { return 0 }
    })() } : undefined,
    opponentFaction: gameMode === 'multiplayer' ? (opp?.faction as string | undefined) : undefined,
    phase,
  }
}

export default useResourceBarVm

