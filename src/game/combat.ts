import { RIFT_FACES } from '../../shared/parts'
import { triggerHook, effectiveShieldTier } from '../../shared/effectsEngine'
import type { EffectfulPart, BattleCtx } from '../../shared/effects'
import { type Ship, type InitiativeEntry } from '../../shared/types'
import { sizeRank } from './ship'
import type { Rng } from '../engine/rng'
import { fromMathRandom } from '../engine/rng'

export function successThreshold(aim:number, shieldTier:number) {
  // Clamp to 2..6 so 1s always miss and 6s always hit.
  return Math.min(6, Math.max(2, 6 - (aim - shieldTier)));
}
export function rollSuccesses(numDice:number, threshold:number, rng?: Rng) {
  const r: Rng = rng ?? fromMathRandom()
  let hits = 0;
  for (let i = 0; i < numDice; i++) {
    const rv = 1 + Math.floor(r.next() * 6);
    if (rv >= threshold) hits++;
  }
  return hits;
}

export function buildInitiative(pFleet:Ship[], eFleet:Ship[], rng?: Rng): InitiativeEntry[] {
  const r: Rng = rng ?? fromMathRandom()
  const q:InitiativeEntry[] = []
  const regen = (s:Ship)=>{ if(s.alive && s.stats.regen>0 && s.hull>0){ s.hull = Math.min(s.stats.hullCap, s.hull + s.stats.regen) } }
  pFleet.forEach((s, i) => { regen(s); if (s.alive && s.stats.valid) q.push({ side: 'P', idx: i, init: s.stats.init, size: sizeRank(s.frame) }) })
  eFleet.forEach((s, i) => { regen(s); if (s.alive && s.stats.valid) q.push({ side: 'E', idx: i, init: s.stats.init, size: sizeRank(s.frame) }) })
  q.sort((a, b) => (b.init - a.init) || (b.size - a.size) || (r.next() - 0.5))
  return q as InitiativeEntry[]
}

export function targetIndex(defFleet:Ship[], strategy:'kill'|'guns'){
  const alive = defFleet.map((s,i)=>({s,i})).filter(x=>x.s && x.s.alive)
  const magnets = alive.filter(x=> (x.s.stats as { magnet?: boolean }).magnet)
  const pool = magnets.length>0 ? magnets : alive
  if(pool.length===0) return -1
  if(strategy==='kill'){
    return pool.reduce((b,c)=> c.s.hull < b.s.hull ? c : b).i
  }
  if(strategy==='guns'){
    return pool.reduce((b,c)=> c.s.weapons.length > b.s.weapons.length ? c : b).i
  }
  return pool[0].i
}

