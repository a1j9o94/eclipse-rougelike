import { useEffect, useMemo, useState } from "react";
import './index.css'
import { FRAMES, PARTS, getFrame, successThreshold, rollSuccesses, sizeRank, makeShip, rollInventory, sectorScaling, randomEnemyPartsFor, nextTierCost, isSource, isHull, isDrive, isWeapon } from './game'
import { INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_RESOURCES, type Resources, type Research } from './config/defaults'
import { type FrameId } from './game'
import { ResourceBar } from './components/ui'
import { NewRunModal, RulesModal } from './components/modals'
import OutpostPage from './pages/OutpostPage'
import CombatPage from './pages/CombatPage'
import { type Part } from './config/parts'
import { type Ship, type GhostDelta, type InitiativeEntry } from './config/types'

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



// ------------------------------- Initial Config ----------------------------
// Defaults are now configured in src/config/defaults.ts

// ------------------------------- Integrated App ----------------------------
export default function EclipseIntegrated(){
  const [mode, setMode] = useState<'OUTPOST'|'COMBAT'>('OUTPOST');
  const [showRules, setShowRules] = useState(false);
  const [difficulty, setDifficulty] = useState<null|'easy'|'medium'|'hard'>(null);
  const [showNewRun, setShowNewRun] = useState(true);

  // Class blueprints (shared per hull class)
  const [blueprints, setBlueprints] = useState<Record<FrameId, Part[]>>({...INITIAL_BLUEPRINTS});

  // Resources & research
  const [resources, setResources] = useState<Resources>({...INITIAL_RESOURCES});
  const [research, setResearch] = useState<Research>({...INITIAL_RESEARCH});

  // Economy knobs
  const [rerollCost, setRerollCost] = useState(12);

  // Capacity
  const [capacity, setCapacity] = useState({ cap: 3 });

  // Fleet — lazy init so it doesn't depend on state variables
  const [fleet, setFleet] = useState<Ship[]>(() => [ makeShip(getFrame('interceptor'), [ ...INITIAL_BLUEPRINTS.interceptor ]) ] as unknown as Ship[]);
  const usedTonnage = useMemo(()=> fleet.reduce((a,s)=> a + (s.alive? s.frame.tonnage : 0), 0), [fleet]);
  const tonnage = { used: usedTonnage, cap: capacity.cap };

  // Shop state — lazy init based on INITIAL_RESEARCH
  const [focused, setFocused] = useState(0);
  const [shop, setShop] = useState(()=>({ items: rollInventory(INITIAL_RESEARCH, 8) }));

  // Combat state
  const [enemyFleet, setEnemyFleet] = useState<Ship[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [roundNum, setRoundNum] = useState(1);
  const [queue, setQueue] = useState<InitiativeEntry[]>([]);
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
  function applyBlueprintToFleet(frameId:FrameId, parts:Part[]){ setFleet(f=> f.map(sh => sh.frame.id===frameId ? makeShip(sh.frame, parts) as unknown as Ship : sh)); }
  function updateBlueprint(frameId:FrameId, mutate:(arr:Part[])=>Part[]){ setBlueprints(bp => { const next = { ...bp } as Record<FrameId,Part[]>; const after = mutate(next[frameId]); const tmp = makeShip(getFrame(frameId), after); if(!tmp.stats.valid) return bp; next[frameId] = after; applyBlueprintToFleet(frameId, after); return next; }); }
  function canInstallOnClass(frameId:FrameId, part:Part){ const tmp = makeShip(getFrame(frameId), [...blueprints[frameId], part]); return { ok: tmp.stats.valid, tmp }; }
  function ghost(ship:Ship, part:Part): GhostDelta { const frameId = ship.frame.id as FrameId; const chk = canInstallOnClass(frameId, part); const base = makeShip(ship.frame, blueprints[frameId]); return { targetName: ship.frame.name + " (class)", use: chk.tmp.stats.powerUse, prod: chk.tmp.stats.powerProd, valid: chk.tmp.stats.valid, initBefore: base.stats.init, initAfter: chk.tmp.stats.init, initDelta: chk.tmp.stats.init - base.stats.init, hullBefore: base.stats.hullCap, hullAfter: chk.tmp.stats.hullCap, hullDelta: chk.tmp.stats.hullCap - base.stats.hullCap }; }
  function buyAndInstall(part:Part){ if(resources.credits < (part.cost||0)) return; const ship = fleet[focused]; if(!ship) return; const frameId = ship.frame.id as FrameId; const chk = canInstallOnClass(frameId, part); setResources(r=>({...r, credits: r.credits - (part.cost||0)})); if(chk.ok){ updateBlueprint(frameId, arr => [...arr, part]); } }
  function sellPart(frameId:FrameId, idx:number){ const arr = blueprints[frameId]; if(!arr) return; const part = arr[idx]; if(!part) return; const next = arr.filter((_,i:number)=> i!==idx); const tmp = makeShip(getFrame(frameId), next); if(!tmp.stats.valid) return; const refund = Math.floor((part.cost||0)*0.25); setResources(r=>({...r, credits: r.credits + refund })); updateBlueprint(frameId, () => next); }

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
    const nextId = s.frame.id === 'interceptor' ? 'cruiser' : s.frame.id === 'cruiser' ? 'dread' : null as unknown as FrameId;
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
  function researchTrack(track:'Military'|'Grid'|'Nano'){
    const curr = (research as Research)[track]||1; if(curr>=3) return; const cost = nextTierCost(curr); if(!cost) return; if(resources.credits < cost.c || resources.science < cost.s) return;
    const nextTier = curr + 1;
    setResearch(t=>({ ...t, [track]: nextTier }));
    setResources(r=>({ ...r, credits: r.credits - cost.c, science: r.science - cost.s }));
    // research triggers shop reroll and raises reroll cost
    setShop({ items: rollInventory({ ...research, [track]: nextTier } as Research, 8) });
    setRerollCost(x=> x + 6);
  }
  function handleReturnFromCombat(){
    if(!combatOver) return;
    if(outcome==='Victory'){
      restoreAndCullFleetAfterCombat();
      setMode('OUTPOST');
      setShop({ items: rollInventory(research as Research, 8) });
    } else {
      if(difficulty==='hard'){
        resetRun();
      } else {
        setFleet([ makeShip(getFrame('interceptor'), [ ...blueprints.interceptor ]) ]);
        setResources(r=>({ ...r, credits: 0, materials: 0 }));
        setMode('OUTPOST');
        setShop({ items: rollInventory(research as Research, 8) });
      }
    }
  }


  // ---------- Enemy Generation ----------
  function genEnemyFleet(matchTonnage:number){
    const { tonBonus, tierBonus, boss } = sectorScaling(sector);
    const options = [FRAMES.dread, FRAMES.cruiser, FRAMES.interceptor];
    let remaining = Math.max(1, matchTonnage + tonBonus);
    const ships:Ship[] = [] as unknown as Ship[];
    let bossAssigned = false;
    const minTonnage = Math.min(...options.map(f=>f.tonnage));
    while(remaining >= minTonnage){
      const viable = options.filter(f => f.tonnage <= remaining);
      if(viable.length === 0) break;
      const pick = viable[Math.floor(Math.random()*viable.length)];
      const parts = randomEnemyPartsFor(pick, research as Research, tierBonus as number, boss && !bossAssigned);
      ships.push(makeShip(pick, parts));
      if(boss && !bossAssigned && pick.id!=='interceptor') bossAssigned = true;
      remaining -= pick.tonnage;
    }
    return ships;
  }

  // ---------- Combat helpers ----------
  function buildInitiative(pFleet:Ship[], eFleet:Ship[]){ const q:InitiativeEntry[] = []; pFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'P', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); }); eFleet.forEach((s, i) => { if (s.alive && s.stats.valid) q.push({ side: 'E', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); }); q.sort((a, b) => (b.init - a.init) || (b.size - a.size) || (Math.random() - 0.5)); return q as InitiativeEntry[]; }
  function targetIndex(defFleet:Ship[], strategy:'kill'|'guns'){
    if(strategy==='kill'){
      let best=-1, bestHull=1e9; for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ if(s.hull < bestHull){ bestHull=s.hull; best=i; } } } if(best!==-1) return best;
    }
    if(strategy==='guns'){
      let best=-1, guns=-1; for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive && s.stats.valid){ const g=s.weapons.length; if(g>guns){ guns=g; best=i; } } } if(best!==-1) return best;
    }
    return defFleet.findIndex(s=>s.alive && s.stats.valid);
  }
  function volley(attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[]){ const thr = successThreshold(attacker.stats.aim, defender.stats.shieldTier); attacker.weapons.forEach((w:Part) => { const succ = rollSuccesses(w.dice||0, thr); const dmg = succ * (w.dmgPerHit||0); if (succ > 0) { defender.hull -= dmg; logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: ${succ} hit(s) → ${dmg} hull (thr ≥ ${thr})`); if (defender.hull <= 0) { defender.alive = false; defender.hull = 0; logArr.push(`💥 ${defender.frame.name} destroyed!`); } } else { logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (thr ≥ ${thr})`); } }); }

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
  function calcRewards(enemy:Ship[], sector:number){ let c=0,m=0,s=0; enemy.forEach(sh=>{ if(!sh) return; if(sh.frame.id==='interceptor'){ c+=18; m+=1; } else if(sh.frame.id==='cruiser'){ c+=28; m+=1; s+=1; } else if(sh.frame.id==='dread'){ c+=45; m+=2; s+=1; } }); const boss = (sector===5 || sector===10); const mult = 1 + Math.floor(Math.max(0, sector-1))*0.06; c = Math.floor(c*mult * (boss?1.25:1)); if(boss){ s += 1; m += 1; } return { c, m, s }; }
  function restoreAndCullFleetAfterCombat(){ setFleet(f => f.filter(s => s.alive).map(s => ({...s, hull: s.stats.hullCap}))); setFocused(0); }

  // Auto-step loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      (['interceptor','cruiser','dread'] as FrameId[]).forEach((id:FrameId)=>{
        const f = getFrame(id);
        const s = makeShip(f, [PARTS.sources[0], PARTS.drives[0]]);
        console.assert(s.stats.hullCap>=1 && s.stats.valid, `makeShip valid for ${id}`);
      });
    }catch(err){ console.warn('Self-tests error', err); }
  },[]);

  // ---------- View ----------
  const fleetValid = fleet.every(s=>s.stats.valid) && tonnage.used <= capacity.cap;

  function researchLabel(track:'Military'|'Grid'|'Nano'){ const curr = (research as Research)[track]||1; if(curr>=3) return `${track} 3 (max)`; const nxt = curr+1; const cost = nextTierCost(curr)!; return `${track} ${curr}→${nxt} (${cost.c}¢ + ${cost.s}🔬)`; }
  function canResearch(track:'Military'|'Grid'|'Nano'){ const curr = (research as Research)[track]||1; if(curr>=3) return false; const {c,s} = nextTierCost(curr)!; return resources.credits>=c && resources.science>=s; }
  function upgradeLockInfo(ship:Ship|null|undefined){ if(!ship) return null; if(ship.frame.id==='interceptor'){ return { need: 2, next:'Cruiser' }; } if(ship.frame.id==='cruiser'){ return { need: 3, next:'Dreadnought' }; } return null; }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100">
      {/* New Run Modal */}
      {showNewRun && (
        <NewRunModal onNewRun={newRun} />
      )}

      {/* Rules Modal */}
      {showRules && (
        <RulesModal onDismiss={dismissRules} />
      )}

      <ResourceBar {...resources} tonnage={tonnage} sector={sector} onReset={resetRun} />
      <div className="sticky top-12 z-10 px-3 py-2 bg-zinc-950/95 border-b border-zinc-800 flex gap-2 text-sm">
        <button onClick={()=>setMode('OUTPOST')} className={`px-3 py-2 rounded ${mode==='OUTPOST'?'bg-sky-700':'bg-zinc-800'}`}>Outpost</button>
        <button onClick={()=> mode==='OUTPOST' && fleetValid ? startCombat() : null} className={`px-3 py-2 rounded ${mode==='COMBAT'?'bg-sky-700':'bg-zinc-800'}`}>{mode==='COMBAT'? 'Combat' : 'Start Combat'}</button>
      </div>

      {mode==='OUTPOST' && (
        <OutpostPage
          resources={resources}
          rerollCost={rerollCost}
          doReroll={doReroll}
          research={research}
          researchLabel={researchLabel}
          canResearch={canResearch}
          researchTrack={researchTrack}
          fleet={fleet}
          focused={focused}
          setFocused={setFocused}
          buildShip={buildShip}
          upgradeShip={upgradeShip}
          upgradeDock={upgradeDock}
          upgradeLockInfo={upgradeLockInfo}
          blueprints={blueprints}
          sellPart={sellPart}
          shop={shop}
          ghost={ghost}
          buyAndInstall={buyAndInstall}
          capacity={capacity}
          tonnage={tonnage}
          fleetValid={fleetValid}
          startCombat={startCombat}
        />
      )}

      {mode==='COMBAT' && (
        <CombatPage
          combatOver={combatOver}
          outcome={outcome}
          roundNum={roundNum}
          queue={queue}
          turnPtr={turnPtr}
          fleet={fleet}
          enemyFleet={enemyFleet}
          stepTurn={stepTurn}
          initRoundIfNeeded={initRoundIfNeeded}
          auto={auto}
          setAuto={setAuto}
          log={log}
          onReturn={handleReturnFromCombat}
        />
      )}

      {/* Floating reopen rules button at bottom */}
      <div className="fixed bottom-3 right-3 z-40">
        <button onClick={()=>setShowRules(true)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓ Rules</button>
      </div>
    </div>
  );
}
