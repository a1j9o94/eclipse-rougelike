// React import not required with modern JSX transform
import { ECONOMY, nextTierCost } from '../config/economy'
import { getSectorSpec } from '../game'
import { type SectorSpec } from '../config/types'
import { FRAMES } from '../game'

// Compute previews once per session so content is stable across openings
type Preview = { sector:number; tonnage:number; tierCap:number; boss:boolean; example:string[] };
let PREVIEWS_CACHE: Preview[] | null = null;
function initPreviews(){
  if(PREVIEWS_CACHE) return PREVIEWS_CACHE;
  const targets = [1,5,10];
  const out: Preview[] = [];
  for(const s of targets){
    const spec:SectorSpec = getSectorSpec(s);
    // Simple deterministic-ish example: fill by largest-first frames up to tonnage
    const options = [FRAMES.dread, FRAMES.cruiser, FRAMES.interceptor];
    let rem = spec.enemyTonnage;
    const names:string[] = [];
    for(const f of options){
      while(rem - f.tonnage >= 0){ names.push(f.name); rem -= f.tonnage; if(rem<=0) break; }
      if(rem<=0) break;
    }
    if(names.length===0) names.push('Interceptor');
    out.push({ sector: s, tonnage: spec.enemyTonnage, tierCap: spec.enemyTierCap, boss: spec.boss, example: names });
  }
  PREVIEWS_CACHE = out;
  return PREVIEWS_CACHE;
}
import { SECTORS } from '../game'

export function NewRunModal({ onNewRun }:{ onNewRun:(diff:'easy'|'medium'|'hard')=>void }){
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
        <div className="text-lg font-semibold">Start New Run</div>
        <div className="text-sm opacity-80 mt-1">Choose difficulty. Easy/Medium grant a grace respawn after a wipe; Hard is a full reset.</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button className="px-3 py-2 rounded-xl bg-emerald-700" onClick={()=>onNewRun('easy')}>Easy (3✈)</button>
          <button className="px-3 py-2 rounded-xl bg-amber-700" onClick={()=>onNewRun('medium')}>Medium (2✈)</button>
          <button className="px-3 py-2 rounded-xl bg-rose-700" onClick={()=>onNewRun('hard')}>Hard (1✈)</button>
        </div>
      </div>
    </div>
  );
}

export function RulesModal({ onDismiss }:{ onDismiss:()=>void }){
  const previews = initPreviews();
  const buildMat = ECONOMY.buildInterceptor.materials;
  const buildCred = ECONOMY.buildInterceptor.credits;
  const dockMat = ECONOMY.dockUpgrade.materials;
  const dockCred = ECONOMY.dockUpgrade.credits;
  const dockDelta = ECONOMY.dockUpgrade.capacityDelta;
  const rrBase = ECONOMY.reroll.base;
  const rrInc = ECONOMY.reroll.increment;
  const c12 = nextTierCost(1);
  const c23 = nextTierCost(2);
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/60">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-xl">
        <div className="text-lg font-semibold mb-2">How to Play</div>
        <div className="text-sm space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <b>Objective.</b> Build a small fleet, win battles, and clear sectors up to 10. If every ship is destroyed, the run ends (on Easy/Medium you get a grace respawn once).
          </div>
          <div>
            <b>The Loop.</b> You alternate between the <i>Outpost</i> and <i>Combat</i>:
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>At the Outpost you buy parts, research, build or upgrade ships.</li>
              <li>In Combat your fleet fights automatically by initiative; you choose when to step/auto.</li>
              <li>Victory pays credits/materials/science; tougher sectors pay more and unlock new challenges.</li>
            </ul>
          </div>
          <div>
            <b>Fleet & Blueprints.</b> Parts are installed per <i>class</i> (Interceptor, Cruiser, Dreadnought). Installing a part on a class applies to all ships of that class. Each ship must have a <i>Source</i> (⚡ producer) and a <i>Drive</i>; stay within power limits.
          </div>
          <div>
            <b>Getting More Ships.</b> Build an Interceptor at the Outpost for {buildMat}🧱 + {buildCred}¢. Dock capacity limits how many total tons you can field. Expand docks by +{dockDelta} capacity for {dockMat}🧱 + {dockCred}¢ (up to the cap).
          </div>
          <div>
            <b>Advancing the Tech Tree.</b> Research has three tracks (Military, Grid, Nano). Each track starts at 1 and can reach 3. Going 1→2 costs {c12?.c}¢ + {c12?.s}🔬; 2→3 costs {c23?.c}¢ + {c23?.s}🔬. Research improves the shop inventory and unlocks ship upgrades.
          </div>
          <div>
            <b>Upgrading Ship Classes.</b> With enough Military research you can upgrade a class to the next hull: Interceptor → Cruiser (Military ≥ 2), Cruiser → Dreadnought (Military ≥ 3). Upgrades change stats like hull, tiles, and power limits, and open stronger parts for that class.
          </div>
          <div>
            <b>Shop & Rerolls.</b> You start with a shop inventory and can reroll it for {rrBase}¢. Each reroll or research increases the next reroll cost by +{rrInc}. Selling any part refunds 25% of its price.
          </div>
          <div>
            <b>Combat Basics.</b> Initiative is driven by your ship’s engines; ships act from highest to lowest. Weapons roll dice to hit; 1s miss and 6s hit. Enemies tend to focus targets with the lowest hull. Keep your fleet powered and within tile limits to deploy.
          </div>
          <div>
            <b>Sector Plan.</b> Each sector has a fixed enemy tonnage and tech tier cap. You can preview all sectors in the Combat Plan.
          </div>
          <div>
            <b>Progression & Examples.</b> Below are snapshots for upcoming milestones — a typical enemy tonnage and a plausible fleet mix.
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {previews.map(p=> (
                <div key={p.sector} className="p-2 rounded-lg border border-zinc-700 bg-zinc-900">
                  <div className="font-medium">Sector {p.sector} {p.boss? '(Boss)':''}</div>
                  <div className="text-xs opacity-80">Enemy tonnage {p.tonnage} • Tier cap T{p.tierCap}</div>
                  <div className="text-xs mt-1">
                    <div className="opacity-70">Example fleet:</div>
                    <div>{p.example.join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3"><button onClick={onDismiss} className="w-full px-4 py-2 rounded-xl bg-emerald-600">Let’s go</button></div>
      </div>
    </div>
  );
}

export function CombatPlanModal({ onClose }:{ onClose:()=>void }){
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
        <div className="text-lg font-semibold mb-2">Combat Plan</div>
        <div className="text-xs sm:text-sm space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {SECTORS.map(s=> (
            <div key={s.sector} className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>Sector {s.sector}{s.boss? ' (Boss)':''}</div>
              <div className="opacity-80">Enemy tonnage {s.enemyTonnage} • Tier cap T{s.enemyTierCap}</div>
            </div>
          ))}
        </div>
        <div className="mt-3"><button onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-emerald-600">Close</button></div>
      </div>
    </div>
  );
}


