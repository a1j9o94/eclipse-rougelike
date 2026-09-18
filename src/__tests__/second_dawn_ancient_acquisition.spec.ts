import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { queueAncientPart, resolveAncientPart } from '../../shared/eclipse/ancientAcquisition';
import { presentNextDecision } from '../../shared/eclipse/rulesState';
import type { GameState, PendingDecision } from '../../shared/eclipse/types';
function game(): GameState { return createGame({ seed: 9, warpPortals: false, seats: [{ id: 'a', faction: 'hydran', controller: 'human' }, { id: 'b', faction: 'planta', controller: 'ai' }] }); }
function draw(state: GameState, part = 'ion-disruptor'): PendingDecision {
  state.pendingDecision = null;
  queueAncientPart(state, state.seats[0], part); presentNextDecision(state);
  if (!state.pendingDecision) throw new Error('Missing choice');
  return state.pendingDecision;
}
describe('ancient ship part acquisition', () => {
  it('persists a new decision without prematurely storing or spending influence', () => {
    const state = game(); const before = state.seats[0].influenceOnTrack;
    const decision = draw(state);
    expect(decision).toMatchObject({ kind: 'ancient-part', partId: 'ion-disruptor', owner: 'a' });
    expect(state.seats[0].storedParts).toEqual([]);
    const draft = structuredClone(state.seats[0].blueprints[0]); draft.parts[0] = 'ion-disruptor';
    resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: draft });
    expect(state.seats[0].blueprints[0].parts[0]).toBe('ion-disruptor');
    expect(state.seats[0].influenceOnTrack).toBe(before); expect(state.engine!.action).toBeNull();
  });
  it('stores for a later normal upgrade when the player declines immediate installation', () => {
    const state = game(); const decision = draw(state);
    resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: null });
    expect(state.seats[0].storedParts).toEqual(['ion-disruptor']);
  });
  it('rejects unrelated edits, unknown blueprints and energy-invalid installation atomically', () => {
    const state = game(); const decision = draw(state, 'plasma-turret');
    const original = JSON.stringify(state.seats[0]);
    const draft = structuredClone(state.seats[0].blueprints[0]); draft.parts[0] = 'plasma-turret';
    expect(() => resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: draft })).toThrow();
    draft.parts[1] = 'fusion-source';
    expect(() => resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: draft })).toThrow();
    expect(JSON.stringify(state.seats[0])).toBe(original);
  });
  it('does not relocate an existing ancient part when adding the new discovery', () => {
    const state = game(); state.seats[0].blueprints[0].parts[0] = 'ion-disruptor';
    const decision = draw(state, 'shard-hull');
    const draft = structuredClone(state.seats[0].blueprints[0]); draft.parts[0] = 'shard-hull'; draft.parts[3] = 'ion-disruptor';
    expect(() => resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: draft })).toThrow();
    draft.parts[3] = null;
    resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: draft });
    expect(state.seats[0].storedParts).not.toContain('ion-disruptor');
    expect(state.seats[0].blueprints[0].parts).not.toContain('ion-disruptor');
  });
  it('installs Muon outside the grid and preserves earlier outside parts on future installs', () => {
    const state = game(); const decision = draw(state, 'muon-source');
    const draft = structuredClone(state.seats[0].blueprints[0]); draft.outsideParts = ['muon-source'];
    resolveAncientPart(state, state.seats[0], decision, { kind: 'ancient-part', blueprint: draft });
    const next = draw(state, 'ion-disruptor');
    draft.parts[0] = 'ion-disruptor'; draft.outsideParts = [];
    expect(() => resolveAncientPart(state, state.seats[0], next, { kind: 'ancient-part', blueprint: draft })).toThrow();
  });
});
