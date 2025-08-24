// Core game data and helpers extracted from App

// ------------------------------- Data Models -------------------------------
export const FRAMES = {
  interceptor: { id: "interceptor", name: "Interceptor", tiles: 6, baseHull: 1, rank: 1, tonnage: 1 },
  cruiser: { id: "cruiser", name: "Cruiser", tiles: 8, baseHull: 1, rank: 2, tonnage: 2 },
  dread: { id: "dread", name: "Dreadnought", tiles: 10, baseHull: 1, rank: 3, tonnage: 3 },
} as const;

export type FrameId = keyof typeof FRAMES; // 'interceptor' | 'cruiser' | 'dread'

export const PARTS = {
  sources: [
    { id: "fusion_source", name: "Fusion Source", powerProd: 3, tier: 1, cost: 18, cat: "Source" },
    { id: "tachyon_source", name: "Tachyon Source", powerProd: 5, tier: 2, cost: 60, cat: "Source" },
  ],
  drives: [
    { id: "fusion_drive", name: "Fusion Drive", init: 1, powerCost: 1, tier: 1, cost: 18, cat: "Drive" },
    { id: "tachyon_drive", name: "Tachyon Drive", init: 2, powerCost: 2, tier: 2, cost: 55, cat: "Drive" },
  ],
  weapons: [
    { id: "plasma", name: "Plasma Cannon", dice: 2, dmgPerHit: 1, powerCost: 1, tier: 1, cost: 25, cat: "Weapon" },
    { id: "antimatter", name: "Antimatter Cannon", dice: 4, dmgPerHit: 2, powerCost: 2, tier: 2, cost: 75, cat: "Weapon" },
  ],
  computers: [
    { id: "positron", name: "Positron Computer", aim: 1, powerCost: 1, tier: 1, cost: 25, cat: "Computer" },
    { id: "gluon", name: "Gluon Computer", aim: 2, powerCost: 2, tier: 2, cost: 60, cat: "Computer" },
  ],
  shields: [
    { id: "gauss", name: "Gauss Shield", shieldTier: 1, powerCost: 1, tier: 1, cost: 20, cat: "Shield" },
    { id: "phase", name: "Phase Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 60, cat: "Shield" },
  ],
  hull: [
    { id: "improved", name: "Improved Hull", extraHull: 1, powerCost: 0, tier: 1, cost: 22, cat: "Hull" },
    { id: "reinforced", name: "Reinforced Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 70, cat: "Hull" },
  ],
} as const;

export const ALL_PARTS = [
  ...PARTS.sources,
  ...PARTS.drives,
  ...PARTS.weapons,
  ...PARTS.computers,
  ...PARTS.shields,
  ...PARTS.hull,
];

export const isSource = (p:any)=>"powerProd" in p;
export const isDrive = (p:any)=>"init" in p;
export const isWeapon = (p:any)=>"dice" in p;
export const isComputer = (p:any)=>"aim" in p;
export const isShield = (p:any)=>"shieldTier" in p;
export const isHull = (p:any)=>"extraHull" in p;

// Safe frame lookup to avoid undefined access
export function getFrame(id: FrameId){
  const f = (FRAMES as any)[id];
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

export function makeShip(frame:any, parts:any[]){
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
  const hullCap = frame.baseHull + hullParts.reduce((a:number,h:any)=>a+(h.extraHull||0),0);
  const powerProd = sources.reduce((a:number,s:any)=>a+(s.powerProd||0),0);
  const powerUse = parts.reduce((a:number,p:any)=>a+(p.powerCost||0),0);
  const valid = !!drive && sources.length>0 && powerUse<=powerProd && parts.length<=frame.tiles;
  return { frame, parts, weapons, computer, shield, hullParts, drive, sources,
    stats:{ hullCap, aim: computer?.aim||0, shieldTier: shield?.shieldTier||0, init: drive?.init||0, powerProd, powerUse, valid },
    hull: hullCap, alive: true };
}

export function tierCap(research:{Military:number, Grid:number, Nano:number}){ const avg = ((research.Military||1) + (research.Grid||1) + (research.Nano||1))/3; return Math.max(1, Math.min(3, Math.round(avg))); }

export function rollInventory(research:{Military:number, Grid:number, Nano:number}, count=8){
  const pool = ALL_PARTS.filter((p:any) => p.tier <= tierCap(research));
  const pick = (f:(p:any)=>boolean)=>{ const cand = pool.filter(f); return cand.length? cand[Math.floor(Math.random()*cand.length)] : null; };
  const items:any[] = [];
  // Prioritize Hull → Drive → Source → Weapon → (Shield|Computer)
  const guarantees = [ ()=>pick(isHull), ()=>pick(isDrive), ()=>pick(isSource), ()=>pick(isWeapon), ()=>pick((p:any)=>isShield(p)||isComputer(p)) ];
  for(const g of guarantees){ const it = g(); if(it) items.push(it); }
  while(items.length < count){ items.push(pool[Math.floor(Math.random()*pool.length)]); }
  return items.slice(0,count);
}

// Research pacing cost helper
export function nextTierCost(curr:number){
  if(curr===1) return { c:40, s:1 } as const;
  if(curr===2) return { c:120, s:2 } as const;
  return null;
}

// ------------------------------- Enemy Scaling -----------------------------
export function sectorScaling(sector:number){
  // tonBonus is extra effective tonnage vs player used; tierBonus adds to player's avg research cap
  if(sector<=1) return { tonBonus: 0, tierBonus: 0, boss:false } as const;
  if(sector===2) return { tonBonus: 0.5, tierBonus: 0, boss:false } as const;
  if(sector===3) return { tonBonus: 1, tierBonus: 0, boss:false } as const;
  if(sector===4) return { tonBonus: 1, tierBonus: 0, boss:false } as const;
  if(sector===5) return { tonBonus: 1.5, tierBonus: 0, boss:true } as const;
  if(sector===6) return { tonBonus: 1, tierBonus: 1, boss:false } as const;
  if(sector===7) return { tonBonus: 1, tierBonus: 1, boss:false } as const;
  if(sector===8) return { tonBonus: 1.5, tierBonus: 2, boss:false } as const;
  if(sector===9) return { tonBonus: 2, tierBonus: 2, boss:false } as const;
  return { tonBonus: 2, tierBonus: 2, boss:true } as const; // sector 10
}

export function randomEnemyPartsFor(frame:any, playerResearch:{Military:number, Grid:number, Nano:number}, tierBonus:number, boss:boolean){
  // Defensive: ensure a valid frame object
  if(!frame){
    console.warn('randomEnemyPartsFor called without frame; defaulting to interceptor');
    frame = FRAMES.interceptor;
  }
  const baseCap = tierCap(playerResearch);
  const cap = Math.min(3, baseCap + (tierBonus||0));
  const src = cap>=2 ? PARTS.sources[1] : PARTS.sources[0];
  const drv = cap>=2 ? PARTS.drives[1] : PARTS.drives[0];
  const weapon = cap>=2 ? PARTS.weapons[1] : PARTS.weapons[0];
  const comp = cap>=2 ? PARTS.computers[1] : PARTS.computers[0];
  const shld = cap>=2 ? PARTS.shields[1] : PARTS.shields[0];
  const hull = cap>=2 ? PARTS.hull[1] : PARTS.hull[0];

  // Start with hull-first survivability
  let build:any[] = [src, drv, hull, weapon];
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


