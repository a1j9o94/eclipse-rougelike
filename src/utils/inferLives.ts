import { getStartingLives } from '../../shared/difficulty'
import type { DifficultyId } from '../../shared/types'

export function inferStartingLives(diff: DifficultyId | null, saved?: { livesRemaining?: number; graceUsed?: boolean } | null){
  if (saved?.livesRemaining != null) return saved.livesRemaining as number
  if (saved?.graceUsed != null) return saved.graceUsed ? 0 : 1
  if (!diff) return 0
  return getStartingLives(diff)
}

export default inferStartingLives

