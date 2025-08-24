// React import not required with modern JSX transform

export function PowerBadge({use, prod}:{use:number, prod:number}){ const ok = use<=prod; return <span className={`text-[10px] px-2 py-0.5 rounded ${ok?'bg-emerald-600/30 text-emerald-200':'bg-rose-600/30 text-rose-100'}`}>⚡ {use}/{prod}</span>; }
export function HullPips({ current, max }:{current:number, max:number}){ const arr = Array.from({length: max}); return (<div className="flex gap-0.5 mt-1">{arr.map((_,i)=>(<span key={i} className={`w-2 h-2 rounded ${i<current? 'bg-emerald-400':'bg-zinc-700'}`} />))}</div>); }
export function CompactShip({ ship, side, active }:{ship:any, side:'P'|'E', active:boolean}){
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
export function ItemCard({ item, canAfford, onBuy, ghostDelta }:{item:any, canAfford:boolean, onBuy:()=>void, ghostDelta:any}){
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
export function ResourceBar({ credits, materials, science, tonnage, sector, onReset }:{credits:number, materials:number, science:number, tonnage:{used:number,cap:number}, sector:number, onReset:()=>void}){
  const used = tonnage.used, cap = tonnage.cap;
  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 p-3 grid grid-cols-3 gap-2 text-sm">
      <div className="px-3 py-2 rounded-lg bg-zinc-900">💰 <b>{credits}</b> • 🧱 <b>{materials}</b> • 🔬 <b>{science}</b></div>
      <div className={`px-3 py-2 rounded-lg ${used<=cap?'bg-emerald-950/50 text-emerald-200':'bg-rose-950/50 text-rose-200'}`}>⚓ <b>{used}</b> / <b>{cap}</b></div>
      <div className="px-3 py-2 rounded-lg bg-zinc-900 flex items-center justify-between">🗺️ Sector <b>{sector}</b> <button onClick={onReset} className="ml-2 px-2 py-1 rounded bg-zinc-800 text-xs">Reset</button></div>
    </div>
  );
}


