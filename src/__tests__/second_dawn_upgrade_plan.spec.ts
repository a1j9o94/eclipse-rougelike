import { describe, expect, it } from 'vitest';
import { initialBlueprints } from '../../shared/eclipse/blueprints';
import { planBlueprintUpgrade } from '../../shared/eclipse/upgradePlan';
describe('legal ordering of upgrade activations', () => {
  it('installs the energy source before a cannon that would otherwise exceed energy', () => {
    const old = initialBlueprints('hydran')[0]; const next = structuredClone(old);
    next.parts[0] = 'antimatter-cannon'; next.parts[1] = 'fusion-source';
    const plan = planBlueprintUpgrade('hydran', old, next, ['antimatter-cannon', 'fusion-source'], []);
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.message);
    expect(plan.installations).toBe(2); expect(plan.steps[0].install?.slot).toBe(1);
  });
  it('returns a power-consuming overlay before installing the more demanding drive', () => {
    const old = initialBlueprints('eridani')[0]; old.parts[3] = 'plasma-cannon';
    const next = structuredClone(old); next.parts[3] = null; next.parts[2] = 'fusion-drive';
    const plan = planBlueprintUpgrade('eridani', old, next, ['plasma-cannon', 'fusion-drive'], []);
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.message);
    expect(plan.steps[0].removeSlots).toContain(3); expect(plan.installations).toBe(1);
  });
  it('supports legal removal-only upgrades and rejects ancient relocation', () => {
    const old = initialBlueprints('hydran')[0]; old.parts[3] = 'ion-disruptor';
    const moved = structuredClone(old); moved.parts[0] = 'ion-disruptor'; moved.parts[3] = null;
    expect(planBlueprintUpgrade('hydran', old, moved, [], ['ion-disruptor']).ok).toBe(false);
    moved.parts[0] = null;
    const removed = planBlueprintUpgrade('hydran', old, moved, [], ['ion-disruptor']);
    expect(removed).toMatchObject({ ok: true, installations: 0, steps: [{ removeSlots: [3], install: null }] });
  });
  it('allows all eight overlays to be removed without imposing an installation cap on removals', () => {
    const old = initialBlueprints('hydran')[2];
    old.parts = old.parts.map((_, index) => index === 6 ? 'nuclear-drive' : 'nuclear-source');
    const next = initialBlueprints('hydran')[2];
    const before = JSON.stringify([old, next]);
    const plan = planBlueprintUpgrade('hydran', old, next, [], []);
    expect(plan).toMatchObject({ ok: true, installations: 0, steps: [{ removeSlots: [0, 1, 2, 3, 4, 5, 6, 7], install: null }] });
    expect(JSON.stringify([old, next])).toBe(before);
  });
});
