import { describe, it, expect } from 'vitest';
import { PARTS } from '../../shared/parts';
import { applyBlueprintHints } from '../multiplayer/blueprintHints';

describe('applyBlueprintHints (MP blueprint mapping)', () => {
  it('merges interceptor hints into blueprints with real parts', () => {
    const current = { interceptor: [] as typeof PARTS.sources, cruiser: [] as typeof PARTS.sources, dread: [] as typeof PARTS.sources };
    const hints = { interceptor: ['tachyon_source','tachyon_drive','antimatter','positron'] };
    const out = applyBlueprintHints(current, hints);
    expect(out.interceptor.length).toBeGreaterThan(0);
    // ensure at least one part is the hinted antimatter cannon
    expect(out.interceptor.some((p)=> p?.id==='antimatter')).toBe(true);
  });
  it('does not crash on unknown ids and preserves other classes', () => {
    const current = { interceptor: [PARTS.sources[0]] as typeof PARTS.sources, cruiser: [] as typeof PARTS.sources, dread: [] as typeof PARTS.sources };
    const hints = { interceptor: ['unknown_id','positron'] };
    const out = applyBlueprintHints(current, hints);
    expect(out.interceptor.some((p)=> p?.id==='positron')).toBe(true);
    expect(out.cruiser.length).toBe(0);
  });
});
