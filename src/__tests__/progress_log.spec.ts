import { describe, it, expect, beforeEach } from 'vitest';
import { recordWin, evaluateUnlocks, loadProgress, DEFAULT_PROGRESS, type SavedRun } from '../game/storage';

// Tests for narrative progress log entries using full faction names

describe('progress log entries', () => {
  beforeEach(() => {
    localStorage.clear();
    DEFAULT_PROGRESS.log = [];
  });

  it('records victories with faction names and colorful text', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 };
    recordWin('industrialists', 'easy', research, []);
    const prog = loadProgress();
    const entry = prog.log[prog.log.length - 1];
    expect(entry).toMatch(/Helios Cartel/);
    expect(entry).toMatch(/Triumph|Victory/);
  });

  it('logs faction unlocks with full names', () => {
    const seeded = {
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
    localStorage.setItem('eclipse-progress', JSON.stringify(seeded));
    const run: Partial<SavedRun> = { research: { Military: 3, Grid: 3, Nano: 3 }, fleet: [] };
    evaluateUnlocks(run);
    const prog = loadProgress();
    expect(prog.log.some(l => /Consortium of Scholars/.test(l))).toBe(true);
  });
});
