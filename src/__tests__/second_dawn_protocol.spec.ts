import { describe, expect, it } from 'vitest';
import {
  commitCommand,
  getPlayerView,
  visibleEvents,
} from '../../shared/eclipse/protocol';
import { randomSeed } from '../../shared/eclipse/random';
import type {
  CommandRequest,
  GameState,
  MatchAggregate,
  RuleResult,
  Seat,
} from '../../shared/eclipse/types';

function seat(id: string): Seat {
  return {
    id,
    faction: 'eridani',
    controller: id === 'human' ? 'human' : 'ai',
    resources: { money: 26, science: 2, materials: 4 },
    populationTracks: { money: 0, science: 0, materials: 0 },
    influenceOnTrack: 10,
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
    state: {
      rulesVersion: 'test-rules',
      catalogVersion: 'test-catalog',
      revision: 0,
      round: 1,
      phase: 'action',
      activeSeatId: 'human',
      startSeatId: 'human',
      firstPasser: null,
      seats: [seat('human'), seat('ai')],
      sectors: [],
      ships: [],
      technologyMarket: [],
      pendingDecision: null,
      privateSeats: [
        { seatId: 'human', reputation: [4], discoveriesKept: ['own-secret'] },
        {
          seatId: 'ai',
          reputation: [3, 2],
          discoveriesKept: ['opponent-secret'],
        },
      ],
      random: randomSeed(7),
      supplies: {
        inner: ['deck-secret'],
        middle: [],
        outer: [],
        technology: [],
        discovery: [],
        reputation: [4, 2],
      },
    },
    journal: [],
  };
}
const request: CommandRequest = {
  commandId: 'command-1',
  expectedRevision: 0,
  command: { type: 'pass' },
};
function passRule(state: GameState): RuleResult {
  state.seats[0].passed = true;
  return {
    ok: true,
    state,
    events: [
      {
        type: 'action',
        seatId: 'human',
        visibility: 'public',
        message: 'Passed.',
      },
    ],
  };
}
const versions = { rulesVersion: 'test-rules', catalogVersion: 'test-catalog' };
const submit = (
  aggregate: MatchAggregate,
  actor: string,
  req = request,
  rule = passRule,
) => commitCommand(aggregate, actor, req, versions, rule);

