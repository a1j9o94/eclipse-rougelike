import { describe, it, expect } from 'vitest';
import type { Part } from '../../shared/parts';
import { seedFleetFromBlueprints } from '../multiplayer/blueprintHints';

describe('seedFleetFromBlueprints', () => {
  it('builds N ships of the requested frame using provided class blueprints', () => {
    // Class blueprints provided via ids for the helper
    // Warmonger-style cruiser class blueprint
    // Note: using ids that exist in config/parts.ts
    const ids = ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'];
    // We do not have ALL_PARTS here; let the helper work from ids via internal mapping
    const ships = seedFleetFromBlueprints('cruiser', ids, 2);
    expect(ships.length).toBe(2);
    expect(ships.every(s => s.frame.id === 'cruiser')).toBe(true);
    // Ensure seeded ships reference the specified parts (by id) on their class build
    ships.forEach(s => {
      const pids = s.parts.map((p: Part) => p.id);
      ids.forEach(id => expect(pids).toContain(id));
    });
  });
});
