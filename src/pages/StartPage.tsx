import { useState } from 'react';
import { FACTIONS, type FactionId } from '../config/factions';
import { type DifficultyId } from '../config/types';
import { getStartingShipCount } from '../config/difficulty';
import { loadRunState, evaluateUnlocks, type Progress } from '../game/storage';

export default function StartPage({ onNewRun, onContinue }: { onNewRun: (diff: DifficultyId, faction: FactionId) => void; onContinue?: () => void }) {
  const progress: Progress = evaluateUnlocks(loadRunState());
  const available = FACTIONS.filter(f => progress.factions[f.id]?.unlocked);
  const [faction, setFaction] = useState<FactionId>(available[0]?.id || 'industrialists');
  const easyShips = getStartingShipCount('easy');
  const mediumShips = getStartingShipCount('medium');
  const hardShips = getStartingShipCount('hard');
  const wins = progress.factions[faction]?.difficulties || [];
  const canMedium = wins.includes('easy');
  const canHard = wins.includes('medium');
  const save = loadRunState();
  return (
    <div className="h-screen overflow-y-auto bg-zinc-950 text-zinc-100 p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1">
        <div className="text-lg font-semibold">Start New Run</div>
        <div className="text-sm opacity-80 mt-1">Choose a faction and difficulty. Easy/Medium grant a grace respawn after a wipe; Hard is a full reset.</div>
        {save && (
          <button className="mt-2 px-3 py-2 rounded-xl bg-zinc-700" onClick={onContinue}>Continue Run</button>
        )}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2" data-testid="faction-list">
          {available.map(f => (
            <button
              key={f.id}
              data-testid="faction-option"
              onClick={() => setFaction(f.id)}
              className={`text-left px-3 py-2 rounded-xl border ${faction===f.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-zinc-700 bg-zinc-900'}`}
            >
              <div className="font-medium">{f.name}</div>
              <div className="text-xs opacity-80">{f.description}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pb-4">
          <button className="px-3 py-2 rounded-xl bg-emerald-700" onClick={() => onNewRun('easy', faction)}>Easy ({easyShips}✈)</button>
          <button disabled={!canMedium} className={`px-3 py-2 rounded-xl ${canMedium ? 'bg-amber-700' : 'bg-zinc-700 opacity-50'}`} onClick={() => canMedium && onNewRun('medium', faction)}>Medium ({mediumShips}✈)</button>
          <button disabled={!canHard} className={`px-3 py-2 rounded-xl ${canHard ? 'bg-rose-700' : 'bg-zinc-700 opacity-50'}`} onClick={() => canHard && onNewRun('hard', faction)}>Hard ({hardShips}✈)</button>
        </div>
        <div>
          <div className="text-lg font-semibold">Battle Log</div>
          <ul className="text-sm mt-2 space-y-1">
            {progress.log.length===0 && <li>No battles yet.</li>}
            {progress.log.map((l,i)=>(<li key={i}>{l}</li>))}
          </ul>
        </div>
      </div>
    </div>
  );
}
