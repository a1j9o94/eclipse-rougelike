import { describe, expect, it, vi } from 'vitest';
import {
  commitCommand,
  getPlayerView,
  visibleEvents,
} from '../../shared/eclipse/protocol';
import { randomInt, randomSeed, shuffle } from '../../shared/eclipse/random';
import type {
  CommandRequest,
  GameState,
  MatchAggregate,
  Seat,
} from '../../shared/eclipse/types';
const pin = { rulesVersion: 'review', catalogVersion: 'review' };
function makeSeat(id: string): Seat {
  return {
    id,
    faction: 'draco',
    controller: 'human',
    resources: { money: 2, materials: 3, science: 4 },
    populationTracks: { money: 0, materials: 0, science: 0 },
    influenceOnTrack: 12,
    actionDiscs: {
      explore: 0,
      influence: 0,
      research: 0,
      upgrade: 0,
      build: 0,
      move: 0,
    },
    colonyShipsAvailable: 3,
    passed: false,
    eliminated: false,
    technologies: { military: [], grid: [], nano: [] },
    blueprints: [],
    ambassadors: [],
    traitor: false,
  };
}
function fixture(): MatchAggregate {
  return {
    journal: [],
    state: {
      ...pin,
      revision: 0,
      round: 1,
      phase: 'action',
      activeSeatId: 'a',
      startSeatId: 'a',
      firstPasser: null,
      seats: [makeSeat('a'), makeSeat('b')],
      sectors: [],
      ships: [],
      technologyMarket: [],
      pendingDecision: null,
      privateSeats: [
        { seatId: 'a', reputation: [1], discoveriesKept: [] },
        { seatId: 'b', reputation: [4], discoveriesKept: ['secret'] },
      ],
      random: randomSeed(3),
      supplies: {
        inner: ['unseen'],
        middle: [],
        outer: [],
        technology: [],
        discovery: [],
        reputation: [],
      },
    },
  };
}
const pass: CommandRequest = {
  commandId: 'first',
  expectedRevision: 0,
  command: { type: 'pass' },
};
const accept = (state: GameState) => ({ ok: true as const, state, events: [] });
describe('independent protocol review', () => {
  it('isolates historical journal entries between successful aggregate versions', () => {
    const first = commitCommand(fixture(), 'a', pass, pin, accept);
    const second = commitCommand(
      first.aggregate,
      'a',
      { ...pass, commandId: 'second', expectedRevision: 1 },
      pin,
      accept,
    );
    second.aggregate.journal[0].request.commandId =
      'changed-through-new-snapshot';
    expect(first.aggregate.journal[0].request.commandId).toBe('first');
  });
  it('recognizes duplicate commands independent of JSON property insertion order', () => {
    const req: CommandRequest = {
      commandId: 'trade',
      expectedRevision: 0,
      command: { type: 'trade', from: 'science', to: 'money', amount: 1 },
    };
    const first = commitCommand(fixture(), 'b', req, pin, accept);
    const processor = vi.fn(accept);
    const duplicate = commitCommand(
      first.aggregate,
      'b',
      {
        command: { amount: 1, to: 'money', from: 'science', type: 'trade' },
        expectedRevision: 0,
        commandId: 'trade',
      },
      pin,
      processor,
    );
    expect(duplicate.ok && duplicate.duplicate).toBe(true);
    expect(processor).not.toHaveBeenCalled();
  });
  it('allows out-of-turn trading and bankruptcy-owner trades without clearing the decision', () => {
    const req: CommandRequest = {
      commandId: 'trade',
      expectedRevision: 0,
      command: { type: 'trade', from: 'science', to: 'money', amount: 1 },
    };
    expect(commitCommand(fixture(), 'b', req, pin, accept).ok).toBe(true);
    const pending = fixture();
    pending.state.pendingDecision = {
      id: 'bankrupt',
      owner: 'b',
      kind: 'bankruptcy',
      shortfall: 1,
      abandonableSectorIds: [],
    };
    const result = commitCommand(pending, 'b', req, pin, accept);
    expect(result.ok).toBe(true);
    expect(result.aggregate.state.pendingDecision).toEqual(
      pending.state.pendingDecision,
    );
  });
  it('blocks a different player during a decision, even when requesting a trade', () => {
    const pending = fixture();
    pending.state.pendingDecision = {
      id: 'bankrupt',
      owner: 'b',
      kind: 'bankruptcy',
      shortfall: 1,
      abandonableSectorIds: [],
    };
    const processor = vi.fn(accept);
    const result = commitCommand(
      pending,
      'a',
      {
        ...pass,
        command: { type: 'trade', from: 'science', to: 'money', amount: 1 },
      },
      pin,
      processor,
    );
    expect(!result.ok && result.error.code).toBe('DECISION_PENDING');
    expect(processor).not.toHaveBeenCalled();
  });
  it('isolates rule-owned result and caller request references from committed history', () => {
    const req: CommandRequest = {
      ...pass,
      command: { type: 'explore', position: { q: 1, r: 0 } },
    };
    const mutableState = fixture().state;
    const result = commitCommand(fixture(), 'a', req, pin, () =>
      accept(mutableState),
    );
    mutableState.seats[0].resources.money = 999;
    req.commandId = 'changed';
    expect(result.aggregate.state.seats[0].resources.money).toBe(2);
    expect(result.aggregate.journal[0].request.commandId).toBe('first');
  });
  it('keeps exploration draws and private events hidden from the nonowner', () => {
    const aggregate = fixture();
    aggregate.state.pendingDecision = {
      id: 'draw',
      kind: 'exploration',
      owner: 'b',
      position: { q: 1, r: 0 },
      drawnTileIds: ['private-drawn-sector'],
      placements: [{ tileId: 'private-drawn-sector', rotation: 0 }],
    };
    const view = getPlayerView(aggregate.state, 'a');
    expect(JSON.stringify(view)).not.toContain('private-drawn-sector');
    expect(JSON.stringify(view)).not.toContain('unseen');
    const events = [
      {
        type: 'draw' as const,
        seatId: 'b',
        visibility: { seatId: 'b' },
        message: 'Private draw',
      },
      {
        type: 'phase' as const,
        seatId: null,
        visibility: 'public' as const,
        message: 'Public',
      },
    ];
    const visible = visibleEvents(events, 'a');
    visible[0].message = 'mutated';
    expect(events[1].message).toBe('Public');
    expect(visible).toHaveLength(1);
  });
});
describe('independent random-stream review', () => {
  it('rejects exhaustion even when rejection sampling consumes extra draws', () => {
    // Seed 1 first uint32 word is 2693262067, rejected by this bound.
    const input = { ...randomSeed(1), draws: Number.MAX_SAFE_INTEGER - 1 };
    expect(() => randomInt(input, 2 ** 31 + 1)).toThrow();
    expect(input.draws).toBe(Number.MAX_SAFE_INTEGER - 1);
  });
  it('rejects corrupted streams for empty and singleton shuffles too', () => {
    const corrupt = { ...randomSeed(1), value: -1 };
    expect(() => shuffle(corrupt, [])).toThrow();
    expect(() => shuffle(corrupt, ['one'])).toThrow();
  });
  it('preserves deterministic repeated results through JSON serialization', () => {
    let first = randomSeed(99);
    let restored = randomSeed(99);
    for (let index = 0; index < 128; index += 1) {
      const a = randomInt(first, 2 ** 31 + 1);
      const b = randomInt(restored, 2 ** 31 + 1);
      expect(a).toEqual(b);
      first = a.state;
      restored = JSON.parse(JSON.stringify(b.state)) as typeof restored;
    }
  });
});
