import type { Resources } from '../../shared/defaults'
import { getMyResources } from '../adapters/mpSelectors'

type PlayerLite = { playerId?: string; playerName?: string; faction?: string } | null | undefined
type RoomLite = { players?: Array<{ playerId: string; lives: number }>; status?: string } | null | undefined

export type MpUiBasics = {
  getCurrentPlayer?: () => PlayerLite
  roomDetails?: { room?: RoomLite; players?: Array<{ playerId: string; lives: number }> } | null
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

  // In multiplayer, prefer server-authoritative resources so rewards after combat are visible immediately
  const viewResources: Resources = gameMode === 'multiplayer'
    ? getMyResources(multi as unknown as Parameters<typeof getMyResources>[0], resources)
    : resources

  const me = multi?.getCurrentPlayer?.() || null
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
    credits: viewResources.credits,
    materials: viewResources.materials,
    science: viewResources.science,
    tonnage,
    sector,
    onReset,
    lives,
    multiplayer: gameMode === 'multiplayer',
  }
}

export default useResourceBarVm
