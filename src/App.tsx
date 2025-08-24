import { useEffect, useMemo, useState } from "react";
import './index.css'

/**
 * Eclipse Roguelike — Integrated App (v3.24)
 * Mobile-first prototype with difficulty, tight economy, bosses.
 *
 * Fixes in v3.24
 * - Resolve "Cannot read properties of undefined (reading 'baseHull')" by:
 *   • Introducing INITIAL_* constants and lazy state initializers so no state depends on another state's runtime value during initialization.
 *   • Adding safe frame lookup via getFrame(id) to avoid undefined FRAMES[...] access if an unexpected id appears.
 *   • Keeping all ids consistent (interceptor | cruiser | dread).
 * - Added runtime self-tests for makeShip on all frames and safe lookups.
 */

// ------------------------------- Data Models -------------------------------
const FRAMES = {
  interceptor: { id: "interceptor", name: "Interceptor", tiles: 6, baseHull: 1, rank: 1, tonnage: 1 },
  cruiser: { id: "cruiser", name: "Cruiser", tiles: 8, baseHull: 1, rank: 2, tonnage: 2 },
  dread: { id: "dread", name: "Dreadnought", tiles: 10, baseHull: 1, rank: 3, tonnage: 3 },
} as const;

type FrameId = keyof typeof FRAMES; // 'interceptor' | 'cruiser' | 'dread'

const PARTS = {
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
};

const ALL_PARTS = [
  ...PARTS.sources,
  ...PARTS.drives,
  ...PARTS.weapons,
  ...PARTS.computers,
  ...PARTS.shields,
  ...PARTS.hull,
];

const isSource = (p:any)=>"powerProd" in p;
const isDrive = (p:any)=>"init" in p;
const isWeapon = (p:any)=>"dice" in p;
const isComputer = (p:any)=>"aim" in p;
const isShield = (p:any)=>"shieldTier" in p;
const isHull = (p:any)=>"extraHull" in p;

// Safe frame lookup to avoid undefined access
function getFrame(id: FrameId){
  const f = (FRAMES as any)[id];
  if(!f){
    console.warn("Unknown frame id", id);
    return FRAMES.interceptor; // fallback prevents undefined baseHull access
  }
  return f;
}

// ------------------------------- Core Helpers ------------------------------
function successThreshold(aim:number, shieldTier:number) {
  // Clamp to 2..6 so 1s always miss and 6s always hit.
  return Math.min(6, Math.max(2, 6 - (aim - shieldTier)));
}
function rollSuccesses(numDice:number, threshold:number) {
  let hits = 0;
  for (let i = 0; i < numDice; i++) {
    const r = 1 + Math.floor(Math.random() * 6);
    if (r >= threshold) hits++;
  }
  return hits;
}
function sizeRank(frame:{id:string}) { return frame.id === 'dread' ? 3 : frame.id === 'cruiser' ? 2 : 1; }

