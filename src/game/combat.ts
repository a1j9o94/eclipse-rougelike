import { type Part, RIFT_FACES } from '../config/parts'
import { type Ship, type InitiativeEntry } from '../config/types'
import { FRAMES, makeShip, randomEnemyPartsFor, sizeRank, getBossVariantFocus, getOpponentFaction, getBossFleetFor, PARTS, successThreshold } from './index'
import { getSectorSpec } from './index'

export function buildInitiative(pFleet:Ship[], eFleet:Ship[]): InitiativeEntry[] {
  const q:InitiativeEntry[] = []
  pFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'P', idx: i, init: s.stats.init, size: sizeRank(s.frame) }) })
  eFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'E', idx: i, init: s.stats.init, size: sizeRank(s.frame) }) })
  q.sort((a, b) => (b.init - a.init) || (b.size - a.size) || (Math.random() - 0.5))
  return q as InitiativeEntry[]
}

export function targetIndex(defFleet:Ship[], strategy:'kill'|'guns'){
  if(strategy==='kill'){
    let best=-1, bestHull=1e9
    for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ if(s.hull < bestHull){ bestHull=s.hull; best=i } } }
    if(best!==-1) return best
  }
  if(strategy==='guns'){
    let best=-1, guns=-1
    for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ const g=s.weapons.length; if(g>guns){ guns=g; best=i } } }
    if(best!==-1) return best
  }
  return defFleet.findIndex(s=>s.alive && s.stats.valid)
}

export function volley(attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], friends:Ship[]){
  const thr = successThreshold(attacker.stats.aim, defender.stats.shieldTier)
  attacker.weapons.forEach((w:Part) => {
    if(w.riftDice) return
    for(let i=0;i<(w.dice||0);i++){
      const faces = w.faces||[]
      const face = faces[Math.floor(Math.random()*faces.length)] || {}
      if(face.dmg){
        const dmg = face.dmg
        defender.hull -= dmg
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: auto ${dmg}`)
        if(defender.hull<=0){ defender.alive=false; defender.hull=0; logArr.push(`💥 ${defender.frame.name} destroyed!`) }
      } else if(typeof face.roll === 'number' && face.roll >= thr){
        const dmg = w.dmgPerHit||0
        defender.hull -= dmg
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: roll ${face.roll} ≥ ${thr} → ${dmg}`)
        if(defender.hull<=0){ defender.alive=false; defender.hull=0; logArr.push(`💥 ${defender.frame.name} destroyed!`) }
      } else {
        const rolled = typeof face.roll === 'number' ? face.roll : 'miss'
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (roll ${rolled} < ${thr})`)
      }
      if(face.self){ assignRiftSelfDamage(friends, side, logArr) }
    }
  })
  if(attacker.riftDice>0){
    for(let i=0;i<attacker.riftDice;i++){
      const roll = Math.floor(Math.random()*6)
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

export function genEnemyFleet(sector:number){
  const spec = getSectorSpec(sector)
  const boss = spec.boss
  const focus = boss ? getBossVariantFocus(sector) : undefined
  const options = [FRAMES.dread, FRAMES.cruiser, FRAMES.interceptor]
  let remaining = Math.max(1, spec.enemyTonnage)
  const ships:Ship[] = [] as unknown as Ship[]
  let bossAssigned = false
  const minTonnage = Math.min(...options.map(f=>f.tonnage))

  if(boss){
    const opp = getOpponentFaction()
    const bossSpec = getBossFleetFor(opp, sector)
    if(bossSpec){
      return bossSpec.ships.map(s => {
        const frame = FRAMES[s.frame]
        const allParts: Part[] = ([] as Part[]).concat(PARTS.sources, PARTS.drives, PARTS.weapons, PARTS.computers, PARTS.shields, PARTS.hull)
        const parts = s.parts.map(pid => allParts.find((p)=> p.id===pid)).filter((p): p is Part => !!p)
        return makeShip(frame, parts)
      }) as unknown as Ship[]
    }
  }
  while(remaining >= minTonnage){
    const viable = options.filter(f => f.tonnage <= remaining)
    if(viable.length === 0) break
    const pick = viable[Math.floor(Math.random()*viable.length)]
    const parts = randomEnemyPartsFor(pick, spec.enemyScienceCap, boss && !bossAssigned, focus)
    ships.push(makeShip(pick, parts))
    if(boss && !bossAssigned && pick.id!=='interceptor') bossAssigned = true
    remaining -= pick.tonnage
  }
  return ships
}

