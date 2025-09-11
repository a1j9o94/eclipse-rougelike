// Tutorial state management (localStorage-backed, SP-only)
export type TutorialStepId =
  | 'intro-combat'
  | 'outpost-ship'
  | 'outpost-blueprint'
  | 'shop-buy-composite'
  | 'combat-2'
  | 'dock-expand'
  | 'tech-nano'
  | 'tech-open'
  | 'tech-close'
  | 'sell-composite'
  | 'buy-improved'
  | 'tech-military'
  | 'capacity-info'
  | 'combat-3'
  | 'upgrade-interceptor'
  | 'shop-reroll'
  | 'intel-open'
  | 'intel-close'
  | 'rules-hint'
  | 'wrap';

type TutorialState = {
  enabled: boolean;
  completed: boolean;
  step: TutorialStepId;
};

const KEY = 'eclipse-tutorial-v1';
const DEFAULT_STATE: TutorialState = { enabled: false, completed: false, step: 'intro-combat' };

function read(): TutorialState {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<TutorialState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function write(st: TutorialState) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
    try { window.dispatchEvent(new Event('tutorial-changed')) } catch { /* noop */ }
  } catch {/* noop */}
}

export function isEnabled(): boolean { return read().enabled && !read().completed }
export function enable(): void { const st = read(); write({ ...st, enabled: true }); }
export function disable(): void { const st = read(); write({ ...st, enabled: false }); }
export function reset(): void { write({ ...DEFAULT_STATE }); }
export function complete(): void { const st = read(); write({ ...st, completed: true }); }
export function getStep(): TutorialStepId { return read().step }
export function setStep(step: TutorialStepId): void { const st = read(); write({ ...st, step }); }
export function hasCompleted(): boolean { return read().completed === true }

// Event ingress; mapping to step advancement will be implemented incrementally.
import { nextAfter } from './script'

export function event(name: string): void {
  const st = read()
  if (!st.enabled || st.completed) return
  const next = nextAfter(st.step, name)
  if (next !== st.step) write({ ...st, step: next })
  if (next === 'wrap') write({ ...st, step: 'wrap', completed: true, enabled: false })
}