function makeShip(frame:any, parts:any[]){
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

function tierCap(research:{Military:number, Grid:number, Nano:number}){ const avg = ((research.Military||1) + (research.Grid||1) + (research.Nano||1))/3; return Math.max(1, Math.min(3, Math.round(avg))); }

function rollInventory(research:{Military:number, Grid:number, Nano:number}, count=8){
  const pool = ALL_PARTS.filter((p:any) => p.tier <= tierCap(research));
  const pick = (f:(p:any)=>boolean)=>{ const cand = pool.filter(f); return cand.length? cand[Math.floor(Math.random()*cand.length)] : null; };
  const items:any[] = [];
  // Prioritize Hull → Drive → Source → Weapon → (Shield|Computer)
  const guarantees = [ ()=>pick(isHull), ()=>pick(isDrive), ()=>pick(isSource), ()=>pick(isWeapon), ()=>pick((p:any)=>isShield(p)||isComputer(p)) ];
  for(const g of guarantees){ const it = g(); if(it) items.push(it); }
  while(items.length < count){ items.push(pool[Math.floor(Math.random()*pool.length)]); }
  return items.slice(0,count);
}

// ------------------------------- Enemy Scaling -----------------------------
function sectorScaling(sector:number){
  // tonBonus is extra effective tonnage vs player used; tierBonus adds to player's avg research cap
  if(sector<=1) return { tonBonus: 0, tierBonus: 0, boss:false };
  if(sector===2) return { tonBonus: 0.5, tierBonus: 0, boss:false };
  if(sector===3) return { tonBonus: 1, tierBonus: 0, boss:false };
  if(sector===4) return { tonBonus: 1, tierBonus: 0, boss:false };
  if(sector===5) return { tonBonus: 1.5, tierBonus: 0, boss:true };
  if(sector===6) return { tonBonus: 1, tierBonus: 1, boss:false };
  if(sector===7) return { tonBonus: 1, tierBonus: 1, boss:false };
  if(sector===8) return { tonBonus: 1.5, tierBonus: 2, boss:false };
  if(sector===9) return { tonBonus: 2, tierBonus: 2, boss:false };
  return { tonBonus: 2, tierBonus: 2, boss:true }; // sector 10
}

function randomEnemyPartsFor(frame:any, playerResearch:{Military:number, Grid:number, Nano:number}, tierBonus:number, boss:boolean){
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

// ------------------------------- UI Bits -----------------------------------
function PowerBadge({use, prod}:{use:number, prod:number}){ const ok = use<=prod; return <span className={`text-[10px] px-2 py-0.5 rounded ${ok?'bg-emerald-600/30 text-emerald-200':'bg-rose-600/30 text-rose-100'}`}>⚡ {use}/{prod}</span>; }
function HullPips({ current, max }:{current:number, max:number}){ const arr = Array.from({length: max}); return (<div className="flex gap-0.5 mt-1">{arr.map((_,i)=>(<span key={i} className={`w-2 h-2 rounded ${i<current? 'bg-emerald-400':'bg-zinc-700'}`} />))}</div>); }
function CompactShip({ ship, side, active }:{ship:any, side:'P'|'E', active:boolean}){
  const dead = !ship.alive || ship.hull<=0;
  return (
    <div className={`relative w-24 p-2 rounded-lg border ${dead? 'border-zinc-700 bg-zinc-900 opacity-60' : side==='P' ? 'border-sky-600 bg-slate-900' : 'border-pink-600 bg-zinc-900'} ${active? 'ring-2 ring-amber-400 animate-pulse':''}`}>
      <div className="text-[11px] font-semibold truncate">{ship.frame.name}</div>
      <div className="text-[10px] opacity-70">Init {ship.stats.init}</div>
      <HullPips current={Math.max(0, ship.hull)} max={ship.stats.hullCap} />
      <div className="mt-1 text-[10px] opacity-80">{ship.weapons.map((w:any)=>w.name).join(', ')||'—'}</div>
      <div className="absolute top-1 right-1"><PowerBadge use={ship.stats.powerUse} prod={ship.stats.powerProd} /></div>
      {dead && <div className="absolute inset-0 grid place-items-center text-2xl text-zinc-300">✖</div>}
    </div>
  );
}
function ItemCard({ item, canAfford, onBuy, ghostDelta }:{item:any, canAfford:boolean, onBuy:()=>void, ghostDelta:any}){
  return (
    <div className="p-3 rounded-xl border border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between">
        <div><div className="font-medium">{item.name}</div><div className="text-xs opacity-70">{item.cat} • Tier {item.tier} {"powerProd" in item? `• +⚡${item.powerProd}` : item.powerCost? `• ⚡${item.powerCost}` : ''}</div></div>
        <div className="text-sm">{item.cost}¢</div>
      </div>
      {ghostDelta && (
        <div className="mt-2 text-xs">
          <div className="opacity-70">After install on {ghostDelta.targetName}:</div>
          <div>⚡ {ghostDelta.use}/{ghostDelta.prod} {ghostDelta.valid? '✔️' : '❌'}</div>
          {ghostDelta.initDelta!==0 && <div>Init {ghostDelta.initBefore} → <b>{ghostDelta.initAfter}</b></div>}
          {ghostDelta.hullDelta!==0 && <div>Hull {ghostDelta.hullBefore} → <b>{ghostDelta.hullAfter}</b></div>}
        </div>
      )}
      <button disabled={!canAfford} onClick={onBuy} className={`mt-2 w-full px-3 py-2 rounded-lg ${canAfford? 'bg-emerald-600 hover:bg-emerald-500':'bg-zinc-700 opacity-60'}`}>Buy & Install</button>
    </div>
  );
}
function ResourceBar({ credits, materials, science, tonnage, sector, onReset }:{credits:number, materials:number, science:number, tonnage:{used:number,cap:number}, sector:number, onReset:()=>void}){
  const used = tonnage.used, cap = tonnage.cap;
  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 p-3 grid grid-cols-3 gap-2 text-sm">
      <div className="px-3 py-2 rounded-lg bg-zinc-900">💰 <b>{credits}</b> • 🧱 <b>{materials}</b> • 🔬 <b>{science}</b></div>
      <div className={`px-3 py-2 rounded-lg ${used<=cap?'bg-emerald-950/50 text-emerald-200':'bg-rose-950/50 text-rose-200'}`}>⚓ <b>{used}</b> / <b>{cap}</b></div>
      <div className="px-3 py-2 rounded-lg bg-zinc-900 flex items-center justify-between">🗺️ Sector <b>{sector}</b> <button onClick={onReset} className="ml-2 px-2 py-1 rounded bg-zinc-800 text-xs">Reset</button></div>
    </div>
  );
}

// ------------------------------- Initial Config ----------------------------
const INITIAL_BLUEPRINTS: Record<FrameId, any[]> = {
  interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.computers[0]],
  cruiser:     [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[0], PARTS.shields[0]],
  dread:       [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[0], PARTS.weapons[0], PARTS.shields[0]],
};
const INITIAL_RESEARCH = { Military: 1, Grid: 1, Nano: 1 };
const INITIAL_RESOURCES = { credits: 10, materials: 5, science: 0 };

