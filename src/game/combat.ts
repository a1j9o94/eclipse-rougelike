import { type Part } from '../config/parts'
import { type Ship, type InitiativeEntry } from '../config/types'
import { FRAMES, makeShip, randomEnemyPartsFor, sizeRank } from './index'
import { getSectorSpec } from './index'

export function buildInitiative(pFleet:Ship[], eFleet:Ship[]): InitiativeEntry[] {
  const q:InitiativeEntry[] = [];
  pFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'P', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); });
  eFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'E', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); });
  q.sort((a, b) => (b.init - a.init) || (b.size - a.size) || (Math.random() - 0.5));
  return q as InitiativeEntry[];
}

export function targetIndex(defFleet:Ship[], strategy:'kill'|'guns'){
  if(strategy==='kill'){
    let best=-1, bestHull=1e9; for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ if(s.hull < bestHull){ bestHull=s.hull; best=i; } } } if(best!==-1) return best;
  }
  if(strategy==='guns'){
    let best=-1, guns=-1; for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ const g=s.weapons.length; if(g>guns){ guns=g; best=i; } } } if(best!==-1) return best;
  }
  return defFleet.findIndex(s=>s.alive && s.stats.valid);
}

export function volley(attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], successThreshold:(aim:number, shieldTier:number)=>number, rollSuccesses:(numDice:number, threshold:number)=>number){
  const thr = successThreshold(attacker.stats.aim, defender.stats.shieldTier);
  attacker.weapons.forEach((w:Part) => {
    const succ = rollSuccesses(w.dice||0, thr);
    const dmg = succ * (w.dmgPerHit||0);
    if (succ > 0) {
      defender.hull -= dmg;
      logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: ${succ} hit(s) → ${dmg} hull (thr ≥ ${thr})`);
      if (defender.hull <= 0) { defender.alive = false; defender.hull = 0; logArr.push(`💥 ${defender.frame.name} destroyed!`); }
    } else {
      logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (thr ≥ ${thr})`);
    }
  });
}

export function genEnemyFleet(sector:number){
  const spec = getSectorSpec(sector);
  const boss = spec.boss;
  const options = [FRAMES.dread, FRAMES.cruiser, FRAMES.interceptor];
  let remaining = Math.max(1, spec.enemyTonnage);
  const ships:Ship[] = [] as unknown as Ship[];
  let bossAssigned = false;
  const minTonnage = Math.min(...options.map(f=>f.tonnage));
  while(remaining >= minTonnage){
    const viable = options.filter(f => f.tonnage <= remaining);
    if(viable.length === 0) break;
    const pick = viable[Math.floor(Math.random()*viable.length)];
    const parts = randomEnemyPartsFor(pick, spec.enemyScienceCap, boss && !bossAssigned);
    ships.push(makeShip(pick, parts));
    if(boss && !bossAssigned && pick.id!=='interceptor') bossAssigned = true;
    remaining -= pick.tonnage;
  }
  return ships;
}