describe('Second Dawn authoritative command boundary', () => {
  it('commits atomically, journals once and preserves the previous snapshot', () => {
    const before = fixture();
    const saved = JSON.stringify(before);
    const result = submit(before, 'human');
    expect(result.ok).toBe(true);
    expect(JSON.stringify(before)).toBe(saved);
    expect(result.aggregate.state.revision).toBe(1);
    expect(result.aggregate.state.seats[0].passed).toBe(true);
    expect(result.aggregate.journal).toHaveLength(1);
  });
  it('returns the original receipt after a retry, even after later revisions', () => {
    const first = submit(fixture(), 'human');
    if (!first.ok) throw Error('first failed');
    const advanced = structuredClone(first.aggregate);
    advanced.state.revision = 7;
    advanced.state.phase = 'finished';
    const retry = submit(advanced, 'human', request, () => {
      throw Error('must not execute');
    });
    expect(retry.ok && retry.duplicate).toBe(true);
    expect(retry.ok && retry.receipt).toEqual(first.receipt);
    expect(retry.aggregate).toBe(advanced);
  });
  it('rejects a command ID reused by another actor or for changed content', () => {
    const first = submit(fixture(), 'human');
    for (const [actor, req] of [
      ['ai', request],
      [
        'human',
        {
          ...request,
          command: { type: 'trade', from: 'money', to: 'science', amount: 1 },
        },
      ],
    ] as const) {
      const result = submit(first.aggregate, actor, req);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe('COMMAND_ID_REUSED');
    }
  });
  it('validates identity before looking up any original result', () => {
    const result = submit(submit(fixture(), 'human').aggregate, 'intruder');
    expect(!result.ok && result.error.code).toBe('NOT_A_SEAT');
  });
  it('rejects stale revisions and turns without calling rules', () => {
    for (const [actor, expectedRevision, code] of [
      ['human', 9, 'STALE_REVISION'],
      ['ai', 0, 'NOT_YOUR_TURN'],
    ] as const) {
      const result = submit(
        fixture(),
        actor,
        { ...request, expectedRevision },
        () => {
          throw Error('must not execute');
        },
      );
      expect(!result.ok && result.error.code).toBe(code);
    }
  });
  it('discards mutations and random draws made by a rejecting rule', () => {
    const before = fixture();
    const saved = JSON.stringify(before);
    const result = submit(before, 'human', request, (state) => {
      state.random.value = 999;
      state.supplies.inner.pop();
      return {
        ok: false,
        error: {
          code: 'ILLEGAL_ACTION',
          message: 'No connected wormhole.',
          field: 'position',
        },
      };
    });
    expect(result.aggregate).toBe(before);
    expect(JSON.stringify(before)).toBe(saved);
  });
  it('restores and enforces an outstanding decision for the nonactive seat', () => {
    const before = fixture();
    before.state.pendingDecision = {
      id: 'decision-5',
      owner: 'ai',
      kind: 'reputation',
      drawn: [4, 1],
      capacity: 1,
    };
    const saved = JSON.parse(JSON.stringify(before)) as MatchAggregate;
    const blocked = submit(saved, 'human');
    expect(!blocked.ok && blocked.error.code).toBe('DECISION_PENDING');
    const resolved = submit(
      saved,
      'ai',
      {
        ...request,
        command: {
          type: 'resolve',
          decisionId: 'decision-5',
          choice: { kind: 'reputation', kept: [4] },
        },
      },
      (state) => {
        state.pendingDecision = null;
        return { ok: true, state, events: [] };
      },
    );
    expect(resolved.ok).toBe(true);
    expect(resolved.aggregate.state.pendingDecision).toBeNull();
  });
  it('rejects mismatched decision kinds and stale decision IDs', () => {
    const before = fixture();
    before.state.pendingDecision = {
      id: 'd',
      owner: 'human',
      kind: 'reputation',
      drawn: [4],
      capacity: 1,
    };
    for (const command of [
      {
        type: 'resolve',
        decisionId: 'old',
        choice: { kind: 'reputation', kept: [4] },
      },
      {
        type: 'resolve',
        decisionId: 'd',
        choice: { kind: 'retreat', destinationId: null },
      },
    ] as const) {
      const result = submit(before, 'human', {
        ...request,
        command: structuredClone(command) as CommandRequest['command'],
      });
      expect(!result.ok && result.error.code).toBe('WRONG_DECISION');
    }
  });
  it('rejects unsupported persisted rules without mutating the aggregate', () => {
    const before = fixture();
    before.state.rulesVersion = 'future';
    const result = submit(before, 'human');
    expect(!result.ok && result.error.code).toBe('VERSION_MISMATCH');
  });
  it('validates command envelope numeric bounds and nonempty IDs', () => {
    for (const req of [
      { ...request, commandId: '' },
      { ...request, expectedRevision: NaN },
      { ...request, expectedRevision: -1 },
    ]) {
      const result = submit(fixture(), 'human', req);
      expect(!result.ok && result.error.code).toBe('INVALID_COMMAND');
    }
  });
});

describe('Second Dawn private views', () => {
  it('whitelists view state and never exposes opponent values, draw order or RNG', () => {
    const aggregate = fixture();
    aggregate.state.pendingDecision = {
      id: 'd',
      owner: 'ai',
      kind: 'reputation',
      drawn: [4, 3],
      capacity: 1,
    };
    const view = getPlayerView(aggregate.state, 'human');
    expect(view?.private.reputation).toEqual([4]);
    expect(view?.pendingDecision).toBeNull();
    expect(view?.waitingFor).toEqual({ owner: 'ai', kind: 'reputation' });
    const serialized = JSON.stringify(view);
    for (const secret of [
      'opponent-secret',
      'deck-secret',
      'random',
      'supplies',
      'drawn',
      'privateSeats',
    ])
      expect(serialized).not.toContain(secret);
    expect(view?.hiddenTileCounts[1]).toEqual({
      seatId: 'ai',
      reputation: 2,
      discoveriesKept: 1,
    });
    expect(getPlayerView(aggregate.state, 'intruder')).toBeNull();
  });
  it('gives a decision only to its owner and never shares mutable references', () => {
    const aggregate = fixture();
    aggregate.state.pendingDecision = {
      id: 'd',
      owner: 'human',
      kind: 'reputation',
      drawn: [4, 3],
      capacity: 1,
    };
    const view = getPlayerView(aggregate.state, 'human');
    expect(view?.pendingDecision).toEqual(aggregate.state.pendingDecision);
    if (!view) throw Error('missing view');
    view.private.reputation.pop();
    view.seats[0].resources.money = 0;
    expect(aggregate.state.privateSeats[0].reputation).toEqual([4]);
    expect(aggregate.state.seats[0].resources.money).toBe(26);
  });
  it('filters private event messages for both humans and AI', () => {
    expect(
      visibleEvents(
        [
          {
            type: 'phase',
            seatId: null,
            visibility: 'public',
            message: 'Combat',
          },
          {
            type: 'draw',
            seatId: 'ai',
            visibility: { seatId: 'ai' },
            message: 'Drew a 4',
          },
        ],
        'human',
      ),
    ).toHaveLength(1);
  });
});
