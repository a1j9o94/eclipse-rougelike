import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { InitiativeEntry } from '../../shared/types'

export function useMatchOverClose(params: {
  multi?: { prepareRematch?: ()=>Promise<void> } | null
  setters: {
    setMatchOver: (v: { winnerName:string } | null) => void
    setMode: (m: 'OUTPOST'|'COMBAT') => void
    setLog: Dispatch<SetStateAction<string[]>>
    setRoundNum: Dispatch<SetStateAction<number>>
    setTurnPtr: Dispatch<SetStateAction<number>>
    setQueue: Dispatch<SetStateAction<InitiativeEntry[]>>
    setCombatOver: Dispatch<SetStateAction<boolean>>
    setOutcome: Dispatch<SetStateAction<string>>
    setMultiplayerPhase: (p: 'menu'|'lobby'|'game') => void
  }
}){
  const { multi, setters } = params
  return useCallback(() => {
    try { void multi?.prepareRematch?.() } catch { /* noop */ }
    setters.setMatchOver(null)
    setters.setMode('OUTPOST')
    setters.setLog([])
    setters.setRoundNum(1)
    setters.setTurnPtr(-1)
    setters.setQueue([])
    setters.setCombatOver(false)
    setters.setOutcome('')
    setters.setMultiplayerPhase('lobby')
  }, [multi, setters])
}

export default useMatchOverClose
