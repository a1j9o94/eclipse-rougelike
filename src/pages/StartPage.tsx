import { useState } from 'react';
import { FACTIONS, type FactionId } from '../config/factions';
import { type DifficultyId } from '../config/types';
import { getStartingShipCount } from '../config/difficulty';

export default function StartPage({ onNewRun }: { onNewRun: (diff: DifficultyId, faction: FactionId) => void }) {
  const [faction, setFaction] = useState<FactionId>('scientists');
  const easyShips = getStartingShipCount('easy');
  const mediumShips = getStartingShipCount('medium');
  const hardShips = getStartingShipCount('hard');
  return (
    <div className="h-screen overflow-y-auto bg-zinc-950 text-zinc-100 p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1">
        <div className="text-lg font-semibold">Start New Run</div>
        <div className="text-sm opacity-80 mt-1">Choose a faction and difficulty. Easy/Medium grant a grace respawn after a wipe; Hard is a full reset.</div>
        <div className="mt-3 flex-1 overflow-y-auto space-y-2" data-testid="faction-list">
          {FACTIONS.map(f => (
            <button
              key={f.id}
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
          <button className="px-3 py-2 rounded-xl bg-amber-700" onClick={() => onNewRun('medium', faction)}>Medium ({mediumShips}✈)</button>
          <button className="px-3 py-2 rounded-xl bg-rose-700" onClick={() => onNewRun('hard', faction)}>Hard ({hardShips}✈)</button>
        </div>
      </div>
    </div>
  );
}
