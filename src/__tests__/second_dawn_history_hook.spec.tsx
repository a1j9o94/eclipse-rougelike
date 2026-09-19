import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicHistoryPage } from "../../shared/eclipse/history";
import type { Id } from "../../convex/_generated/dataModel";
const mocks = vi.hoisted(() => ({
  latest: undefined as PublicHistoryPage | null | undefined,
  query: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mocks.query }),
  useQuery: () => mocks.latest,
}));
import { useMatchHistory } from "../second-dawn-session/useMatchHistory";
const match = "match-one" as Id<"eclipseMatchesV1">;
function page(top: number, bottom: number, end = false): PublicHistoryPage {
  return {
    entries: Array.from({ length: top - bottom + 1 }, (_, i) => ({
      revision: top - i,
      actorSeatId: "p0",
      actorName: "Eridani Empire",
      round: 1,
      summary: "Passed",
      details: [],
    })),
    nextBeforeRevision: end ? null : bottom,
  };
}
beforeEach(() => {
  mocks.latest = undefined;
  mocks.query.mockReset();
});
describe("live persistent history", () => {
  it("recovers a reconnect gap after previously loading the entire journal, preserving old entries", async () => {
    mocks.latest = page(20, 1, true);
    const { result, rerender } = renderHook(() =>
      useMatchHistory("credential", match),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(20));
    expect(result.current.hasOlder).toBe(false);
    mocks.latest = undefined;
    rerender();
    expect(result.current.entries).toHaveLength(20);
    mocks.latest = page(100, 61);
    rerender();
    await waitFor(() => expect(result.current.hasOlder).toBe(true));
    expect(result.current.entries).toHaveLength(60);
    mocks.query.mockResolvedValueOnce(page(60, 21));
    await act(async () => result.current.loadOlder());
    await waitFor(() => expect(result.current.entries).toHaveLength(100));
    expect(mocks.query.mock.calls[0][1].beforeRevision).toBe(61);
    expect(result.current.hasOlder).toBe(false);
  });
  it("merges overlapping pages while live updates arrive and rejects stale results from another identity", async () => {
    mocks.latest = page(80, 41);
    const { result, rerender } = renderHook(
      ({ credential }) => useMatchHistory(credential, match),
      { initialProps: { credential: "first" } },
    );
    await waitFor(() => expect(result.current.hasOlder).toBe(true));
    let resolvePage: (page: PublicHistoryPage) => void = () => {};
    mocks.query.mockImplementationOnce(
      () =>
        new Promise<PublicHistoryPage>((resolve) => {
          resolvePage = resolve;
        }),
    );
    act(() => result.current.loadOlder());
    mocks.latest = page(90, 51);
    rerender({ credential: "first" });
    await act(async () => resolvePage(page(40, 1, true)));
    expect(result.current.entries).toHaveLength(90);
    expect(result.current.hasOlder).toBe(false);
    mocks.latest = undefined;
    rerender({ credential: "second" });
    expect(result.current.entries).toEqual([]);
  });
});
it("ignores an older-page response after switching to another history", async () => {
  mocks.latest = page(80, 41);
  const { result, rerender } = renderHook(
    ({ credential }) => useMatchHistory(credential, match),
    { initialProps: { credential: "first" } },
  );
  let complete: (value: PublicHistoryPage) => void = () => {};
  mocks.query.mockImplementationOnce(
    () =>
      new Promise<PublicHistoryPage>((resolve) => {
        complete = resolve;
      }),
  );
  act(() => {
    result.current.loadOlder();
    result.current.loadOlder();
  });
  expect(mocks.query).toHaveBeenCalledTimes(1);
  mocks.latest = page(5, 1, true);
  rerender({ credential: "second" });
  await act(async () => complete(page(40, 1, true)));
  expect(result.current.entries.map((e) => e.revision)).toEqual([
    5, 4, 3, 2, 1,
  ]);
  expect(result.current.hasOlder).toBe(false);
});
it('jumps to the first page without loading every intermediate round',async()=>{
 mocks.latest=page(240,201);mocks.query.mockResolvedValueOnce(page(40,1,true));
 const {result}=renderHook(()=>useMatchHistory('credential',match));
 await act(async()=>{await result.current.loadBeginning?.();});
 expect(mocks.query).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({fromStart:true,limit:40}));
 expect(result.current.entries.at(-1)?.revision).toBe(1);expect(result.current.entries[0].revision).toBe(240);expect(result.current.hasOlder).toBe(true);
});
it('does not keep loading gaps removed by rollback or control revisions',async()=>{
 mocks.latest={entries:[...page(104,103).entries,...page(20,1,true).entries],nextBeforeRevision:null};
 const {result}=renderHook(()=>useMatchHistory('credential',match));
 expect(result.current.hasOlder).toBe(false);
 await act(async()=>result.current.loadOlder());
 expect(mocks.query).not.toHaveBeenCalled();
});
it('uses the server cursor across discarded ranges then reaches the beginning',async()=>{
 mocks.latest={entries:page(150,130).entries,nextBeforeRevision:130};
 mocks.query.mockResolvedValueOnce({entries:page(20,1,true).entries,nextBeforeRevision:null});
 const {result}=renderHook(()=>useMatchHistory('credential',match));
 await act(async()=>result.current.loadOlder());
 expect(result.current.entries).toHaveLength(41);expect(result.current.hasOlder).toBe(false);
});