export function volley(attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], friends:Ship[], rng?: Rng){
  const r: Rng = rng ?? fromMathRandom()
  const fleets = {
    allies: friends,
    enemies: side==='P'
      ? ((friends as unknown as { _enemies?: Ship[] })._enemies ?? [])
      : ((friends as unknown as { _allies?: Ship[] })._allies ?? [])
  }
  const g = globalThis as unknown as { battleCtx?: BattleCtx }
  const shield = g.battleCtx ? effectiveShieldTier(defender, side === 'P' ? 'E' : 'P', g.battleCtx) : defender.stats.shieldTier
  const thr = successThreshold(attacker.stats.aim, shield)
  attacker.weapons.forEach((wRaw) => {
    const w = wRaw as EffectfulPart & { _dynDice?: number }
    if(w.riftDice) return
    const diceToRoll = w._dynDice ?? w.dice ?? 0
    for(let i=0;i<diceToRoll;i++){
      const faces = w.faces||[]
      const face = faces[Math.floor(r.next()*faces.length)] || {}
      const rollWeapon = (damage:number, faceRoll:number|undefined, isAuto:boolean, isChain=false) => {
        const painter = g.battleCtx?.status.painter
        const bonus = painter && painter.rounds>0 && painter.target===defender ? painter.bonus : 0
        const total = damage + bonus
        defender.hull -= total
        const msg = isAuto ? `auto ${total}` : (total>0 ? `roll ${faceRoll} ≥ ${thr} → ${total}` : `roll ${faceRoll} ≥ ${thr}`)
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: ${msg}`)
        if(defender.hull<=0){ defender.alive=false; defender.hull=0; logArr.push(`💥 ${defender.frame.name} destroyed!`) }
        if(w.initLoss){ defender.stats.init = Math.max(0, defender.stats.init - w.initLoss); logArr.push(`⌛ ${defender.frame.name} -${w.initLoss} INIT`); }
        if (g.battleCtx) triggerHook([w], 'onHit', attacker, defender, fleets, g.battleCtx, side)
        if(!isChain){
          const chainHooks = (w.effects ?? []).filter(
            (e): e is { hook: 'onHit'; effect: { kind: 'chainOnHit'; decay: number; minDmg: number } } =>
              e.hook==='onHit' && e.effect.kind==='chainOnHit'
          )
          const ch = chainHooks[0]
          if(ch){
            let extra = (w.dmgPerHit || 0) - ch.effect.decay
            while(extra >= ch.effect.minDmg && defender.alive){
              const chainRoll = 1 + Math.floor(r.next()*6)
              if(chainRoll >= thr){
                rollWeapon(extra, chainRoll, false, true)
                extra -= ch.effect.decay
              } else {
                logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (chain roll ${chainRoll} < ${thr})`)
                if (g.battleCtx) triggerHook([w], 'onMiss', attacker, defender, fleets, g.battleCtx, side)
                break
              }
            }
          }
        }
      }
      if(typeof face.dmg === 'number'){
        rollWeapon(face.dmg, undefined, true)
      } else if(typeof face.roll === 'number' && face.roll >= thr){
        rollWeapon(w.dmgPerHit||0, face.roll, false)
      } else {
        const rolled = typeof face.roll === 'number' ? face.roll : 'miss'
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (roll ${rolled} < ${thr})`)
        if (g.battleCtx) triggerHook([w], 'onMiss', attacker, defender, fleets, g.battleCtx, side)
        const missHooks = (w.effects ?? []).filter(
          (e): e is { hook: 'onMiss'; effect: { kind: 'rerollOnMiss'; chancePct: number } } =>
            e.hook==='onMiss' && e.effect.kind==='rerollOnMiss'
        )
        for(const mh of missHooks){
          if(r.next()*100 < mh.effect.chancePct){
            const rerFace = faces[Math.floor(r.next()*faces.length)] || {}
            if(typeof rerFace.dmg === 'number') rollWeapon(rerFace.dmg, undefined, true)
            else if(typeof rerFace.roll === 'number' && rerFace.roll >= thr) rollWeapon(w.dmgPerHit||0, rerFace.roll, false)
          }
        }
      }
      if(face.self){
        assignRiftSelfDamage(friends, side, logArr)
        if (g.battleCtx) triggerHook([w], 'onSelfHit', attacker, defender, fleets, g.battleCtx, side)
      }
    }
  })
  if(attacker.riftDice>0){
    for(let i=0;i<attacker.riftDice;i++){
      const roll = Math.floor(r.next()*6)
      const face = RIFT_FACES[roll]
      if(face.dmg){
        defender.hull -= face.dmg
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} Rift die hits for ${face.dmg}`)
        if(defender.hull<=0){ defender.alive=false; defender.hull=0; logArr.push(`💥 ${defender.frame.name} destroyed!`) }
      } else {
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} Rift die misses`)
      }
      if(face.self){
        assignRiftSelfDamage(friends, side, logArr)
      }
    }
  }
}

function assignRiftSelfDamage(friends:Ship[], side:'P'|'E', logArr:string[]){
  const riftShips = friends.filter(s=>s.alive && s.riftDice>0)
  if(riftShips.length===0) return
  const sorted = [...riftShips].sort((a,b)=> (sizeRank(b.frame)-sizeRank(a.frame)) || (b.hull - a.hull))
  const target = sorted.find(s=>s.hull<=1) || sorted[0]
  target.hull -= 1
  logArr.push(`${side==='P'?'🟦':'🟥'} ${target.frame.name} suffers 1 Rift backlash`)
  if(target.hull<=0){ target.alive=false; target.hull=0; logArr.push(`💥 ${target.frame.name} destroyed by Rift backlash!`) }
}
