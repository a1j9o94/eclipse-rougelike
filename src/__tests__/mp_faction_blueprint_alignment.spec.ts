import { describe, it, expect } from 'vitest';
import { PARTS } from '../config/parts';
import { mapBlueprintIdsToParts } from '../multiplayer/blueprintHints';

describe('MP faction blueprint ID alignment', () => {
  it('raiders and timekeepers use tier-2 tachyon_source', () => {
    const tier2Source = PARTS.sources[1].id; // 'tachyon_source'
    const raidersIds = { interceptor: ['tachyon_source','tachyon_drive','antimatter','positron'], cruiser: [], dread: [] } as const;
    const timekeepersIds = { interceptor: ['tachyon_source','tachyon_drive','disruptor','positron'], cruiser: [], dread: [] } as const;
    const r = mapBlueprintIdsToParts(raidersIds as any);
    const t = mapBlueprintIdsToParts(timekeepersIds as any);
    expect(r.interceptor.map(p=>p.id)).toContain(tier2Source);
    expect(t.interceptor.map(p=>p.id)).toContain(tier2Source);
  });

  it('collective uses fusion_source (tier-1) by design', () => {
    const tier1Source = PARTS.sources[0].id; // 'fusion_source'
    const ids = { interceptor: ['fusion_source','fusion_drive','plasma','auto_repair'], cruiser: [], dread: [] } as const;
    const c = mapBlueprintIdsToParts(ids as any);
    expect(c.interceptor.map(p=>p.id)).toContain(tier1Source);
  });
});

