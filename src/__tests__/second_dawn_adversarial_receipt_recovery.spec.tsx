import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { useBoardActionResults } from '../second-dawn-game/board/useBoardActionResults';
import type { AcceptedBoardReceipt } from '../second-dawn-game/board/useBoardCommands';

afterEach(cleanup);

function options() {
  const state = createGame({
    seed: 42,
    warpPortals: false,
    seats: [
      { id: 'a', faction: 'terran-directorate', controller: 'human' },
      { id: 'b', faction: 'hydran', controller: 'ai' },
    ],
  });
  state.revision = 10;
  return {
    scope: 'match:a',
    view: getPlayerView(state, 'a'),
    lastAcceptedCommand: undefined as AcceptedBoardReceipt | undefined,
    setBuildOpen: vi.fn(),
    setMoveOpen: vi.fn(),
    setMoveTarget: vi.fn(),
    setResearchDraft: vi.fn(),
    submittedResearch: { current: null },
  };
}

it('shows recovered build feedback when the original receipt arrives after the view and a retry', () => {
  const props = options();
  const { result, rerender } = renderHook((p) => useBoardActionResults(p), { initialProps: props });
  act(() => {
    result.current.pendingBuild.current = {
      scope: props.scope,
      receipt: props.lastAcceptedCommand,
      type: 'build',
      count: 1,
    };
  });
  // The mutation succeeded; its response was lost, but the subscription has already advanced.
  const subscribed = { ...props, view: { ...props.view, revision: 11 } };
  rerender(subscribed);
  expect(result.current.buildResult).toBe('');
  // The board submits the same choice again. SecondDawnGame reuses its command ID.
  act(() => {
    result.current.pendingBuild.current = {
      scope: props.scope,
      receipt: subscribed.lastAcceptedCommand,
      type: 'build',
      count: 1,
    };
  });
  // Convex returns the original successful receipt, not a newly incremented revision.
  rerender({ ...subscribed, lastAcceptedCommand: { revision: 11, type: 'build' } });
  expect(result.current.buildResult).toBe('1 piece deployed to your galaxy.');
  expect(result.current.pendingBuild.current).toBeNull();
});

it('shows recovered movement feedback when other updates have passed the original receipt', () => {
  const props = options();
  const { result, rerender } = renderHook((p) => useBoardActionResults(p), { initialProps: props });
  act(() => {
    result.current.pendingMove.current = {
      scope: props.scope,
      receipt: props.lastAcceptedCommand,
      type: 'move',
      ships: 2,
    };
  });
  const subscribed = { ...props, view: { ...props.view, revision: 12 } };
  rerender(subscribed);
  expect(result.current.movementResult).toBe('');
  act(() => {
    result.current.pendingMove.current = {
      scope: props.scope,
      receipt: subscribed.lastAcceptedCommand,
      type: 'move',
      ships: 2,
    };
  });
  rerender({ ...subscribed, lastAcceptedCommand: { revision: 11, type: 'move' } });
  expect(result.current.movementResult).toContain('2 ships moved.');
  expect(result.current.pendingMove.current).toBeNull();
});
