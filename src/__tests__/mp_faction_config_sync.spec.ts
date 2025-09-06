import { describe, it, expect } from 'vitest';
import { FACTIONS } from '../config/factions';
import { ALL_PARTS } from '../config/parts';
import { FACTION_BLUEPRINT_IDS } from '../../shared/factionBlueprintIds';

describe('Faction config stays in sync with shared blueprint IDs', () => {
  function toIds(parts: any[]): string[] {
    return (parts || []).map((p: any) => p?.id).filter(Boolean);
  }
  it('raiders/timekeepers/collective interceptor blueprints match shared ids', () => {
    const idx = (id: string) => FACTIONS.findIndex(f => f.id === id);
    const byId = (id: string) => FACTIONS[idx(id)];
    const r = byId('raiders');
    const t = byId('timekeepers');
    const c = byId('collective');
    // Extract configured blueprint part IDs
    const idsR = toIds(r.config.blueprints.interceptor);
    const idsT = toIds(t.config.blueprints.interceptor);
    const idsC = toIds(c.config.blueprints.interceptor);
    expect(idsR).toEqual(FACTION_BLUEPRINT_IDS.raiders.interceptor);
    expect(idsT).toEqual(FACTION_BLUEPRINT_IDS.timekeepers.interceptor);
    expect(idsC).toEqual(FACTION_BLUEPRINT_IDS.collective.interceptor);
    // Assert all ids exist in ALL_PARTS as a sanity check
    [idsR, idsT, idsC].flat().forEach(id => {
      expect((ALL_PARTS as any[]).some(p => p.id === id)).toBe(true);
    });
  });
});

