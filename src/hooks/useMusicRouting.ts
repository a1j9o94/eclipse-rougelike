import { useEffect } from 'react'
import { playMusic } from '../game/sound'

export function useMusicRouting(params: { showNewRun: boolean; mode: 'OUTPOST'|'COMBAT'; combatOver: boolean; outcome: string }){
  const { showNewRun, mode, combatOver, outcome } = params
  useEffect(() => {
    if (combatOver && outcome.startsWith('Defeat')) { playMusic('lost'); return }
    if (showNewRun || mode === 'COMBAT') { playMusic('combat') }
    else { playMusic('shop') }
  }, [showNewRun, mode, combatOver, outcome])
}

export default useMusicRouting

