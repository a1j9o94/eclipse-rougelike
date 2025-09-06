import { describe, it, expect } from 'vitest';
import { FACTIONS } from '../../shared/factions';
import { ALL_PARTS, type Part } from '../../shared/parts';
import { SHARED_FACTIONS } from '../../shared/factions';

describe('Faction config stays in sync with shared blueprint IDs', () => {
  function toIds(parts: Part[]): string[] {
    return (parts || []).map((p: Part) => (p?.id as string)).filter(Boolean);
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
    expect(idsR).toEqual(SHARED_FACTIONS.raiders.blueprintIds.interceptor);
    expect(idsT).toEqual(SHARED_FACTIONS.timekeepers.blueprintIds.interceptor);
    expect(idsC).toEqual(SHARED_FACTIONS.collective.blueprintIds.interceptor);
    // Assert all ids exist in ALL_PARTS as a sanity check
    [idsR, idsT, idsC].flat().forEach(id => {
      expect((ALL_PARTS as Part[]).some(p => p.id === id)).toBe(true);
    });
  });
});