// ------------------------------- Integrated App ----------------------------
export default function EclipseIntegrated(){
  const [mode, setMode] = useState<'OUTPOST'|'COMBAT'>('OUTPOST');
  const [showRules, setShowRules] = useState(false);
  const [difficulty, setDifficulty] = useState<null|'easy'|'medium'|'hard'>(null);
  const [showNewRun, setShowNewRun] = useState(true);

  // Class blueprints (shared per hull class)
  const [blueprints, setBlueprints] = useState<Record<FrameId, any[]>>({...INITIAL_BLUEPRINTS});

  // Resources & research
  const [resources, setResources] = useState({...INITIAL_RESOURCES});
  const [research, setResearch] = useState({...INITIAL_RESEARCH});

  // Economy knobs
  const [rerollCost, setRerollCost] = useState(12);

  // Capacity
  const [capacity, setCapacity] = useState({ cap: 3 });

  // Fleet — lazy init so it doesn't depend on state variables
  const [fleet, setFleet] = useState<any[]>(() => [ makeShip(getFrame('interceptor'), [ ...INITIAL_BLUEPRINTS.interceptor ]) ]);
  const usedTonnage = useMemo(()=> fleet.reduce((a,s)=> a + (s.alive? s.frame.tonnage : 0), 0), [fleet]);
  const tonnage = { used: usedTonnage, cap: capacity.cap };

  // Shop state — lazy init based on INITIAL_RESEARCH
  const [focused, setFocused] = useState(0);
  const [shop, setShop] = useState(()=>({ items: rollInventory(INITIAL_RESEARCH, 8) }));

  // Combat state
  const [enemyFleet, setEnemyFleet] = useState<any[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [roundNum, setRoundNum] = useState(1);
  const [queue, setQueue] = useState<any[]>([]);
  const [turnPtr, setTurnPtr] = useState(-1);
  const [auto, setAuto] = useState(false);
  const [combatOver, setCombatOver] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [rewardPaid, setRewardPaid] = useState(false);
  const [sector, setSector] = useState(1); // difficulty progression

  // ---------- Run management ----------
  function newRun(diff:'easy'|'medium'|'hard'){
    setDifficulty(diff);
    setShowNewRun(false);
    setResources({...INITIAL_RESOURCES});
    setCapacity({ cap: 3 });
    setResearch({...INITIAL_RESEARCH});
    setRerollCost(12);
    setSector(1);
    const count = diff==='easy'?3 : diff==='medium'?2 : 1;
    const arr = Array.from({length: count}, ()=> makeShip(getFrame('interceptor'), [ ...INITIAL_BLUEPRINTS.interceptor ]));
    setFleet(arr);
    setFocused(0);
    setShop({ items: rollInventory(INITIAL_RESEARCH, 8) });
    // Start with a combat to teach the loop, then shop after victory
    startFirstCombat();
    setShowRules(true);
  }
  function resetRun(){ setShowNewRun(true); }

  // ---------- Blueprint helpers ----------
  function applyBlueprintToFleet(frameId:FrameId, parts:any[]){ setFleet(f=> f.map(sh => sh.frame.id===frameId ? makeShip(sh.frame, parts) : sh)); }
  function updateBlueprint(frameId:FrameId, mutate:(arr:any[])=>any[]){ setBlueprints(bp => { const next = { ...bp } as Record<FrameId,any[]>; const after = mutate(next[frameId]); const tmp = makeShip(getFrame(frameId), after); if(!tmp.stats.valid) return bp; next[frameId] = after; applyBlueprintToFleet(frameId, after); return next; }); }
  function canInstallOnClass(frameId:FrameId, part:any){ const tmp = makeShip(getFrame(frameId), [...blueprints[frameId], part]); return { ok: tmp.stats.valid, tmp }; }
  function ghost(ship:any, part:any){ const frameId = ship.frame.id as FrameId; const chk = canInstallOnClass(frameId, part); const base = makeShip(ship.frame, blueprints[frameId]); return { targetName: ship.frame.name + " (class)", use: chk.tmp.stats.powerUse, prod: chk.tmp.stats.powerProd, valid: chk.tmp.stats.valid, initBefore: base.stats.init, initAfter: chk.tmp.stats.init, initDelta: chk.tmp.stats.init - base.stats.init, hullBefore: base.stats.hullCap, hullAfter: chk.tmp.stats.hullCap, hullDelta: chk.tmp.stats.hullCap - base.stats.hullCap }; }
  function buyAndInstall(part:any){ if(resources.credits < (part.cost||0)) return; const ship = fleet[focused]; if(!ship) return; const frameId = ship.frame.id as FrameId; const chk = canInstallOnClass(frameId, part); setResources(r=>({...r, credits: r.credits - (part.cost||0)})); if(chk.ok){ updateBlueprint(frameId, arr => [...arr, part]); } }
  function sellPart(frameId:FrameId, idx:number){ const arr = (blueprints as any)[frameId]; if(!arr) return; const part = arr[idx]; if(!part) return; const next = arr.filter((_:any,i:number)=> i!==idx); const tmp = makeShip(getFrame(frameId), next); if(!tmp.stats.valid) return; const refund = Math.floor((part.cost||0)*0.25); setResources(r=>({...r, credits: r.credits + refund })); updateBlueprint(frameId, _=> next); }

  // ---------- Capacity & build/upgrade ----------
  function buildShip(){
    // Build Interceptor: 3🧱 + 2¢
    const cost = { c:2, m:3 };
    if(resources.credits < cost.c || resources.materials < cost.m) return;
    const frameId:FrameId = 'interceptor';
    const ton = getFrame(frameId).tonnage; if((tonnage.used + ton) > capacity.cap) return;
    const newShip = makeShip(getFrame(frameId), [ ...blueprints[frameId] ]);
    setFleet(f=>[...f, newShip]); setFocused(fleet.length);
    setResources(r=>({ ...r, credits: r.credits - cost.c, materials: r.materials - cost.m }));
  }
  function upgradeShip(idx:number){
    const s = fleet[idx]; if(!s) return;
    const nextId = s.frame.id === 'interceptor' ? 'cruiser' : s.frame.id === 'cruiser' ? 'dread' : null as any;
    const needMil = s.frame.id === 'interceptor' ? 2 : s.frame.id === 'cruiser' ? 3 : 99; if(!nextId) return;
    if((research.Military||1) < needMil) return; // locked by tech
    // Upgrade costs: I→C: 3🧱+3¢, C→D: 5🧱+4¢
    const cost = s.frame.id === 'interceptor' ? {c:3,m:3} : {c:4,m:5};
    const delta = getFrame(nextId).tonnage - s.frame.tonnage; if((tonnage.used + delta) > capacity.cap) return;
    if(resources.credits < cost.c || resources.materials < cost.m) return;
    const upgraded = makeShip(getFrame(nextId), [ ...blueprints[nextId as FrameId] ]);
    setFleet(f => f.map((sh,i)=> i===idx? upgraded : sh));
    setResources(r=>({ ...r, credits: r.credits - cost.c, materials: r.materials - cost.m }));
  }
  function upgradeDock(){
    // Dock expand +2: 4🧱 + 4¢ (cap to 10)
    const cost = { c: 4, m: 4 };
    if(resources.credits < cost.c || resources.materials < cost.m) return;
    setCapacity(x=>({ cap: Math.min(10, x.cap + 2) }));
    setResources(r=>({ ...r, credits: r.credits - cost.c, materials: r.materials - cost.m }));
  }

  // ---------- Shop actions: reroll & research ----------
  function doReroll(){
    if(resources.credits < rerollCost) return;
    setResources(r=> ({...r, credits: r.credits - rerollCost }));
    setShop({ items: rollInventory(research, 8) });
    setRerollCost(x=> x + 6);
  }
  function nextTierCost(curr:number){ // research pacing: unlock ~S3-4, finish by ~S7-8
    if(curr===1) return { c:40, s:1 };
    if(curr===2) return { c:120, s:2 };
    return null as any;
  }
  function researchTrack(track:'Military'|'Grid'|'Nano'){
    const curr = (research as any)[track]||1; if(curr>=3) return; const cost:any = nextTierCost(curr); if(!cost) return; if(resources.credits < cost.c || resources.science < cost.s) return;
    const nextTier = curr + 1;
    setResearch(t=>({ ...t, [track]: nextTier }));
    setResources(r=>({ ...r, credits: r.credits - cost.c, science: r.science - cost.s }));
    // research triggers shop reroll and raises reroll cost
    setShop({ items: rollInventory({ ...research, [track]: nextTier } as any, 8) });
    setRerollCost(x=> x + 6);
  }

  // ---------- Enemy Generation ----------
  function genEnemyFleet(matchTonnage:number){
    const { tonBonus, tierBonus, boss } = sectorScaling(sector);
    const options = [FRAMES.dread, FRAMES.cruiser, FRAMES.interceptor];
    let remaining = Math.max(1, matchTonnage + tonBonus);
    const ships:any[] = [];
    let bossAssigned = false;
    const minTonnage = Math.min(...options.map(f=>f.tonnage));
    while(remaining >= minTonnage){
      const viable = options.filter(f => f.tonnage <= remaining);
      if(viable.length === 0) break;
      const pick = viable[Math.floor(Math.random()*viable.length)];
      const parts = randomEnemyPartsFor(pick, research as any, tierBonus as number, boss && !bossAssigned);
      ships.push(makeShip(pick, parts));
      if(boss && !bossAssigned && pick.id!=='interceptor') bossAssigned = true;
      remaining -= pick.tonnage;
    }
    return ships;
  }

  // ---------- Combat helpers ----------
  function buildInitiative(pFleet:any[], eFleet:any[]){ const q:any[] = []; pFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'P', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); }); eFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'E', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); }); q.sort((a, b) => (b.init - a.init) || (b.size - a.size) || (Math.random() - 0.5)); return q; }
  function targetIndex(defFleet:any[], strategy:'kill'|'guns'){
    if(strategy==='kill'){
      let best=-1, bestHull=1e9; for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ if(s.hull < bestHull){ bestHull=s.hull; best=i; } } } if(best!==-1) return best;
    }
    if(strategy==='guns'){
      let best=-1, guns=-1; for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ const g=s.weapons.length; if(g>guns){ guns=g; best=i; } } } if(best!==-1) return best;
    }
    return defFleet.findIndex(s=>s.alive && s.stats.valid);
  }
  function volley(attacker:any, defender:any, side:'P'|'E', logArr:string[]){ const thr = successThreshold(attacker.stats.aim, defender.stats.shieldTier); attacker.weapons.forEach((w:any) => { const succ = rollSuccesses(w.dice, thr); const dmg = succ * w.dmgPerHit; if (succ > 0) { defender.hull -= dmg; logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: ${succ} hit(s) → ${dmg} hull (thr ≥ ${thr})`); if (defender.hull <= 0) { defender.alive = false; defender.hull = 0; logArr.push(`💥 ${defender.frame.name} destroyed!`); } } else { logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (thr ≥ ${thr})`); } }); }

  function startCombat(){ const enemy = genEnemyFleet(tonnage.used); setEnemyFleet(enemy); setLog([`Sector ${sector}: Engagement begins — enemy tonnage ~${tonnage.used}`]); setRoundNum(1); setQueue([]); setTurnPtr(-1); setAuto(false); setCombatOver(false); setOutcome(''); setRewardPaid(false); setMode('COMBAT'); }
  function startFirstCombat(){ // tutorial fight vs one interceptor
    const enemy = [ makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0]]) ];
    setEnemyFleet(enemy);
    setLog([`Sector ${sector}: Skirmish — a lone Interceptor approaches.`]);
    setRoundNum(1); setQueue([]); setTurnPtr(-1); setAuto(false); setCombatOver(false); setOutcome(''); setRewardPaid(false); setMode('COMBAT');
  }
  function initRoundIfNeeded(){ if (turnPtr === -1 || turnPtr >= queue.length) { const q = buildInitiative(fleet, enemyFleet); setQueue(q); setTurnPtr(0); setLog(l => [...l, `— Round ${roundNum} —`]); return true; } return false; }
  function stepTurn(){ if(combatOver) return; const pAlive = fleet.some(s => s.alive && s.stats.valid); const eAlive = enemyFleet.some(s => s.alive && s.stats.valid); if (!pAlive || !eAlive) {
      if(pAlive){ if(!rewardPaid){ const rw = calcRewards(enemyFleet, sector); setResources(r=>({...r, credits: r.credits + rw.c, materials: r.materials + rw.m, science: r.science + rw.s })); setRewardPaid(true); setLog(l=>[...l, `✅ Victory — +${rw.c}¢, +${rw.m}🧱, +${rw.s}🔬`]); } setOutcome('Victory'); setSector(s=> Math.min(10, s+1)); setRerollCost(12); }
      else {
        if(difficulty==='hard') { setOutcome('Defeat — Run Over'); }
        else { setOutcome('Defeat — Grace'); }
        setLog(l=>[...l, '💀 Defeat']);
      }
      setCombatOver(true); setAuto(false); return; }
    if (initRoundIfNeeded()) return; const e = queue[turnPtr]; const isP = e.side==='P'; const atk = isP ? fleet[e.idx] : enemyFleet[e.idx]; const defFleet = isP ? enemyFleet : fleet; const strategy = isP ? 'guns' : 'kill'; const defIdx = targetIndex(defFleet, strategy); if (!atk || !atk.alive || !atk.stats.valid || defIdx === -1) { advancePtr(); return; } const lines:string[] = []; volley(atk, defFleet[defIdx], e.side, lines); setLog(l=>[...l, ...lines]); if (isP) setEnemyFleet([...defFleet]); else setFleet([...defFleet]); advancePtr(); }
  function advancePtr(){ const np = turnPtr + 1; setTurnPtr(np); if (np >= queue.length) endRound(); }
  function endRound(){ const pAlive = fleet.some(s => s.alive && s.stats.valid); const eAlive = enemyFleet.some(s => s.alive && s.stats.valid); if (!pAlive || !eAlive) { setAuto(false); return; } setRoundNum(n=>n+1); setTurnPtr(-1); setQueue([]); }
  function calcRewards(enemy:any[], sector:number){ let c=0,m=0,s=0; enemy.forEach(sh=>{ if(!sh) return; if(sh.frame.id==='interceptor'){ c+=18; m+=1; } else if(sh.frame.id==='cruiser'){ c+=28; m+=1; s+=1; } else if(sh.frame.id==='dread'){ c+=45; m+=2; s+=1; } }); const boss = (sector===5 || sector===10); const mult = 1 + Math.floor(Math.max(0, sector-1))*0.06; c = Math.floor(c*mult * (boss?1.25:1)); if(boss){ s += 1; m += 1; } return { c, m, s }; }
  function restoreAndCullFleetAfterCombat(){ setFleet(f => f.filter(s => s.alive).map(s => ({...s, hull: s.stats.hullCap}))); setFocused(0); }

  // Auto-step loop
  useEffect(()=>{ if(!auto || mode!=='COMBAT' || combatOver) return; const t = setInterval(()=> stepTurn(), 500); return ()=> clearInterval(t); }, [auto, mode, combatOver, queue, turnPtr, fleet, enemyFleet]);

  // First-visit rules & new-run modal
  useEffect(()=>{
    if(difficulty==null) setShowNewRun(true);
  },[difficulty]);
  function dismissRules(){ setShowRules(false); }

  // ---------------- Self-tests (runtime) ----------------
  useEffect(()=>{
    try{
      // Combat threshold clamps
      console.assert(successThreshold(-5, 10) === 6, 'Clamp max 6');
      console.assert(successThreshold(10, -5) === 2, 'Clamp min 2');
      // Reward scaling
      const r1 = calcRewards([makeShip(getFrame('cruiser'), [PARTS.sources[0], PARTS.drives[0]])], 1);
      const r3 = calcRewards([makeShip(getFrame('cruiser'), [PARTS.sources[0], PARTS.drives[0]])], 3);
      console.assert(r3.c >= r1.c, 'Credits scale with sector');
      // Research costs
      const c12 = (function(){ const f = (x:number)=>{ if(x===1) return {c:40,s:1}; if(x===2) return {c:120,s:2}; return null; }; return [f(1), f(2), f(3)]; })();
      console.assert(c12[0]?.c===40 && c12[1]?.s===2 && c12[2]===null, 'nextTierCost shape');
      // Shop guarantees: ensure at least one of each guaranteed categories if available in pool
      const items = rollInventory({Military:1, Grid:1, Nano:1}, 8);
      const hasHull = items.some(isHull), hasDrive = items.some(isDrive), hasSrc = items.some(isSource), hasWeap = items.some(isWeapon);
      console.assert(hasHull && hasDrive && hasSrc && hasWeap, 'Shop guarantees present');
      // Frame safety & makeShip on all frames
      ['interceptor','cruiser','dread'].forEach((id:any)=>{
        const f = getFrame(id);
        const s = makeShip(f, [PARTS.sources[0], PARTS.drives[0]]);
        console.assert(s.stats.hullCap>=1 && s.stats.valid, `makeShip valid for ${id}`);
      });
    }catch(err){ console.warn('Self-tests error', err); }
  },[]);

  // ---------- View ----------
  const fleetValid = fleet.every(s=>s.stats.valid) && tonnage.used <= capacity.cap;
  const focusedShip = fleet[focused];

  function researchLabel(track:'Military'|'Grid'|'Nano'){ const curr = (research as any)[track]||1; if(curr>=3) return `${track} 3 (max)`; const nxt = curr+1; const cost:any = nextTierCost(curr)!; return `${track} ${curr}→${nxt} (${cost.c}¢ + ${cost.s}🔬)`; }
  function canResearch(track:'Military'|'Grid'|'Nano'){ const curr = (research as any)[track]||1; if(curr>=3) return false; const {c,s}:any = nextTierCost(curr)!; return resources.credits>=c && resources.science>=s; }
  function upgradeLockInfo(ship:any){ if(!ship) return null; if(ship.frame.id==='interceptor'){ return { need: 2, next:'Cruiser' }; } if(ship.frame.id==='cruiser'){ return { need: 3, next:'Dreadnought' }; } return null; }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100">
      {/* New Run Modal */}
      {showNewRun && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
            <div className="text-lg font-semibold">Start New Run</div>
            <div className="text-sm opacity-80 mt-1">Choose difficulty. Easy/Medium grant a grace respawn after a wipe; Hard is a full reset.</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button className="px-3 py-2 rounded-xl bg-emerald-700" onClick={()=>newRun('easy')}>Easy (3✈)</button>
              <button className="px-3 py-2 rounded-xl bg-amber-700" onClick={()=>newRun('medium')}>Medium (2✈)</button>
              <button className="px-3 py-2 rounded-xl bg-rose-700" onClick={()=>newRun('hard')}>Hard (1✈)</button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/60">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-xl">
            <div className="text-lg font-semibold mb-2">How to Play</div>
            <div className="text-sm space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              <div><b>Goal.</b> Clear 10 sectors; bosses at 5 & 10. Lose = entire fleet destroyed.</div>
              <div><b>Opening.</b> Your first encounter is an immediate skirmish vs a lone Interceptor. After victory, visit the Outpost.</div>
              <div><b>Loop.</b> Outpost → Combat → Rewards → Return.</div>
              <div><b>Blueprints.</b> Upgrades apply to the <i>entire class</i>.</div>
              <div><b>Power & Tiles.</b> Each frame has tile limits; parts consume/produce ⚡. Must have a <i>Source</i> and a <i>Drive</i>.</div>
              <div><b>Combat.</b> Initiative by Drive; 1s miss / 6s hit; enemies focus <i>lowest hull</i>.</div>
              <div><b>Economy.</b> Build Interceptor 3🧱+2¢; I→C 3🧱+3¢; C→D 5🧱+4¢; Docks +2 = 4🧱+4¢. Reroll 12¢ +6; Research 40/120¢ + 1/2🔬; Sell 25%.</div>
              <div><b>Shop.</b> Hull-first guarantees; T1 parts cost ~15–25¢ so you can buy after an early win. Research also bumps reroll cost.</div>
              <div><b>Difficulty.</b> Easy/Medium grace respawn; Hard resets run.</div>
            </div>
            <div className="mt-3"><button onClick={dismissRules} className="w-full px-4 py-2 rounded-xl bg-emerald-600">Let’s go</button></div>
          </div>
        </div>
      )}

      <ResourceBar {...resources} tonnage={tonnage} sector={sector} onReset={resetRun} />
      <div className="sticky top-12 z-10 px-3 py-2 bg-zinc-950/95 border-b border-zinc-800 flex gap-2 text-sm">
        <button onClick={()=>setMode('OUTPOST')} className={`px-3 py-2 rounded ${mode==='OUTPOST'?'bg-sky-700':'bg-zinc-800'}`}>Outpost</button>
        <button onClick={()=> mode==='OUTPOST' && fleetValid ? startCombat() : null} className={`px-3 py-2 rounded ${mode==='COMBAT'?'bg-sky-700':'bg-zinc-800'}`}>{mode==='COMBAT'? 'Combat' : 'Start Combat'}</button>
      </div>

      {mode==='OUTPOST' && (
        <div>
          {/* Shop Header: Reroll + Research */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-950">
            <div className="flex gap-2 items-center">
              <button onClick={doReroll} disabled={resources.credits<rerollCost} className={`px-3 py-2 rounded-lg ${resources.credits>=rerollCost?'bg-purple-700':'bg-zinc-700 opacity-60'}`}>Reroll ({rerollCost}¢)</button>
              <div className="text-xs opacity-70">Reroll +6 after each Reroll/Research</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              {(['Military','Grid','Nano'] as const).map(t=> (
                <button key={t} onClick={()=>researchTrack(t)} disabled={!canResearch(t)} className={`px-3 py-2 rounded-xl ${canResearch(t)?'bg-zinc-900 border border-zinc-700':'bg-zinc-800 opacity-60'}`}>{researchLabel(t)}</button>
              ))}
            </div>
          </div>

          {/* Hangar */}
          <div className="p-3">
            <div className="text-lg font-semibold mb-2">Hangar (Class Blueprints)</div>
            <div className="grid grid-cols-1 gap-2">
              {fleet.map((s,i)=> (
                <button key={i} onClick={()=>setFocused(i)} className={`w-full text-left p-3 rounded-xl border mb-1 ${i===focused?'border-sky-400 bg-sky-400/10':'border-zinc-700 bg-zinc-900'}`}>
                  <div className="flex items-center justify-between"><div className="font-semibold">{s.frame.name} <span className="text-xs opacity-70">(t{s.frame.tonnage})</span></div><PowerBadge use={s.stats.powerUse} prod={s.stats.powerProd} /></div>
                  <div className="text-xs opacity-80 mt-1">Init {s.stats.init} • Tiles {s.parts.length}/{s.frame.tiles}</div>
                  <div className="mt-1">Hull: {s.hull}/{s.stats.hullCap}</div>
                  <div className="mt-1 text-xs">Parts: {s.parts.map((p:any)=>p.name).join(', ')||'—'}</div>
                  {!s.stats.valid && <div className="text-xs text-rose-300 mt-1">Not deployable: needs Source + Drive and ⚡ OK</div>}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={buildShip} className="px-3 py-3 rounded-xl bg-sky-600 active:scale-95">Build Interceptor (3🧱 + 2¢)</button>
              <button onClick={()=>upgradeShip(focused)} className="px-3 py-3 rounded-xl bg-amber-600 active:scale-95">Upgrade Focused</button>
            </div>
            {(() => { const info = upgradeLockInfo(focusedShip); if(!info) return null; const ok = (research.Military||1) >= info.need; return (
              <div className={`mt-2 text-xs px-3 py-2 rounded ${ok? 'bg-emerald-900/30 text-emerald-200':'bg-zinc-900 border border-zinc-700 text-zinc-300'}`}>
                {ok ? `Upgrade to ${info.next} unlocked (Military ≥ ${info.need})` : `Upgrade to ${info.next} locked: requires Military ≥ ${info.need}`}
              </div>
            ); })()}

            {/* Blueprint Manager with Sell */}
            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">Class Blueprint — {focusedShip?.frame.name}</div>
              <div className="grid grid-cols-2 gap-2">
                {blueprints[focusedShip?.frame.id as FrameId]?.map((p, idx)=> (
                  <div key={idx} className="p-2 rounded border border-zinc-700 bg-zinc-900 text-xs">
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="opacity-70">{p.cat} • Tier {p.tier} {isSource(p)?`• +⚡${p.powerProd}`:`• ⚡${p.powerCost||0}`}</div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="opacity-70">Refund {Math.floor((p.cost||0)*0.25)}¢</span>
                      <button onClick={()=> sellPart(focusedShip.frame.id as FrameId, idx)} className="px-2 py-1 rounded bg-rose-600">Sell</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Outpost Inventory (items) */}
          <div className="p-3">
            <div className="text-lg font-semibold mb-2">Outpost Inventory</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shop.items.map((it:any, i:number)=> { const canAfford = resources.credits >= (it.cost||0); const gd = focusedShip? ghost(focusedShip, it) : null; return (<ItemCard key={i} item={it} canAfford={canAfford} ghostDelta={gd} onBuy={()=>buyAndInstall(it)} />); })}
            </div>
          </div>

          {/* Docks */}
          <div className="px-3 pb-24">
            <div className="font-semibold mb-2">Dock Upgrades</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={upgradeDock} className="px-3 py-3 rounded-xl bg-indigo-600 active:scale-95">Expand Capacity +2 (4🧱 + 4¢)</button>
              <div className="px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm">Capacity: <b>{capacity.cap}</b> • Used: <b>{tonnage.used}</b></div>
            </div>
          </div>

          {/* Start Combat */}
          <div className="sticky bottom-0 z-10 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 flex items-center gap-2">
            <button onClick={()=> fleetValid && startCombat()} className={`flex-1 px-4 py-3 rounded-xl ${fleetValid?'bg-emerald-600':'bg-zinc-700 opacity-60'}`}>Start Combat</button>
            {!fleet.every(s=>s.stats.valid) && <div className="text-xs text-rose-300">Fix fleet (Source + Drive + ⚡ OK)</div>}
            {tonnage.used > capacity.cap && <div className="text-xs text-rose-300">Over capacity — expand docks</div>}
          </div>
        </div>
      )}

      {mode==='COMBAT' && (
        <div className="p-3">
          {combatOver && (
            <div className={`mb-2 p-3 rounded-lg text-sm ${outcome.startsWith('Victory') ? 'bg-emerald-900/40 text-emerald-200' : 'bg-rose-900/40 text-rose-200'}`}>
              {outcome}
            </div>
          )}
          {/* Enemy row */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Enemy</div>
            <div className="text-xs opacity-60">Round {roundNum}{queue[turnPtr]? ` • Next: ${(queue[turnPtr].side==='P'?'P':'E')} ${queue[turnPtr].side==='P'?fleet[queue[turnPtr].idx]?.frame.name:enemyFleet[queue[turnPtr].idx]?.frame.name}`: ''}</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {enemyFleet.map((s,i)=> (
              <CompactShip key={'e'+i} ship={s} side='E' active={!combatOver && queue[turnPtr]?.side==='E' && queue[turnPtr]?.idx===i} />
            ))}
          </div>
          {/* Player row */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="text-sm font-semibold">Player</div>
            <div className="text-xs opacity-60">Capacity {tonnage.used}/{capacity.cap}</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fleet.map((s,i)=> (
              <CompactShip key={'p'+i} ship={s} side='P' active={!combatOver && queue[turnPtr]?.side==='P' && queue[turnPtr]?.idx===i} />
            ))}
          </div>
          {/* Mini Log */}
          <div className="mt-3 p-2 rounded bg-zinc-900 text-xs min-h-[56px]">{log.slice(-3).map((ln,i)=>(<div key={i} className={i===log.length-1? 'font-medium' : 'opacity-80'}>{ln}</div>))}</div>
          {/* Controls */}
          <div className="sticky bottom-0 z-10 mt-3 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 flex items-center gap-2">
            <button disabled={combatOver} onClick={()=> { if (!initRoundIfNeeded()) stepTurn(); }} className={`flex-1 px-4 py-3 rounded-xl ${combatOver? 'bg-zinc-700 opacity-60':'bg-sky-600'}`}>▶ Step</button>
            <button disabled={combatOver} onClick={()=> setAuto(a=>!a)} className={`px-4 py-3 rounded-xl ${auto && !combatOver? 'bg-emerald-700':'bg-zinc-800'}`}>{auto? '⏸ Auto' : '⏩ Auto'}</button>
            <button
              onClick={()=>{
                if(!combatOver) return;
                if(outcome==='Victory'){
                  restoreAndCullFleetAfterCombat();
                  setMode('OUTPOST');
                  setShop({ items: rollInventory(research as any, 8) });
                } else {
                  if(difficulty==='hard'){
                    resetRun();
                  } else {
                    setFleet([ makeShip(getFrame('interceptor'), [ ...blueprints.interceptor ]) ]);
                    setResources(r=>({ ...r, credits: 0, materials: 0 }));
                    setMode('OUTPOST');
                    setShop({ items: rollInventory(research as any, 8) });
                  }
                }
              }}
              className="px-4 py-3 rounded-xl bg-emerald-800"
            >Return to Outpost</button>
          </div>
        </div>
      )}

      {/* Floating reopen rules button at bottom */}
      <div className="fixed bottom-3 right-3 z-40">
        <button onClick={()=>setShowRules(true)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓ Rules</button>
      </div>
    </div>
  );
}

// Named exports for testing and future modularization
export {
  successThreshold,
  rollSuccesses,
  sizeRank,
  makeShip,
  tierCap,
  rollInventory,
  sectorScaling,
  randomEnemyPartsFor,
  getFrame,
  FRAMES,
  PARTS,
};