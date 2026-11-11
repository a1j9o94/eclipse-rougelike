import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useBoardCommands } from '../second-dawn-game/board/useBoardCommands';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import type { GameCommand } from '../../shared/eclipse/types';
import type { ActionDraftGuard } from '../second-dawn-game/actionDraftContext';
import type { GameSoundFeedback } from '../second-dawn-game/sound/useGameSoundFeedback';
import type { AcceptedBoardReceipt } from '../second-dawn-game/board/useBoardCommands';
afterEach(cleanup);
function options() {
  const state = createGame({
    seed: 4,
    warpPortals: false,
    seats: [
      { id: 'a', faction: 'terran-directorate', controller: 'human' },
      { id: 'b', faction: 'hydran', controller: 'ai' },
    ],
  });
  const view = getPlayerView(state, 'a')!;
  const draftGuard: ActionDraftGuard = {
    stale: false,
    draftKeys: [],
    clear: vi.fn(),
    markSubmitted: vi.fn(),
    storageAvailable: true,
    canUndo: false,
    canUndoFor: () => false,
    undo: vi.fn(),
  };
  const sound: GameSoundFeedback = {
    submitted: vi.fn(),
    rejected: vi.fn(),
    combatLive: () => false,
    capture: vi.fn(),
    clicked: vi.fn(),
  };
  return {
    view,
    scope: 'match:a',
    draftGuard,
    sound,
    queueMode: false,
    submitAuthoritative: vi.fn(),
    onQueue: vi.fn(),
    lastAcceptedCommand: undefined as AcceptedBoardReceipt | undefined,
    interactionBlockedReason: undefined as string | undefined,
  };
}
it('routes queued intent without accepted feedback, handoff or authoritative submission', () => {
  const props = { ...options(), queueMode: true };
  const { result } = renderHook(() => useBoardCommands(props));
  const command: GameCommand = { type: 'build', builds: [] };
  act(() => result.current.onSubmit(command));
  expect(props.onQueue).toHaveBeenCalledWith(command);
  expect(props.draftGuard.markSubmitted).toHaveBeenCalledWith(command, 'queued');
  expect(props.submitAuthoritative).not.toHaveBeenCalled();
  expect(props.sound.submitted).not.toHaveBeenCalled();
  expect(result.current.submittedTurnHandoff.current).toBeNull();
  act(() => result.current.onSubmit({ type: 'finish-upkeep' }));
  expect(props.onQueue).toHaveBeenCalledTimes(1);
});
it('keeps auto-pass immediate and allows turn completion through a stale draft', () => {
  const props = options();
  props.draftGuard.stale = true;
  const { result } = renderHook(() => useBoardCommands(props));
  act(() => result.current.onSubmit({ type: 'trade', from: 'money', to: 'science', amount: 1 }));
  expect(props.sound.rejected).toHaveBeenCalledOnce();
  expect(props.submitAuthoritative).not.toHaveBeenCalled();
  const preference: GameCommand = { type: 'set-auto-pass', enabled: true };
  act(() => result.current.onSubmit(preference));
  expect(props.submitAuthoritative).toHaveBeenCalledWith(preference);
  expect(props.draftGuard.markSubmitted).not.toHaveBeenCalled();
  act(() => result.current.onSubmit({ type: 'pass' }));
  expect(props.draftGuard.markSubmitted).toHaveBeenCalledWith({ type: 'pass' });
});
it('blocks all commands while interaction is blocked and clears correlation across sessions', () => {
  const props = options();
  const { result, rerender } = renderHook((p) => useBoardCommands(p), { initialProps: props });
  act(() => result.current.onSubmit({ type: 'pass' }));
  expect(result.current.submittedTurnHandoff.current).not.toBeNull();
  rerender({ ...props, scope: 'other:a', interactionBlockedReason: 'Reconnecting' });
  expect(result.current.submittedTurnHandoff.current).toBeNull();
  act(() => result.current.onSubmit({ type: 'pass' }));
  expect(props.submitAuthoritative).toHaveBeenCalledTimes(1);
});
