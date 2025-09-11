// React import not required with modern JSX transform
import { type Ship, type InitiativeEntry } from '../../shared/types'
import { useEffect, useState } from 'react'
import { FleetRow } from '../components/FleetRow'
import FlyInOnMount from '../components/animations/FlyInOnMount'

export function CombatPage({
  combatOver,
  outcome,
  roundNum,
  queue,
  turnPtr,
  fleet,
  enemyFleet,
  log,
  onReturn,
  showRules,
}:{
  combatOver:boolean,
  outcome:string,
  roundNum:number,
  queue:InitiativeEntry[],
  turnPtr:number,
  fleet:Ship[],
  enemyFleet:Ship[],
  log:string[],
  onReturn:()=>void,
  showRules?: boolean,
}){
  const [resolvingHold, setResolvingHold] = useState(true);
  useEffect(() => { const t = setTimeout(() => setResolvingHold(false), 25); return () => clearTimeout(t); }, []);
  const [playIntro] = useState(true)
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
      <FlyInOnMount direction="top" play={playIntro && !showRules} delayMs={0} testId="flyin-top">
        <FleetRow
          ships={enemyFleet}
          side='E'
          activeIdx={!combatOver && queue[turnPtr]?.side==='E' ? queue[turnPtr].idx : -1}
          intro={{ play: !showRules, direction: 'top', totalMs: 3600, startDelayMs: 0 }}
        />
      </FlyInOnMount>
      {/* Player row */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <div className="text-sm font-semibold">Player</div>
      </div>
      <FlyInOnMount direction="bottom" play={playIntro && !showRules} delayMs={120} testId="flyin-bottom">
        <FleetRow
          ships={fleet}
          side='P'
          activeIdx={!combatOver && queue[turnPtr]?.side==='P' ? queue[turnPtr].idx : -1}
          intro={{ play: !showRules, direction: 'bottom', totalMs: 3600, startDelayMs: 200 }}
        />
      </FlyInOnMount>
      {/* Mini Log */}
      <div className="mt-3 p-2 rounded bg-zinc-900 text-xs sm:text-sm min-h-[56px]">
        {log.slice(-5).map((ln,i)=>(<div key={i} className={i===log.length-1? 'font-medium' : 'opacity-80'}>{ln}</div>))}
      </div>
      {/* Controls */}
      <div className="sticky bottom-0 z-10 mt-3 p-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
        <div className="mx-auto max-w-5xl">
          <button
            disabled={!combatOver || resolvingHold}
            onClick={onReturn}
            className={`w-full px-4 py-3 rounded-xl ${combatOver ? 'bg-emerald-800 hover:bg-emerald-700' : 'bg-zinc-700 opacity-60'}`}
          >
            <span className="sr-only">Return to Outpost</span>
            {(combatOver && !resolvingHold) ? 'Return to Outpost' : 'Resolving...'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CombatPage
