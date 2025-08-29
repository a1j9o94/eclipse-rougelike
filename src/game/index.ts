// Core game data and helpers extracted from App

// ------------------------------- Data Models -------------------------------
import { FRAMES, type Frame, type FrameId } from '../config/frames'
import { PARTS, ALL_PARTS, type Part } from '../config/parts'
import { ECONOMY } from '../config/economy'
export { FRAMES, type FrameId } from '../config/frames'
export { PARTS, ALL_PARTS, type Part } from '../config/parts'
export { getSectorSpec, SECTORS } from '../config/pacing'
export { nextTierCost } from '../config/economy'
import type { BossVariant } from '../config/types'
import type { FactionId } from '../config/factions'
export { getBossFleetFor } from '../config/factions'

export const isSource = (p:Part)=>"powerProd" in p;
export const isDrive = (p:Part)=>"init" in p;
export const isWeapon = (p:Part)=>"dice" in p;
export const isComputer = (p:Part)=>"aim" in p;
export const isShield = (p:Part)=>"shieldTier" in p;
export const isHull = (p:Part)=>"extraHull" in p;

// Safe frame lookup to avoid undefined access
export function getFrame(id: FrameId){
  const f = (FRAMES)[id];
  if(!f){
    console.warn("Unknown frame id", id);
    return FRAMES.interceptor; // fallback prevents undefined baseHull access
  }
  return f;
}

// ------------------------------- Core Helpers ------------------------------
export function successThreshold(aim:number, shieldTier:number) {
  // Clamp to 2..6 so 1s always miss and 6s always hit.
  return Math.min(6, Math.max(2, 6 - (aim - shieldTier)));
}
export function rollSuccesses(numDice:number, threshold:number) {
  let hits = 0;
  for (let i = 0; i < numDice; i++) {
    const r = 1 + Math.floor(Math.random() * 6);
    if (r >= threshold) hits++;
  }
  return hits;
}
export function sizeRank(frame:{id:string}) { return frame.id === 'dread' ? 3 : frame.id === 'cruiser' ? 2 : 1; }

export function makeShip(frame:Frame, parts:Part[]){
  // Defensive guard: ensure a valid frame object
  if(!frame || typeof frame.baseHull !== 'number'){
    console.warn('makeShip called with invalid frame', frame);
    frame = FRAMES.interceptor;
  }
  const weapons = parts.filter(isWeapon);
  const computer = parts.find(isComputer);
  const shield = parts.find(isShield);
  const hullParts = parts.filter(isHull);
  const drive = parts.find(isDrive);
  const sources = parts.filter(isSource);
  const hullCap = frame.baseHull + hullParts.reduce((a:number,h:Part)=>a+(h.extraHull||0),0);
  const powerProd = sources.reduce((a:number,s:Part)=>a+(s.powerProd||0),0);
  const powerUse = parts.reduce((a:number,p:Part)=>a+(p.powerCost||0),0);
  const valid = !!drive && sources.length>0 && powerUse<=powerProd && parts.length<=frame.tiles;
  // Aggregate stats from all relevant parts so hybrid items contribute (e.g., Sentient Hull adds aim and hull)
  const totalAim = parts.reduce((sum:number, p:Part)=> sum + (p.aim||0), 0);
  const totalShieldTier = parts.reduce((sum:number, p:Part)=> sum + (p.shieldTier||0), 0);
  const totalInit = parts.reduce((sum:number, p:Part)=> sum + (p.init||0), 0);
  return { frame, parts, weapons, computer, shield, hullParts, drive, sources,
    stats:{ hullCap, aim: totalAim, shieldTier: totalShieldTier, init: totalInit, powerProd, powerUse, valid },
    hull: hullCap, alive: true };
}

export function tierCap(research:{Military:number, Grid:number, Nano:number}){ const avg = ((research.Military||1) + (research.Grid||1) + (research.Nano||1))/3; return Math.max(1, Math.min(3, Math.floor(avg))); }

export function rollInventory(research:{Military:number, Grid:number, Nano:number}, count: number = ECONOMY.shop.itemsBase){
  // Exclude lower-tier items for any track already upgraded beyond them
  const minTierByCat:Record<'Military'|'Grid'|'Nano', number> = {
    Military: research.Military||1,
    Grid: research.Grid||1,
    Nano: research.Nano||1,
  };
  
  // Filter parts pool to only include parts within research tier limits
  const pool = ALL_PARTS.filter((p:Part) => 
    p.tier <= tierCap(research) && 
    p.tier >= minTierByCat[p.tech_category as 'Military'|'Grid'|'Nano']
  );

  const items:Part[] = [];
  
  // Randomly select parts until we hit the count
  while(items.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    const part = pool[idx];
    // Allow duplicates to avoid infinite loops when pool < count
    items.push(part);
  }

  return items;
}

// Research pacing cost helper
// nextTierCost now provided by config/economy

// ------------------------------- Enemy Scaling -----------------------------
// sectorScaling now provided by config/pacing

// ------------------------------- Boss Variants -----------------------------
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

  // Start with hull-first survivability
  let build:Part[] = [src, drv, hull, weapon];
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

// ------------------------------- Opponent Faction ---------------------------
let OPPONENT: FactionId | null = null;
let PLAYER: FactionId | null = null;

export function setPlayerFaction(fid:FactionId){ PLAYER = fid; pickOpponentFaction(); }
export function pickOpponentFaction(){
  const all: FactionId[] = ['scientists','warmongers','industrialists','raiders'];
  const pool = all.filter(id => id !== PLAYER);
  OPPONENT = pool[Math.floor(Math.random()*pool.length)];
  return OPPONENT;
}
export function getOpponentFaction(){ return OPPONENT; }

// Predefined Boss Fleets moved to config/factions.ts


