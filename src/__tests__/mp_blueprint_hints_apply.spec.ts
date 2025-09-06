import { describe, it, expect } from 'vitest';
import { PARTS } from '../config/parts';
import { applyBlueprintHints } from '../multiplayer/blueprintHints';

describe('applyBlueprintHints (MP blueprint mapping)', () => {
  it('merges interceptor hints into blueprints with real parts', () => {
    const current = { interceptor: [], cruiser: [], dread: [] } as any;
    const hints = { interceptor: ['tachyon_source','tachyon_drive','antimatter','positron'] };
    const out = applyBlueprintHints(current, hints);
    expect(out.interceptor.length).toBeGreaterThan(0);
    // ensure at least one part is the hinted antimatter cannon
    expect(out.interceptor.some((p:any)=> p?.id==='antimatter')).toBe(true);
  });
  it('does not crash on unknown ids and preserves other classes', () => {
    const current = { interceptor: [PARTS.sources[0]], cruiser: [], dread: [] } as any;
    const hints = { interceptor: ['unknown_id','positron'] };
    const out = applyBlueprintHints(current, hints);
    expect(out.interceptor.some((p:any)=> p?.id==='positron')).toBe(true);
    expect(out.cruiser.length).toBe(0);
  });
});

