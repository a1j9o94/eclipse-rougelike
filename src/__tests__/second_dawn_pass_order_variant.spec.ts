import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { sampleAiWorld } from '../../shared/eclipse/aiWorld';
import { advanceRound } from '../../shared/eclipse/rounds';
import { rosterTurnOrder } from '../second-dawn-game/turnOrder';

const seats = ['eridani', 'hydran', 'planta'] as const;
function opening(passOrderTurnOrder: boolean) {
  return createGame({ seed: 25, warpPortals: false, ruleOptions: { passOrderTurnOrder }, seats: seats.map((faction, index) => ({ id: `p${index}`, faction, controller: 'human' })) });
}
function pass(state: ReturnType<typeof opening>) {
  const result = processGameCommand(state, state.activeSeatId!, { type: 'pass' });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe('pass-order turn variant', () => {
  it('records first passes once and uses that sequence next round while preserving the +2 bonus', () => {
    let state = opening(true);
    state.activeSeatId = 'p1';
    state = pass(state);
    expect(state.passOrder).toEqual(['p1']);
    expect(state.firstPasser).toBe('p1');
    state.activeSeatId = 'p0';
    state = pass(state);
    state.activeSeatId = 'p2';
    state = pass(state);
    expect(state.passOrder).toEqual(['p1', 'p0', 'p2']);
    // Force the existing phase pipeline to its cleanup point; turn order is
    // finalized there rather than as soon as the last seat passes.
    state.phase = 'cleanup';
    state.pendingDecision = null;
    state.engine = { ...state.engine!, decisions: [], aftermath: undefined, action: null };
    advanceRound(state, []);
    expect(state.turnOrder).toEqual(['p1', 'p0', 'p2']);
    expect(state.activeSeatId).toBe('p1');
    expect(state.round).toBe(2);
    expect(rosterTurnOrder(getPlayerView(state, 'p1')!).map(seat => seat.id)).toEqual(['p1', 'p0', 'p2']);
    expect(sampleAiWorld(getPlayerView(state, 'p1')!, 11)).toMatchObject({ turnOrder: ['p1', 'p0', 'p2'] });
    state = pass(state);
    expect(state.activeSeatId).toBe('p0');
    state = pass(state);
    expect(state.activeSeatId).toBe('p2');
  });

  it('keeps clockwise turn order by default', () => {
    let state = opening(false);
    expect(state.turnOrder).toBeUndefined();
    state.activeSeatId = 'p1';
    state = pass(state);
    expect(state.passOrder).toBeUndefined();
    expect(state.activeSeatId).toBe('p2');
  });
});
