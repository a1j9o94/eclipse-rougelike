import { type DifficultyId } from '../config/types';
import { type FactionId, FACTIONS } from '../config/factions';
import { type ResearchState as Research, type CapacityState, type ResourcesState } from '../config/types';
import { type FrameId } from '../config/frames';
import { type Part } from '../config/parts';
import { type Ship } from '../config/types';
import { getFaction } from '../config/factions';
import { setEconomyModifiers } from './economy';
import { setRareTechChance } from './shop';
import { setPlayerFaction, setOpponentFaction } from './setup';
declare const process: any;

export type ProgressFaction = { unlocked: boolean; difficulties: DifficultyId[] };
export type Progress = {
  factions: Record<FactionId, ProgressFaction>;
  log: string[];
};

const BASE_PROGRESS: Progress = {
  factions: {
    scientists: { unlocked: false, difficulties: [] },
    warmongers: { unlocked: false, difficulties: [] },
    industrialists: { unlocked: true, difficulties: [] },
    raiders: { unlocked: false, difficulties: [] },
    timekeepers: { unlocked: false, difficulties: [] },
    collective: { unlocked: false, difficulties: [] },
  },
  log: [],
};

export const DEFAULT_PROGRESS: Progress = (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')
  ? {
      factions: {
        scientists: { unlocked: true, difficulties: [] },
        warmongers: { unlocked: true, difficulties: [] },
        industrialists: { unlocked: true, difficulties: [] },
        raiders: { unlocked: true, difficulties: [] },
        timekeepers: { unlocked: true, difficulties: [] },
        collective: { unlocked: true, difficulties: [] },
      },
      log: [],
    }
  : BASE_PROGRESS;

const PROG_KEY = 'eclipse-progress';
const RUN_KEY = 'eclipse-run';

export function loadProgress(): Progress {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = localStorage.getItem(PROG_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Progress;
    return { ...DEFAULT_PROGRESS, ...parsed, factions: { ...DEFAULT_PROGRESS.factions, ...parsed.factions } };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(p: Progress) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PROG_KEY, JSON.stringify(p));
}

export type SavedRun = {
  difficulty: DifficultyId;
  faction: FactionId;
  opponent: FactionId;
  resources: ResourcesState;
  research: Research;
  rerollCost: number;
  baseRerollCost: number;
  capacity: CapacityState;
  sector: number;
  blueprints: Record<FrameId, Part[]>;
  fleet: Ship[];
  shop: { items: Part[] };
  graceUsed: boolean;
};

type PartialRun = Partial<SavedRun>;

const EMPTY_RESEARCH: Research = { Military: 1, Grid: 1, Nano: 1 };

export function evaluateUnlocks(run: PartialRun | null, victory = false): Progress {
  const prog = loadProgress();
  const ctx = { research: run?.research || EMPTY_RESEARCH, fleet: run?.fleet || [], victory };
  for (const f of FACTIONS) {
    const pf = prog.factions[f.id];
    if (!pf.unlocked && f.unlock && f.unlock(ctx)) {
      pf.unlocked = true;
      prog.log.push(`Unlocked ${f.id}`);
    }
  }
  saveProgress(prog);
  return prog;
}

export function saveRunState(st: SavedRun) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(RUN_KEY, JSON.stringify(st));
}

export function loadRunState(): SavedRun | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedRun;
  } catch {
    return null;
  }
}

export function clearRunState() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(RUN_KEY);
}

export function recordWin(fid: FactionId, diff: DifficultyId, research: Research, fleet: Ship[]) {
  const prog = loadProgress();
  const pf = prog.factions[fid];
  if (pf && !pf.difficulties.includes(diff)) {
    pf.difficulties.push(diff);
  }
  prog.log.push(`Won as ${fid} on ${diff}`);
  saveProgress(prog);
  evaluateUnlocks({ research, fleet }, true);
}

export function restoreRunEnvironment(fid: FactionId) {
  const f = getFaction(fid);
  const creditMult = f.config.economy.creditMultiplier ?? 1;
  const materialMult = f.config.economy.materialMultiplier ?? 1;
  setEconomyModifiers({ credits: creditMult, materials: materialMult });
  setRareTechChance(f.config.rareChance);
  setPlayerFaction(f.id);
}

export function restoreOpponent(fid: FactionId){
  setOpponentFaction(fid);
}
