// React import not required with modern JSX transform
import { CompactShip } from '../components/ui'
import { type Ship, type InitiativeEntry } from '../config/types'

export function CombatPage({
  combatOver,
  outcome,
  roundNum,
  queue,
  turnPtr,
  fleet,
  enemyFleet,
  log,
  stepTurn,
  initRoundIfNeeded,
  auto,
  setAuto,
  onReturn,
  stepLock,
}:{
  combatOver:boolean,
  outcome:string,
  roundNum:number,
  queue:InitiativeEntry[],
  turnPtr:number,
  fleet:Ship[],
  enemyFleet:Ship[],
  log:string[],
  stepTurn:()=>Promise<void>,
  initRoundIfNeeded:()=>boolean,
  auto:boolean,
  setAuto:(f:(a:boolean)=>boolean)=>void,
  onReturn:()=>void,
  stepLock:boolean,
}){
  return (
    <div className="p-3 mx-auto max-w-5xl">
      {combatOver && (
        <div className={`mb-2 p-3 rounded-lg text-sm sm:text-base ${outcome.startsWith('Victory') ? 'bg-emerald-900/40 text-emerald-200' : 'bg-rose-900/40 text-rose-200'}`}>
          {outcome}
        </div>
      )}
      {/* Enemy row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Enemy</div>
        <div className="text-xs sm:text-sm opacity-70">
          Round {roundNum}{queue[turnPtr]? ` • Next: ${(queue[turnPtr].side==='P'?'P':'E')} ${queue[turnPtr].side==='P'?fleet[queue[turnPtr].idx]?.frame.name:enemyFleet[queue[turnPtr].idx]?.frame.name}`: ''}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {enemyFleet.map((s,i)=> (
          <CompactShip key={'e'+i} ship={s} side='E' active={!combatOver && queue[turnPtr]?.side==='E' && queue[turnPtr]?.idx===i} />
        ))}
      </div>
      {/* Player row */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <div className="text-sm font-semibold">Player</div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {fleet.map((s,i)=> (
          <CompactShip key={'p'+i} ship={s} side='P' active={!combatOver && queue[turnPtr]?.side==='P' && queue[turnPtr]?.idx===i} />
        ))}
      </div>
      {/* Mini Log */}
      <div className="mt-3 p-2 rounded bg-zinc-900 text-xs sm:text-sm min-h-[56px]">
        {log.slice(-5).map((ln,i)=>(<div key={i} className={i===log.length-1? 'font-medium' : 'opacity-80'}>{ln}</div>))}
      </div>
      {/* Controls */}
      <div className="sticky bottom-0 z-10 mt-3 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
        <div className="mx-auto max-w-5xl flex items-center gap-2">
          <button disabled={combatOver || stepLock} onClick={()=> { if (!initRoundIfNeeded()) stepTurn(); }} className={`flex-1 px-4 py-3 rounded-xl ${(combatOver||stepLock)? 'bg-zinc-700 opacity-60':'bg-sky-600 hover:bg-sky-500'}`}>▶ Step</button>
          <button disabled={combatOver} onClick={()=> setAuto(a=>!a)} className={`px-4 py-3 rounded-xl ${auto && !combatOver? 'bg-emerald-700':'bg-zinc-800'}`}>{auto? '⏸ Auto' : '⏩ Auto'}</button>
          <button onClick={onReturn} className="px-4 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700">Return to Outpost</button>
        </div>
      </div>
    </div>
  )
}

export default CombatPage


