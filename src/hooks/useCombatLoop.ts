import { useMemo, useRef } from 'react'
import { dlog } from '../utils/debug'
import type { Ship, InitiativeEntry } from '../../shared/types'
import { getSectorSpec } from '../game'
import { buildEnemyFleet, generateEnemyFleetFor } from '../game/enemy'
import { buildInitiative as buildInitiativeCore, targetIndex as targetIndexCore, volley as volleyCore } from '../game/combat'
import { shotDurationMs } from '../game/timing'
import { fromMathRandom, type Rng } from '../engine/rng'
import { precomputeDynamicStats, startRoundTick, triggerHook } from '../../shared/effectsEngine'
import type { BattleCtx, EffectfulPart } from '../../shared/effects'

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
    rerollsThisRun: () => number
  }
  setters: {
    setFleet: (f: Ship[]) => void
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
  rng?: Rng
}){
  const { getters, setters, sfx, rng } = params
  const stepLock = useRef(false)
  const rewardPaid = useRef(false)
  const shotsFiredThisRound = useRef(false)
  const battleCtxRef = useRef<BattleCtx | null>(null)

  const buildInitiative = useMemo(() => (pFleet:Ship[], eFleet:Ship[]) => buildInitiativeCore(pFleet, eFleet, rng) as InitiativeEntry[], [rng])
  const targetIndex = useMemo(() => (defFleet:Ship[], strategy:'kill'|'guns') => targetIndexCore(defFleet, strategy), [])
  const volley = useMemo(() => (attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], friends:Ship[]) => volleyCore(attacker, defender, side, logArr, friends, rng), [rng])

  function setupBattleContext(playerFleet: Ship[], enemyFleet: Ship[]) {
    const ctxRng = rng ?? fromMathRandom()
    const ctx: BattleCtx = {
      rng: () => ctxRng.next(),
      rerollsThisRun: getters.rerollsThisRun(),
      status: {
        corrosion: new WeakMap(),
        painter: null,
        fleetTempShield: { P: null, E: null },
        tempShield: new WeakMap(),
        oncePerCombat: new WeakMap(),
      },
    }
    battleCtxRef.current = ctx
    ;(globalThis as { battleCtx?: BattleCtx }).battleCtx = ctx
    precomputeDynamicStats(playerFleet, enemyFleet, ctx)
    precomputeDynamicStats(enemyFleet, playerFleet, ctx)
    const playerScope = { allies: playerFleet, enemies: enemyFleet }
    const enemyScope = { allies: enemyFleet, enemies: playerFleet }
    for (const ship of playerFleet) {
      if (ship?.stats) delete (ship.stats as { magnet?: boolean }).magnet
      triggerHook((ship?.parts as EffectfulPart[]) ?? [], 'onPreCombat', ship, null, playerScope, ctx, 'P')
    }
    for (const ship of enemyFleet) {
      if (ship?.stats) delete (ship.stats as { magnet?: boolean }).magnet
      triggerHook((ship?.parts as EffectfulPart[]) ?? [], 'onPreCombat', ship, null, enemyScope, ctx, 'E')
    }
  }

  function startCombat(){
    const sector = getters.sector()
    const spec = getSectorSpec(sector)
    const enemy = rng ? buildEnemyFleet(sector, rng) : generateEnemyFleetFor(sector)
    dlog('startCombat', { sector, enemyTonnage: spec.enemyTonnage, enemyCount: enemy.length })
    setters.setEnemyFleet(enemy)
      setters.setLog(() => [`Sector ${sector}: Engagement begins — enemy tonnage ${spec.enemyTonnage}`])
    setters.setRoundNum(() => 1)
    setters.setQueue([])
    setters.setTurnPtr(-1)
    shotsFiredThisRound.current = false
    setters.setCombatOver(false)
    setters.setOutcome('')
    rewardPaid.current = false
    void sfx.playEffect('page')
    void sfx.playEffect('startCombat')
    setupBattleContext(getters.fleet(), enemy)
    setters.setMode('COMBAT')
  }

  function startFirstCombat(){
    const sector = getters.sector()
    const enemy = [ { ...(rng ? buildEnemyFleet(1, rng)[0] : generateEnemyFleetFor(1)[0]) } ] as unknown as Ship[]
    dlog('startFirstCombat', { sector, enemyCount: enemy.length })
    setters.setEnemyFleet(enemy)
    setters.setLog(() => [`Sector ${sector}: Skirmish — a lone Interceptor approaches.`])
    setters.setRoundNum(() => 1)
    setters.setQueue([])
    setters.setTurnPtr(-1)
    shotsFiredThisRound.current = false
    setters.setCombatOver(false)
    setters.setOutcome('')
    rewardPaid.current = false
    void sfx.playEffect('page')
    void sfx.playEffect('startCombat')
    setupBattleContext(getters.fleet(), enemy)
    setters.setMode('COMBAT')
  }

  function initRoundIfNeeded(){
    const turnPtr = getters.turnPtr()
    const qFleet = getters.fleet()
    const eFleet = getters.enemyFleet()
    const roundNum = getters.roundNum()
    if (turnPtr === -1 || turnPtr >= (qFleet.length + eFleet.length)) {
      if (turnPtr === -1) shotsFiredThisRound.current = false
      const q = buildInitiative(qFleet, eFleet)
      setters.setQueue(q)
      setters.setTurnPtr(0)
      const ctx = battleCtxRef.current
      if (ctx) {
        const tickLog: string[] = []
        startRoundTick(qFleet, eFleet, ctx, tickLog)
        const header = `— Round ${roundNum} —`
        const payload = tickLog.length > 0 ? [header, ...tickLog] : [header]
        setters.setLog(l => [...l, ...payload])
        const playerScope = { allies: qFleet, enemies: eFleet }
        const enemyScope = { allies: eFleet, enemies: qFleet }
        for (const ship of qFleet) {
          triggerHook((ship?.parts as EffectfulPart[]) ?? [], 'onStartRound', ship, null, playerScope, ctx, 'P')
        }
        for (const ship of eFleet) {
          triggerHook((ship?.parts as EffectfulPart[]) ?? [], 'onStartRound', ship, null, enemyScope, ctx, 'E')
        }
      } else {
        setters.setLog(l => [...l, `— Round ${roundNum} —`])
      }
      return true
    }
    return false
  }

  function resolveCombat(pAlive:boolean){
    battleCtxRef.current = null
    try { delete (globalThis as { battleCtx?: BattleCtx }).battleCtx } catch { /* noop */ }
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
      const pAlive = pFleetArr.some(s => s.alive)
      const eAlive = eFleetArr.some(s => s.alive)
      dlog('stepTurn:enter', { round: getters.roundNum(), turnPtr: getters.turnPtr(), pAlive, eAlive, pAliveValid: pFleetArr.some(s=>s.alive && s.stats.valid), eAliveValid: eFleetArr.some(s=>s.alive && s.stats.valid), pCount: pFleetArr.length, eCount: eFleetArr.length })
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
      const enemiesForFriends = isP ? eFleetArr : pFleetArr
      ;(friends as unknown as { _enemies?: Ship[] })._enemies = enemiesForFriends
      ;(friends as unknown as { _allies?: Ship[] })._allies = friends
      ;(enemiesForFriends as unknown as { _allies?: Ship[] })._allies = enemiesForFriends
      ;(enemiesForFriends as unknown as { _enemies?: Ship[] })._enemies = friends
      dlog('volley', { side: e.side, atkIdx: e.idx, defIdx, atkAlive: atk.alive, defAliveBefore: def.alive })
      volley(atk, def, e.side, lines, friends)
      shotsFiredThisRound.current = true
      setters.setLog(prev=>[...prev, ...lines])
      if (isP) {
        // Player attacked enemy — defender is enemy fleet
        setters.setEnemyFleet([...defFleet])
        dlog('updateFleet', { side: 'P', enemyCount: defFleet.length })
      } else {
        // Enemy attacked player — defender is our fleet
        setters.setFleet([...defFleet])
        dlog('updateFleet', { side: 'E', playerCount: defFleet.length })
      }
      if(atk.weapons.length>0 || atk.riftDice>0){
        const dur = import.meta.env.MODE==='test' ? 0 : shotDurationMs(getters.roundNum())
        await sfx.playEffect('shot', dur)
        if(!def.alive){ await sfx.playEffect('explosion', dur) }
      }
      advancePtr()
    } finally {
      dlog('stepTurn:exit', { round: getters.roundNum(), turnPtr: getters.turnPtr() })
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
    const pAlive = pFleetArr.some(s => s.alive)
    const eAlive = eFleetArr.some(s => s.alive)
    if (!pAlive || !eAlive) { dlog('resolveCombat', { reason: !pAlive ? 'playerDead' : 'enemyDead', pAlive, eAlive }); resolveCombat(pAlive); return }

    // Stalemate guard (revised): only end if neither side can attack at all
    if (!shotsFiredThisRound.current) {
      const pCanAttack = pFleetArr.some(s => s.alive && s.stats.valid && (s.weapons.length>0 || s.riftDice>0))
      const eCanAttack = eFleetArr.some(s => s.alive && s.stats.valid && (s.weapons.length>0 || s.riftDice>0))
      if (!pCanAttack && !eCanAttack) { dlog('resolveCombat', { reason: 'bothCannotAttack' }); resolveCombat(false); return }
      // Otherwise continue to next round; attackers will be able to target any alive ships
    }
    setters.setRoundNum(n=>n+1)
    setters.setTurnPtr(-1)
    setters.setQueue([])
    dlog('endRound', { round: getters.roundNum() })
  }

  return { startCombat, startFirstCombat, stepTurn }
}

export default useCombatLoop
