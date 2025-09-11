import { loadProgress, saveProgress, type Progress } from './storage';

export type CheatHandler = (p: Progress) => void;

const CHEATS: Record<string, CheatHandler> = {
  mercenary: (p) => {
    for (const f of Object.values(p.factions)) {
      f.unlocked = true;
    }
  },
  forscience: (p) => {
    p.factions.scientists.unlocked = true;
  },
  forglory: (p) => {
    p.factions.warmongers.unlocked = true;
  },
  forprofit: (p) => {
    p.factions.industrialists.unlocked = true;
  },
  forplunder: (p) => {
    p.factions.raiders.unlocked = true;
  },
  fortime: (p) => {
    p.factions.timekeepers.unlocked = true;
  },
  forswarm: (p) => {
    p.factions.collective.unlocked = true;
  },
  truechallenge: (p) => {
    for (const f of Object.values(p.factions)) {
      if (f.unlocked) {
        if (!f.difficulties.includes('easy')) f.difficulties.push('easy');
        if (!f.difficulties.includes('medium')) f.difficulties.push('medium');
      }
    }
  },
};

export function applyCheatCode(code: string): boolean {
  const action = CHEATS[code.toLowerCase()];
  if (!action) return false;
  const prog = loadProgress();
  action(prog);
  saveProgress(prog);
  return true;
}
