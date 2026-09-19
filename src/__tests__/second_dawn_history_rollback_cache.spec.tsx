// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PublicHistoryPage } from '../../shared/eclipse/history';
import type { Id } from '../../convex/_generated/dataModel';
import { useMatchHistory } from '../second-dawn-session/useMatchHistory';
const mocks = vi.hoisted(() => ({ latest: null as PublicHistoryPage | null, query: vi.fn() }));
vi.mock('convex/react', () => ({ useConvex: () => ({ query: mocks.query }), useQuery: () => mocks.latest }));
const matchId = 'history-match' as Id<'eclipseMatchesV1'>;
function page(high: number, low: number, supersededAtRevision?: number): PublicHistoryPage {
  return { entries: Array.from({ length: high - low + 1 }, (_, i) => ({ revision: high - i, actorSeatId: 'seat-1', actorName: 'Eridani', round: 1, summary: 'Passed', details: [], rollbackAvailable: !supersededAtRevision, ...(supersededAtRevision ? { supersededAtRevision } : {}) })), nextBeforeRevision: low > 1 ? low : null };
}
beforeEach(() => { mocks.latest = page(80, 41); mocks.query.mockReset(); });
afterEach(cleanup);
it('discards previously loaded metadata when an applied rollback changes the history epoch', async () => {
  const { result, rerender } = renderHook(({ revision }) => useMatchHistory('credential', matchId, revision), { initialProps: { revision: 0 } });
  mocks.query.mockResolvedValueOnce(page(40, 1));
  await act(async () => result.current.loadOlder());
  await waitFor(() => expect(result.current.entries).toHaveLength(80));
  mocks.latest = page(82, 43, 82);
  rerender({ revision: 82 });
  await waitFor(() => expect(result.current.entries).toHaveLength(40));
  expect(result.current.entries.every(entry => entry.supersededAtRevision === 82)).toBe(true);
  mocks.query.mockResolvedValueOnce(page(42, 3, 82));
  await act(async () => result.current.loadOlder());
  expect(result.current.entries).toHaveLength(80);
  expect(result.current.entries.every(entry => !entry.rollbackAvailable)).toBe(true);
});
it('ignores an in-flight older page from before the rewind', async () => {
  const { result, rerender } = renderHook(({ revision }) => useMatchHistory('credential', matchId, revision), { initialProps: { revision: 0 } });
  let finish: (page: PublicHistoryPage) => void = () => {};
  mocks.query.mockImplementationOnce(() => new Promise<PublicHistoryPage>(resolve => { finish = resolve; }));
  act(() => result.current.loadOlder());
  mocks.latest = page(82, 43, 82); rerender({ revision: 82 });
  await act(async () => finish(page(40, 1)));
  expect(result.current.entries).toHaveLength(40);
  expect(result.current.entries.every(entry => entry.supersededAtRevision === 82)).toBe(true);
  expect(result.current.loadingOlder).toBe(false);
});
