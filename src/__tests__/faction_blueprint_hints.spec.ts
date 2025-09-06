import { describe, it, expect } from 'vitest';
import { ALL_PARTS } from '../config/parts';

describe('Faction blueprint hints map to known parts', () => {
  const ids = ['tachyon_source','tachyon_drive','antimatter','positron','disruptor','auto_repair'];
  it('all hint ids exist in ALL_PARTS', () => {
    ids.forEach(id => {
      const part = (ALL_PARTS as any[]).find(p => p.id === id);
      expect(part, `Missing part for id ${id}`).toBeTruthy();
    });
  });
});

