import { useCallback } from 'react'

export function useMatchOverClose(params: {
  multi?: { prepareRematch?: ()=>Promise<void> } | null
  setters: {
    setMatchOver: (v: { winnerName:string } | null) => void
    setMode: (m: 'OUTPOST'|'COMBAT') => void
    setLog: (v: string[]) => void
    setRoundNum: (n: number) => void
    setTurnPtr: (n: number) => void
    setQueue: (v: unknown[]) => void
    setCombatOver: (v: boolean) => void
    setOutcome: (v: string) => void
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

