import { FRAMES, type Frame } from '../config/frames';
import { PARTS, ALL_PARTS, type Part } from '../config/parts';
import { getBossFleetFor } from '../config/factions';
import { getSectorSpec } from '../config/pacing';
import type { Ship, BossVariant } from '../config/types';
import { makeShip } from './ship';
import { getOpponentFaction } from './setup';

const BOSS_VARIANTS: Record<number, BossVariant[]> = {
  5: [
    { label: 'High Aim', focus: 'aim' },
    { label: 'High Shields', focus: 'shields' },
    { label: 'Alpha Strike', focus: 'burst' },
  ],
  10: [
    { label: 'T3 High Aim', focus: 'aim' },
    { label: 'T3 Fortress', focus: 'shields' },
    { label: 'T3 Burst', focus: 'burst' },
  ],
};

const FORCED_BOSS_VARIANT: Record<number, number|null> = { 5: null, 10: null };

export function getBossVariants(sector:number): BossVariant[]{
  return BOSS_VARIANTS[sector]?.slice() || [];
}

export function setForcedBossVariant(sector:number, idx:number|null){
  if(sector in FORCED_BOSS_VARIANT){
    FORCED_BOSS_VARIANT[sector] = idx;
  }
}

export function getBossVariantFocus(sector:number): BossVariant['focus'] | undefined {
  const list = BOSS_VARIANTS[sector];
  if(!list || list.length===0) return undefined;
  const forced = FORCED_BOSS_VARIANT[sector];
  if(typeof forced === 'number' && list[forced]) return list[forced].focus;
  // Not forced: leave undefined so generator uses generic boss build
  return undefined;
}

export function randomEnemyPartsFor(frame:Frame, scienceCap:number, boss:boolean, variantFocus?: 'aim'|'shields'|'burst'){
  // Defensive: ensure a valid frame object
  if(!frame){
    console.warn('randomEnemyPartsFor called without frame; defaulting to interceptor');
    frame = FRAMES.interceptor;
  }

  // Pick best-in-cap parts with simple heuristics per focus
  const srcPool = PARTS.sources.filter(p=> p.tier <= scienceCap);
  const drvPool = PARTS.drives.filter(p=> p.tier <= scienceCap);
  const wepPool = PARTS.weapons.filter(p=> p.tier <= scienceCap);
  const cmpPool = PARTS.computers.filter(p=> p.tier <= scienceCap);
  const shdPool = PARTS.shields.filter(p=> p.tier <= scienceCap);
  const hulPool = PARTS.hull.filter(p=> p.tier <= scienceCap);

  const pickMax = <K extends keyof Part>(pool:Part[], key:K)=> pool.reduce((best, p)=> ((p[key]||0) > (best[key]||0) ? p : best), pool[0]);
  const pickMin = <K extends keyof Part>(pool:Part[], key:K)=> pool.reduce((best, p)=> ((p[key]||0) < (best[key]||0) ? p : best), pool[0]);

  const src = pickMax(srcPool as unknown as Part[], 'powerProd' as keyof Part);
  const drv = variantFocus==='aim' ? pickMin(drvPool as unknown as Part[], 'powerCost' as keyof Part) : pickMax(drvPool as unknown as Part[], 'init' as keyof Part);
  const weapon = pickMax(wepPool as unknown as Part[], 'dmgPerHit' as keyof Part);
  const comp = pickMax(cmpPool as unknown as Part[], 'aim' as keyof Part);
  const shld = pickMax(shdPool as unknown as Part[], 'shieldTier' as keyof Part);
  const hull = pickMax(hulPool as unknown as Part[], 'extraHull' as keyof Part);

  // Start build varies by focus
  let build:Part[];
  if(variantFocus==='aim') build = [src, drv, comp, weapon];
  else if(variantFocus==='shields') build = [src, drv, shld, weapon];
  else if(variantFocus==='burst') build = [src, drv, weapon, weapon];
  else build = [src, drv, hull, weapon];
  let ship = makeShip(frame, build);

  // Boss perks: ensure targeted strengths first
  if(boss){
    const order: Part[] = variantFocus==='aim' ? [comp, shld, weapon]
                    : variantFocus==='shields' ? [shld, weapon, comp]
                    : [weapon, comp, shld];
    for(const p of order){
      const test = makeShip(frame, [...build, p]);
      if(test.stats.valid){ build = test.parts; ship = test; }
    }
  }

  // Greedy fill respecting tiles and power; bias by variant focus
  let pool = [hull, comp, shld, weapon];
  if(variantFocus==='aim') pool = [comp, hull, shld, weapon];
  if(variantFocus==='shields') pool = [shld, hull, comp, weapon];
  if(variantFocus==='burst') pool = [weapon, weapon, comp, hull];
  for(let i=0;i<12 && build.length<frame.tiles;i++){
    const p = pool[i % pool.length];
    const test = makeShip(frame, [...build, p]);
    if(test.stats.valid && test.stats.powerUse <= test.stats.powerProd){ build = test.parts; ship = test; }
    else break;
  }
  return ship.parts;
}

export function generateEnemyFleetFor(sector:number): Ship[]{
  const spec = getSectorSpec(sector);
  const boss = spec.boss;
  const bossFocus = boss ? getBossVariantFocus(sector) : undefined;
  const focuses: (undefined|'aim'|'shields'|'burst')[] = ['aim','shields','burst', undefined];
  const options = [FRAMES.dread, FRAMES.cruiser, FRAMES.interceptor];
  let remaining = Math.max(1, spec.enemyTonnage);
  const ships:Ship[] = [] as unknown as Ship[];
  let bossAssigned = false;
  const minTonnage = Math.min(...options.map(f=>f.tonnage));

  if(boss){
    const opp = getOpponentFaction();
    const bossSpec = getBossFleetFor(opp, sector);
    if(bossSpec){
      return bossSpec.ships.map(s => {
        const frame = FRAMES[s.frame];
        const parts = s.parts.map(pid => ALL_PARTS.find(p=>p.id===pid)).filter((p): p is Part => !!p);
        return makeShip(frame, parts);
      }) as unknown as Ship[];
    }
  }
  while(remaining >= minTonnage){
    const viable = options.filter(f => f.tonnage <= remaining);
    if(viable.length === 0) break;
    const pick = viable[Math.floor(Math.random()*viable.length)];
    const focus = boss ? bossFocus : focuses[Math.floor(Math.random()*focuses.length)];
    const parts = randomEnemyPartsFor(pick, spec.enemyScienceCap, boss && !bossAssigned, focus);
    ships.push(makeShip(pick, parts) as unknown as Ship);
    if(boss && !bossAssigned && pick.id!=='interceptor') bossAssigned = true;
    remaining -= pick.tonnage;
  }
  return ships;
}
