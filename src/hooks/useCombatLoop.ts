import { useMemo, useRef } from 'react'
import type { Ship, InitiativeEntry } from '../../shared/types'
import { getSectorSpec } from '../game'
import { generateEnemyFleetFor } from '../game/enemy'
import { buildInitiative as buildInitiativeCore, targetIndex as targetIndexCore, volley as volleyCore } from '../game/combat'

type EffectKey = 'shot'|'explosion'|'startCombat'|'page'

export function useCombatLoop(params: {
  getters: {
    sector: () => number
    fleet: () => Ship[]
    enemyFleet: () => Ship[]
    roundNum: () => number
    turnPtr: () => number
    combatOver: () => boolean
    showRules: () => boolean
  }
  setters: {
    setEnemyFleet: (f: Ship[]) => void
    setLog: (fn: (l: string[]) => string[]) => void
    setRoundNum: (fn: (n: number) => number) => void
    setQueue: (q: InitiativeEntry[]) => void
    setTurnPtr: (n: number) => void
    setCombatOver: (v: boolean) => void
    setOutcome: (s: string) => void
    setMode: (m: 'OUTPOST'|'COMBAT') => void
  }
  sfx: { playEffect: (k: EffectKey, duration?: number) => Promise<void> }
}){
  const { getters, setters, sfx } = params
  const stepLock = useRef(false)
  const rewardPaid = useRef(false)

  const buildInitiative = useMemo(() => (pFleet:Ship[], eFleet:Ship[]) => buildInitiativeCore(pFleet, eFleet) as InitiativeEntry[], [])
  const targetIndex = useMemo(() => (defFleet:Ship[], strategy:'kill'|'guns') => targetIndexCore(defFleet, strategy), [])
  const volley = useMemo(() => (attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], friends:Ship[]) => volleyCore(attacker, defender, side, logArr, friends), [])

  function startCombat(){
    const sector = getters.sector()
    const spec = getSectorSpec(sector)
    const enemy = generateEnemyFleetFor(sector)
    setters.setEnemyFleet(enemy)
      setters.setLog(() => [`Sector ${sector}: Engagement begins — enemy tonnage ${spec.enemyTonnage}`])
    setters.setRoundNum(() => 1)
    setters.setQueue([])
    setters.setTurnPtr(-1)
    setters.setCombatOver(false)
    setters.setOutcome('')
    rewardPaid.current = false
    void sfx.playEffect('page')
    void sfx.playEffect('startCombat')
    setters.setMode('COMBAT')
  }

  function startFirstCombat(){
    const sector = getters.sector()
    const enemy = [ { ...generateEnemyFleetFor(1)[0] } ] as unknown as Ship[]
    setters.setEnemyFleet(enemy)
    setters.setLog(() => [`Sector ${sector}: Skirmish — a lone Interceptor approaches.`])
    setters.setRoundNum(() => 1)
    setters.setQueue([])
    setters.setTurnPtr(-1)
    setters.setCombatOver(false)
    setters.setOutcome('')
    rewardPaid.current = false
    void sfx.playEffect('page')
    void sfx.playEffect('startCombat')
    setters.setMode('COMBAT')
  }

  function initRoundIfNeeded(){
    const turnPtr = getters.turnPtr()
    const qFleet = getters.fleet()
    const eFleet = getters.enemyFleet()
    const roundNum = getters.roundNum()
    if (turnPtr === -1 || turnPtr >= (qFleet.length + eFleet.length)) {
      const q = buildInitiative(qFleet, eFleet)
      setters.setQueue(q)
      setters.setTurnPtr(0)
      setters.setLog(l => [...l, `— Round ${roundNum} —`])
      return true
    }
    return false
  }

  function resolveCombat(pAlive:boolean){
    setters.setCombatOver(true)
    if(pAlive){
      if(!rewardPaid.current){
        // GameRoot handles applying rewards when returning; here we just flag outcome
        rewardPaid.current = true
      }
      setters.setOutcome('Victory')
    } else {
      setters.setOutcome('Defeat — Life Lost')
    }
  }

  async function stepTurn(){
    if(getters.combatOver() || stepLock.current || getters.showRules()) return
    stepLock.current = true
    try {
      const pFleetArr = getters.fleet()
      const eFleetArr = getters.enemyFleet()
      const pAlive = pFleetArr.some(s => s.alive && s.stats.valid)
      const eAlive = eFleetArr.some(s => s.alive && s.stats.valid)
      if (!pAlive || !eAlive) { resolveCombat(pAlive); return }
      if (initRoundIfNeeded()) return
      const qIdx = getters.turnPtr()
      const q = buildInitiative(pFleetArr, eFleetArr)
      const e = q[qIdx]
      const isP = e.side==='P'
      const atk = isP ? pFleetArr[e.idx] : eFleetArr[e.idx]
      const defFleet = isP ? eFleetArr : pFleetArr
      const friends = isP ? pFleetArr : eFleetArr
      const strategy = isP ? 'guns' : 'kill'
      const defIdx = targetIndex(defFleet, strategy)
      if (!atk || !atk.alive || !atk.stats.valid || defIdx === -1) { advancePtr(); return }
      const lines:string[] = []
      const def = defFleet[defIdx]
      volley(atk, def, e.side, lines, friends)
      setters.setLog(prev=>[...prev, ...lines])
      if (isP) {
        setters.setEnemyFleet([...defFleet])
        setters.setEnemyFleet([...defFleet])
      } else {
        setters.setEnemyFleet([...friends])
      }
      if(atk.weapons.length>0 || atk.riftDice>0){
        const dur = import.meta.env.MODE==='test' ? 0 : Math.max(100, 1000 - (getters.roundNum() - 1) * 200)
        await sfx.playEffect('shot', dur)
        if(!def.alive){ await sfx.playEffect('explosion', dur) }
      }
      advancePtr()
    } finally {
      stepLock.current = false
    }
  }

  function advancePtr(){
    const np = getters.turnPtr() + 1
    setters.setTurnPtr(np)
    const pFleetArr = getters.fleet()
    const eFleetArr = getters.enemyFleet()
    const q = buildInitiative(pFleetArr, eFleetArr)
    if (np >= q.length) endRound()
  }

  function endRound(){
    const pFleetArr = getters.fleet()
    const eFleetArr = getters.enemyFleet()
    const pAlive = pFleetArr.some(s => s.alive && s.stats.valid)
    const eAlive = eFleetArr.some(s => s.alive && s.stats.valid)
    if (!pAlive || !eAlive) { resolveCombat(pAlive); return }
    setters.setRoundNum(n=>n+1)
    setters.setTurnPtr(-1)
    setters.setQueue([])
  }

  return { startCombat, startFirstCombat, stepTurn }
}

export default useCombatLoop
