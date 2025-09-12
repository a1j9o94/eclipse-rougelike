import { useEffect, useMemo, useState } from 'react';
import { FACTIONS, type FactionId } from '../../shared/factions';
import { type DifficultyId } from '../../shared/types';
import { getStartingShipCount } from '../../shared/difficulty';
import { loadRunState, evaluateUnlocks } from '../game/storage';
import { playEffect } from '../game/sound';
import Starfield from '../components/Starfield';
import SettingsModal from '../components/SettingsModal';
import { isEnabled as tutorialIsEnabled } from '../tutorial/state';

export default function StartPage({
  onNewRun,
  onStartTutorial,
  onContinue,
  onMultiplayer,
  initialShowLaunch,
  initialLaunchTab,
}: {
  onNewRun: (diff: DifficultyId, faction: FactionId) => void;
  onStartTutorial?: () => void;
  onContinue?: () => void;
  onMultiplayer?: (mode?: 'menu' | 'create' | 'join' | 'public') => void;
  initialShowLaunch?: boolean;
  initialLaunchTab?: 'continue'|'solo'|'versus';
}) {
  const [, forceProgressRefresh] = useState(0);
  const progress = evaluateUnlocks(loadRunState());
  const available = FACTIONS.filter(f => progress.factions[f.id]?.unlocked);
  const [faction, setFaction] = useState<FactionId>(available[0]?.id || 'industrialists');
  const [tutorialEligible, setTutorialEligible] = useState<boolean>(() => tutorialIsEnabled());
  const shipCounts = useMemo(() => ({
    easy: getStartingShipCount('easy'),
    medium: getStartingShipCount('medium'),
    hard: getStartingShipCount('hard'),
  }), []);
  const wins = progress.factions[faction]?.difficulties || [];
  const canMedium = wins.includes('easy');
  const canHard = wins.includes('medium');
  const save = loadRunState();

  const [showLaunch, setShowLaunch] = useState(Boolean(initialShowLaunch));
  const [launchTab, setLaunchTab] = useState<'continue'|'solo'|'versus'>(
    initialLaunchTab ?? (save ? 'continue' : 'solo')
  );
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soloDiff, setSoloDiff] = useState<DifficultyId>('easy');

  // Starfield settings (persisted)
  const [starEnabled, setStarEnabled] = useState(true);
  const [starDensity, setStarDensity] = useState<'low'|'medium'|'high'>('medium');
  const [userReducedMotion, setUserReducedMotion] = useState(false);

  // Load persisted UI prefs once
  useMemo(() => {
    try {
      const en = localStorage.getItem('ui-starfield-enabled');
      const den = localStorage.getItem('ui-starfield-density');
      const rm = localStorage.getItem('ui-reduced-motion');
      if (en != null) setStarEnabled(en === 'true');
      if (den === 'low' || den === 'medium' || den === 'high') setStarDensity(den);
      if (rm != null) setUserReducedMotion(rm === 'true');
    } catch { void 0 }
  }, []);

  // React to tutorial setting changes from SettingsModal
  useEffect(() => {
    const onTutChanged = () => {
      try { setTutorialEligible(tutorialIsEnabled()) } catch { /* noop */ }
    }
    const onTutActivated = () => {
      // Bring up Launch and switch to Solo so the Tutorial card is visible immediately
      setShowLaunch(true)
      setLaunchTab('solo')
    }
    window.addEventListener('tutorial-changed', onTutChanged as EventListener)
    window.addEventListener('tutorial-activated', onTutActivated as EventListener)
    return () => {
      window.removeEventListener('tutorial-changed', onTutChanged as EventListener)
      window.removeEventListener('tutorial-activated', onTutActivated as EventListener)
    }
  }, [])

  // Apply reduced motion toggle to <html> dataset
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.userReducedMotion = userReducedMotion ? 'true' : 'false';
  }

  const versusEnabled = Boolean(import.meta.env.VITE_CONVEX_URL) && Boolean(onMultiplayer);

  return (
    <div className="relative h-screen overflow-hidden bg-black text-zinc-100 p-4 flex flex-col">
      {starEnabled && (
        <Starfield enabled={starEnabled} density={starDensity} reducedMotion={userReducedMotion} />
      )}
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 relative z-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-10">
          <button aria-label="Settings" onClick={()=>setShowSettings(true)} className="px-3 py-2 rounded-full bg-white/5 border border-white/10">⚙</button>
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

        {/* Primary CTA */}
        <div className="mt-3 space-y-2 pb-4">
          <button
            className="w-full px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500"
            onClick={()=>{ setShowLaunch(true); setLaunchTab(save ? 'continue' : 'solo'); }}
          >
            Launch
          </button>
        </div>

        {/* Launch Sheet */}
        {showLaunch && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <button aria-label="Close" onClick={()=>setShowLaunch(false)} className="absolute inset-0 bg-black/50" />
            <div className="relative w-full max-w-md mx-auto bg-zinc-950 border border-white/10 rounded-t-2xl md:rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {save && (
                  <button
                    className={`px-3 py-2 rounded-full ${launchTab==='continue' ? 'bg-emerald-600' : 'bg-white/5 border border-white/10'}`}
                    onClick={()=>setLaunchTab('continue')}
                  >Continue</button>
                )}
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

              {launchTab==='continue' ? (
                <div>
                  <button
                    className="w-full px-3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10"
                    onClick={()=>{ if (onContinue) { onContinue(); } setShowLaunch(false); }}
                  >
                    Continue Run
                  </button>
                </div>
              ) : launchTab==='solo' ? (
                <div>
                  {tutorialEligible && onStartTutorial ? (
                    <div>
                      <div className="text-sm opacity-80 mb-2">New? Start with a short guided tutorial.</div>
                      <div className="mt-2 text-sm opacity-80">Faction: <span className="font-medium">{FACTIONS.find(f=>f.id==='industrialists')?.name}</span></div>
                      <div className="mt-3">
                        <button className="w-full px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500" onClick={()=>{ onStartTutorial(); setShowLaunch(false); }}>
                          Start Tutorial
                        </button>
                      </div>
                      <div className="mt-3 text-xs opacity-70">You can unlock standard modes after the tutorial (or reset from Settings).</div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {!versusEnabled && (
                    <div className="text-xs opacity-80 mb-2">Requires server connection.</div>
                  )}
                  {versusEnabled && (
                    <>
                      <button
                        className="w-full px-3 py-3 rounded-xl bg-sky-600 hover:bg-sky-500"
                        onClick={()=>{ if (onMultiplayer) { onMultiplayer('create'); } setShowLaunch(false); }}
                      >
                        Create Game
                      </button>
                      <button
                        className="w-full px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500"
                        onClick={()=>{ if (onMultiplayer) { onMultiplayer('join'); } setShowLaunch(false); }}
                      >
                        Join Match
                      </button>
                      <button
                        className="w-full px-3 py-3 rounded-xl bg-purple-600 hover:bg-purple-500"
                        onClick={()=>{ if (onMultiplayer) { onMultiplayer('public'); } setShowLaunch(false); }}
                      >
                        View Public Matches
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Battle Log Modal */}
        {showLog && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button aria-label="Close" onClick={()=>setShowLog(false)} className="absolute inset-0 bg-black/50" />
            <div className="relative w-full max-w-md mx-auto bg-zinc-950 border border-white/10 rounded-2xl p-4 max-h-[80vh] flex flex-col">
              <button aria-label="Close Battle Log" onClick={()=>setShowLog(false)} className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-200">✕</button>
              <div className="text-lg font-semibold mb-2">Battle Log</div>
              <ul className="flex-1 overflow-y-auto pr-2 text-sm font-mono space-y-2">
                {progress.log.length===0 && <li className="text-zinc-400">No battles yet.</li>}
                {progress.log.map((l,i)=>(<li key={i} className="border-l-2 border-emerald-600 pl-2">{l}</li>))}
              </ul>
              <div className="mt-3 text-right"><button className="px-3 py-2 rounded-xl bg-zinc-800" onClick={()=>setShowLog(false)}>Close</button></div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            starEnabled={starEnabled}
            setStarEnabled={setStarEnabled}
            starDensity={starDensity}
            setStarDensity={setStarDensity}
            userReducedMotion={userReducedMotion}
            setUserReducedMotion={setUserReducedMotion}
            onClose={() => setShowSettings(false)}
            onCheatApplied={() => forceProgressRefresh(v => v + 1)}
          />
        )}
      </div>
    </div>
  );
}
