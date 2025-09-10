import { useState, type Dispatch, type SetStateAction } from 'react'
import type { Ship, InitiativeEntry } from '../../shared/types'

export function useCombatViewState(){
  const [enemyFleet, setEnemyFleet] = useState<Ship[]>([])
  const [log, setLog] = useState<string[]>([])
  const [roundNum, setRoundNum] = useState<number>(1)
  const [queue, setQueue] = useState<InitiativeEntry[]>([])
  const [turnPtr, setTurnPtr] = useState(-1)
  const [combatOver, setCombatOver] = useState(false)
  const [outcome, setOutcome] = useState('')
  return {
    enemyFleet,
    setEnemyFleet: setEnemyFleet as Dispatch<SetStateAction<Ship[]>>,
    log,
    setLog: setLog as Dispatch<SetStateAction<string[]>>,
    roundNum,
    setRoundNum: setRoundNum as Dispatch<SetStateAction<number>>,
    queue,
    setQueue: setQueue as Dispatch<SetStateAction<InitiativeEntry[]>>,
    turnPtr,
    setTurnPtr: setTurnPtr as Dispatch<SetStateAction<number>>,
    combatOver,
    setCombatOver: setCombatOver as Dispatch<SetStateAction<boolean>>,
    outcome,
    setOutcome: setOutcome as Dispatch<SetStateAction<string>>,
  }
}

export type CombatViewState = ReturnType<typeof useCombatViewState>

export default useCombatViewState
