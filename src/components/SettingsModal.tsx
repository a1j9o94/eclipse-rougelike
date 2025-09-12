import { useState } from 'react';
import { applyCheatCode } from '../game/cheats';
import { isEnabled as tutorialIsEnabled, enable as tutorialEnable, disable as tutorialDisable, reset as tutorialReset } from '../tutorial/state';

export default function SettingsModal({
  starEnabled,
  setStarEnabled,
  starDensity,
  setStarDensity,
  userReducedMotion,
  setUserReducedMotion,
  onClose,
  onCheatApplied,
}: {
  starEnabled: boolean;
  setStarEnabled: (v: boolean) => void;
  starDensity: 'low' | 'medium' | 'high';
  setStarDensity: (d: 'low' | 'medium' | 'high') => void;
  userReducedMotion: boolean;
  setUserReducedMotion: (v: boolean) => void;
  onClose: () => void;
  onCheatApplied: () => void;
}) {
  const [cheat, setCheat] = useState('');
  const [tutorialActive, setTutorialActive] = useState<boolean>(() => {
    try { return tutorialIsEnabled() } catch { return false }
  });

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-md mx-auto bg-zinc-950 border border-white/10 rounded-2xl p-4">
        <div className="text-lg font-semibold">Settings</div>
        <div className="mt-3 space-y-4 text-sm">
          {/* Tutorial Toggle */}
          <div className="flex items-center justify-between">
            <span>Tutorial</span>
            <button
              className={`px-3 py-1 rounded-full border ${tutorialActive ? 'bg-emerald-700 border-emerald-500' : 'bg-zinc-800 border-white/10'}`}
              onClick={() => {
                try {
                  if (tutorialActive) {
                    tutorialDisable();
                    setTutorialActive(false);
                  } else {
                    // Reactivate from the beginning
                    tutorialReset();
                    tutorialEnable();
                    setTutorialActive(true);
                    try { window.dispatchEvent(new Event('tutorial-activated')) } catch { /* noop */ }
                  }
                } catch { /* noop */ }
              }}
              aria-pressed={tutorialActive}
            >
              {tutorialActive ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>Starfield</span>
            <button
              className={`px-3 py-1 rounded-full border ${starEnabled ? 'bg-emerald-700 border-emerald-500' : 'bg-zinc-800 border-white/10'}`}
              onClick={() => {
                const v = !starEnabled;
                setStarEnabled(v);
                try {
                  localStorage.setItem('ui-starfield-enabled', String(v));
                  window.dispatchEvent(new Event('starfield-settings-changed'));
                } catch {
                  void 0;
                }
              }}
              aria-pressed={starEnabled}
            >
              {starEnabled ? 'On' : 'Off'}
            </button>
          </div>
          <div>
            <div className="mb-2">Star Density</div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((d) => (
                <button
                  key={d}
                  className={`px-3 py-2 rounded-xl border ${starDensity === d ? 'bg-white/10 border-emerald-500' : 'bg-zinc-900 border-white/10'}`}
                  aria-pressed={starDensity === d}
                  onClick={() => {
                    setStarDensity(d);
                    try {
                      localStorage.setItem('ui-starfield-density', d);
                      window.dispatchEvent(new Event('starfield-settings-changed'));
                    } catch {
                      void 0;
                    }
                  }}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Reduced Motion</span>
            <button
              className={`px-3 py-1 rounded-full border ${userReducedMotion ? 'bg-zinc-800 border-white/10' : 'bg-emerald-700 border-emerald-500'}`}
              onClick={() => {
                const v = !userReducedMotion;
                setUserReducedMotion(v);
                try {
                  localStorage.setItem('ui-reduced-motion', String(v));
                  window.dispatchEvent(new Event('starfield-settings-changed'));
                } catch {
                  void 0;
                }
              }}
              aria-pressed={userReducedMotion}
            >
              {userReducedMotion ? 'On' : 'Off'}
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (applyCheatCode(cheat.trim())) {
                onCheatApplied();
              }
              setCheat('');
            }}
          >
            <label htmlFor="cheat" className="block mb-2">
              Coded Signal
            </label>
            <div className="flex gap-2">
              <input
                id="cheat"
                value={cheat}
                onChange={(e) => setCheat(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10"
              />
              <button type="submit" className="px-3 py-2 rounded-xl bg-zinc-800">
                Send
              </button>
            </div>
          </form>
        </div>
        <div className="mt-4 text-right">
          <button className="px-3 py-2 rounded-xl bg-zinc-800" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
