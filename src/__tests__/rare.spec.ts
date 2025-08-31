import { describe, it, expect } from 'vitest';
import { rollInventory, setRareTechChance } from '../game';
import { RARE_PARTS } from '../config/parts';

describe('Rare tech generation', () => {
  it('rollInventory can produce rare parts when chance is high', () => {
    setRareTechChance(1);
    const items = rollInventory({ Military: 1, Grid: 1, Nano: 1 }, 2);
    const rareIds = RARE_PARTS.map(p => p.id);
    expect(items.every(it => rareIds.includes(it.id))).toBe(true);
    setRareTechChance(0.1);
  });
});

