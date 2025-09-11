import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress } from '../game/storage';
import { applyCheatCode } from '../game/cheats';

describe('cheat codes', () => {
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

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('eclipse-progress', JSON.stringify(seeded));
  });

  it('unlocks raiders via forplunder', () => {
    expect(loadProgress().factions.raiders.unlocked).toBe(false);
    applyCheatCode('forplunder');
    expect(loadProgress().factions.raiders.unlocked).toBe(true);
  });

  it('unlocks hard difficulty for existing factions with truechallenge', () => {
    applyCheatCode('truechallenge');
    const prog = loadProgress();
    expect(prog.factions.industrialists.difficulties).toContain('medium');
    expect(prog.factions.scientists.difficulties).toEqual([]);
  });

  it('unlocks all factions with mercenary', () => {
    applyCheatCode('mercenary');
    const prog = loadProgress();
    for (const f of Object.values(prog.factions)) {
      expect(f.unlocked).toBe(true);
    }
  });
});
