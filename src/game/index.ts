// Core game data and helpers extracted from App

// ------------------------------- Data Models -------------------------------
import { FRAMES, type Frame, type FrameId } from '../config/frames'
import { PARTS, ALL_PARTS, type Part } from '../config/parts'
export { FRAMES, type FrameId } from '../config/frames'
export { PARTS, ALL_PARTS, type Part } from '../config/parts'
export { getSectorSpec, SECTORS } from '../config/pacing'
export { nextTierCost } from '../config/economy'

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
  return { frame, parts, weapons, computer, shield, hullParts, drive, sources,
    stats:{ hullCap, aim: computer?.aim||0, shieldTier: shield?.shieldTier||0, init: drive?.init||0, powerProd, powerUse, valid },
    hull: hullCap, alive: true };
}

export function tierCap(research:{Military:number, Grid:number, Nano:number}){ const avg = ((research.Military||1) + (research.Grid||1) + (research.Nano||1))/3; return Math.max(1, Math.min(3, Math.floor(avg))); }

export function rollInventory(research:{Military:number, Grid:number, Nano:number}, count=8){
  const pool = ALL_PARTS.filter((p:Part) => p.tier <= tierCap(research));
  const pick = (f:(p:Part)=>boolean)=>{ const cand = pool.filter(f); return cand.length? cand[Math.floor(Math.random()*cand.length)] : null; };
  const items:Part[] = [];
  // Prioritize Hull → Drive → Source → Weapon → (Shield|Computer)
  const guarantees = [ ()=>pick(isHull), ()=>pick(isDrive), ()=>pick(isSource), ()=>pick(isWeapon), ()=>pick((p:Part)=>isShield(p)||isComputer(p)) ];
  for(const g of guarantees){ const it = g(); if(it) items.push(it); }
  while(items.length < count){ items.push(pool[Math.floor(Math.random()*pool.length)]); }
  return items.slice(0,count);
}

// Research pacing cost helper
// nextTierCost now provided by config/economy

// ------------------------------- Enemy Scaling -----------------------------
// sectorScaling now provided by config/pacing

export function randomEnemyPartsFor(frame:Frame, scienceCap:number, boss:boolean){
  // Defensive: ensure a valid frame object
  if(!frame){
    console.warn('randomEnemyPartsFor called without frame; defaulting to interceptor');
    frame = FRAMES.interceptor;
  }
  
  const src = scienceCap>=2 ? PARTS.sources[1] : PARTS.sources[0];
  const drv = scienceCap>=2 ? PARTS.drives[1] : PARTS.drives[0];
  const weapon = scienceCap>=2 ? PARTS.weapons[1] : PARTS.weapons[0];
  const comp = scienceCap>=2 ? PARTS.computers[1] : PARTS.computers[0];
  const shld = scienceCap>=2 ? PARTS.shields[1] : PARTS.shields[0];
  const hull = scienceCap>=2 ? PARTS.hull[1] : PARTS.hull[0];

  // Start with hull-first survivability
  let build:Part[] = [src, drv, hull, weapon];
  let ship = makeShip(frame, build);

  // Boss perks: ensure second weapon and better defense
  if(boss){
    const testW = makeShip(frame, [...build, weapon]); if(testW.stats.valid) { build = testW.parts; ship = testW; }
    const testC = makeShip(frame, [...build, comp]);   if(testC.stats.valid) { build = testC.parts; ship = testC; }
    const testS = makeShip(frame, [...build, shld]);   if(testS.stats.valid) { build = testS.parts; ship = testS; }
  }

  // Greedy fill respecting tiles and power; cycle defense → weapon
  const pool = [hull, comp, shld, weapon];
  for(let i=0;i<12 && build.length<frame.tiles;i++){
    const p = pool[i % pool.length];
    const test = makeShip(frame, [...build, p]);
    if(test.stats.valid && test.stats.powerUse <= test.stats.powerProd){ build = test.parts; ship = test; }
    else break;
  }
  return ship.parts;
}


