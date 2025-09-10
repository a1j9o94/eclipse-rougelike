import { useEffect } from 'react'
import { restoreRunEnvironment, restoreOpponent, type SavedRun } from '../game/storage'

export function useRestoreEnv(saved: SavedRun | null){
  useEffect(()=>{
    if(saved){
      restoreRunEnvironment(saved.faction)
      restoreOpponent(saved.opponent)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default useRestoreEnv
