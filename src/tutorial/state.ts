// Tutorial state management (localStorage-backed, SP-only)
export type TutorialStepId =
  | 'intro-combat'
  | 'outpost-ship'
  | 'outpost-blueprint'
  | 'shop-buy'
  | 'combat-2'
  | 'dock-expand'
  | 'tech-research'
  | 'frame-upgrade'
  | 'enemy-intel'
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
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {/* noop */}
}

export function isEnabled(): boolean { return read().enabled && !read().completed }
export function enable(): void { const st = read(); write({ ...st, enabled: true }); }
export function disable(): void { const st = read(); write({ ...st, enabled: false }); }
export function reset(): void { write({ ...DEFAULT_STATE }); }
export function complete(): void { const st = read(); write({ ...st, completed: true }); }
export function getStep(): TutorialStepId { return read().step }
export function setStep(step: TutorialStepId): void { const st = read(); write({ ...st, step }); }

// Event ingress; mapping to step advancement will be implemented incrementally.
export function event(name: string): void {
  // Placeholder: kept so callers can begin wiring without changing behavior.
  void name;
}
