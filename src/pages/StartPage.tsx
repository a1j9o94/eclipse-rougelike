import { useMemo, useState } from 'react';
import { FACTIONS, type FactionId } from '../../shared/factions';
import { type DifficultyId } from '../../shared/types';
import { getStartingShipCount } from '../../shared/difficulty';
import { loadRunState, evaluateUnlocks, type Progress } from '../game/storage';
import { playEffect } from '../game/sound';

export default function StartPage({
  onNewRun,
  onContinue,
  onMultiplayer,
}: {
  onNewRun: (diff: DifficultyId, faction: FactionId) => void;
  onContinue?: () => void;
  onMultiplayer?: () => void;
}) {
  const progress: Progress = evaluateUnlocks(loadRunState());
  const available = FACTIONS.filter(f => progress.factions[f.id]?.unlocked);
  const [faction, setFaction] = useState<FactionId>(available[0]?.id || 'industrialists');
  const shipCounts = useMemo(() => ({
    easy: getStartingShipCount('easy'),
    medium: getStartingShipCount('medium'),
    hard: getStartingShipCount('hard'),
  }), []);
  const wins = progress.factions[faction]?.difficulties || [];
  const canMedium = wins.includes('easy');
  const canHard = wins.includes('medium');
  const save = loadRunState();

  const [showLaunch, setShowLaunch] = useState(false);
  const [launchTab, setLaunchTab] = useState<'solo'|'versus'>('solo');
  const [showLog, setShowLog] = useState(false);
  const [soloDiff, setSoloDiff] = useState<DifficultyId>('easy');

  const versusEnabled = Boolean(import.meta.env.VITE_CONVEX_URL) && Boolean(onMultiplayer);

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950 to-black text-zinc-100 p-4 flex flex-col">
      <div className="w-full max-w-md mx-auto flex flex-col flex-1">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-10">
          <button aria-label="Settings" className="px-3 py-2 rounded-full bg-white/5 border border-white/10">⚙</button>
          <div />
          <button aria-label="Open Battle Log" onClick={()=>setShowLog(true)} className="px-3 py-2 rounded-full bg-white/5 border border-white/10">📜</button>
        </div>

        {/* Hangar / Faction */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2" data-testid="faction-list">
          {available.map(f => (
            <button
              key={f.id}
              data-testid="faction-option"
              onClick={() => { setFaction(f.id); void playEffect('faction'); }}
              className={`text-left px-3 py-3 rounded-xl border bg-white/5 backdrop-blur-md ${faction===f.id ? 'border-emerald-500/70' : 'border-white/10'}`}
            >
              <div className="font-medium">{f.name}</div>
              <div className="text-xs opacity-80">{f.description}</div>
            </button>
          ))}
        </div>

        {/* Primary CTAs */}
        <div className="mt-3 space-y-2 pb-4">
          {save && (
            <button className="w-full px-3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10" onClick={onContinue}>
              Continue
            </button>
          )}
          <button className="w-full px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500" onClick={()=>{ setShowLaunch(true); setLaunchTab('solo'); }}>
            Launch
          </button>
        </div>

        {/* Launch Sheet */}
        {showLaunch && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <button aria-label="Close" onClick={()=>setShowLaunch(false)} className="absolute inset-0 bg-black/50" />
            <div className="relative w-full max-w-md mx-auto bg-zinc-950 border border-white/10 rounded-t-2xl md:rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <button
                  className={`px-3 py-2 rounded-full ${launchTab==='solo' ? 'bg-emerald-600' : 'bg-white/5 border border-white/10'}`}
                  onClick={()=>setLaunchTab('solo')}
                >Solo</button>
                <button
                  className={`px-3 py-2 rounded-full ${launchTab==='versus' ? 'bg-sky-600' : 'bg-white/5 border border-white/10'} ${!versusEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={()=>versusEnabled && setLaunchTab('versus')}
                  disabled={!versusEnabled}
                >Versus</button>
              </div>

              {launchTab==='solo' ? (
                <div>
                  <div className="text-xs opacity-80 mb-2">Easy/Medium: one grace respawn. Hard: full reset.</div>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Difficulty">
                    <button
                      aria-pressed={soloDiff==='easy'}
                      className={`px-3 py-2 rounded-xl ${soloDiff==='easy' ? 'bg-emerald-700' : 'bg-zinc-800'}`}
                      onClick={()=>setSoloDiff('easy')}
                    >Easy ({shipCounts.easy}✈)</button>
                    <button
                      disabled={!canMedium}
                      aria-pressed={soloDiff==='medium'}
                      className={`px-3 py-2 rounded-xl ${canMedium ? (soloDiff==='medium' ? 'bg-amber-700' : 'bg-zinc-800') : 'bg-zinc-800 opacity-50'}`}
                      onClick={()=>canMedium && setSoloDiff('medium')}
                    >Medium ({shipCounts.medium}✈)</button>
                    <button
                      disabled={!canHard}
                      aria-pressed={soloDiff==='hard'}
                      className={`px-3 py-2 rounded-xl ${canHard ? (soloDiff==='hard' ? 'bg-rose-700' : 'bg-zinc-800') : 'bg-zinc-800 opacity-50'}`}
                      onClick={()=>canHard && setSoloDiff('hard')}
                    >Hard ({shipCounts.hard}✈)</button>
                  </div>
                  <div className="mt-3 text-sm opacity-80">Faction: <span className="font-medium">{FACTIONS.find(f=>f.id===faction)?.name}</span></div>
                  <div className="mt-3">
                    <button className="w-full px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500" onClick={()=>{ onNewRun(soloDiff, faction); setShowLaunch(false); }}>
                      Launch
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {!versusEnabled && (
                    <div className="text-xs opacity-80 mb-2">Requires server connection.</div>
                  )}
                  {versusEnabled && (
                    <button className="w-full px-3 py-3 rounded-xl bg-sky-600 hover:bg-sky-500" onClick={()=>{ if (onMultiplayer) { onMultiplayer(); } setShowLaunch(false); }}>
                      Find Match
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Battle Log Modal */}
        {showLog && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
            <button aria-label="Close" onClick={()=>setShowLog(false)} className="absolute inset-0 bg-black/50" />
            <div className="relative w-full max-w-md mx-auto bg-zinc-950 border border-white/10 rounded-2xl p-4">
              <div className="text-lg font-semibold">Battle Log</div>
              <ul className="text-sm mt-2 space-y-1">
                {progress.log.length===0 && <li>No battles yet.</li>}
                {progress.log.map((l,i)=>(<li key={i}>{l}</li>))}
              </ul>
              <div className="mt-3"><button className="px-3 py-2 rounded-xl bg-zinc-800" onClick={()=>setShowLog(false)}>Close</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
