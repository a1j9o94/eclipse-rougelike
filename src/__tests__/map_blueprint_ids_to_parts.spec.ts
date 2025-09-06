import { describe, it, expect } from 'vitest';
import type { FrameId } from '../../shared/frames';
import type { Part } from '../../shared/parts';
import { ALL_PARTS } from '../../shared/parts';
import { mapBlueprintIdsToParts } from '../multiplayer/blueprintHints';

describe('mapBlueprintIdsToParts', () => {
  it('maps known ids to concrete Part objects per frame', () => {
    const ids: Record<FrameId, string[]> = {
      interceptor: ['tachyon_source', 'tachyon_drive', 'antimatter', 'positron'],
      cruiser: [],
      dread: [],
    };
    const mapped: Record<FrameId, Part[]> = mapBlueprintIdsToParts(ids);
    expect(Array.isArray(mapped.interceptor)).toBe(true);
    expect(mapped.interceptor.length).toBeGreaterThan(0);
    // Contains the hinted antimatter and tachyon drive
    const idsOut = mapped.interceptor.map(p => p.id);
    expect(idsOut).toContain('antimatter');
    expect(idsOut).toContain('tachyon_drive');
  });

  it('ignores unknown ids and preserves structure', () => {
    const ids: Record<FrameId, string[]> = {
      interceptor: ['unknown_id', 'positron'],
      cruiser: [],
      dread: [],
    };
    const mapped = mapBlueprintIdsToParts(ids);
    expect(mapped.interceptor.some(p => p.id === 'positron')).toBe(true);
    expect(mapped.interceptor.some(p => p.id === 'unknown_id')).toBe(false);
  });

  it('does not drop valid parts when other frames are empty', () => {
    const ids: Record<FrameId, string[]> = {
      interceptor: ['plasma', 'fusion_drive', 'fusion_source'],
      cruiser: [],
      dread: [],
    };
    const mapped = mapBlueprintIdsToParts(ids);
    const allKnown = mapped.interceptor.every(p => (ALL_PARTS as Part[]).some(x => x.id === p.id));
    expect(allKnown).toBe(true);
    expect(Array.isArray(mapped.cruiser)).toBe(true);
    expect(Array.isArray(mapped.dread)).toBe(true);
  });
});
