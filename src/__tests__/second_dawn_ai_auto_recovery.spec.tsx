import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAiRecovery } from '../second-dawn-game/useAiRecovery';

it('requests one automatic retry for a failed AI decision and stops after the second failure', () => {
  const recover = vi.fn(async () => {});
  const failed = { revision: 155, status: 'failed' as const, attempts: 1, timerFailed: false };
  const hook = renderHook(({ connected, state }) => useAiRecovery('owner', 'match', connected, state, recover), {
    initialProps: { connected: false, state: failed },
  });
  expect(recover).not.toHaveBeenCalled();
  hook.rerender({ connected: true, state: failed });
  expect(recover).toHaveBeenCalledExactlyOnceWith('owner', 'match');
  hook.rerender({ connected: true, state: { ...failed } });
  expect(recover).toHaveBeenCalledTimes(1);
  hook.rerender({ connected: true, state: { ...failed, attempts: 2 } });
  expect(recover).toHaveBeenCalledTimes(1);
});
