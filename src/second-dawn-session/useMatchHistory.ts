import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PublicHistoryEntry, PublicHistoryPage } from "../../shared/eclipse/history";
export interface HistoryFeed {
  entries: PublicHistoryEntry[];
  loading: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  error: string | null;
  loadOlder: () => void;
  loadBeginning?:()=>Promise<void>;
}
interface Coverage { lower: number; upper: number }
interface HistoryCache {
  coverage: Coverage[];
  key: string | null;
  entries: PublicHistoryEntry[];
  loading: boolean;
  error: string | null;
}
function merge(entries: PublicHistoryEntry[]): PublicHistoryEntry[] {
  return [
    ...new Map(entries.map((entry) => [entry.revision, entry])).values(),
  ].sort((a, b) => b.revision - a.revision);
}
/** Track fetched intervals, not contiguous revisions: undo removes entire ranges. */
function coverageFor(page: PublicHistoryPage, before?: number, fromStart=false): Coverage {
  return { lower: fromStart ? 0 : page.nextBeforeRevision ?? 0,
    upper: before ?? ((page.entries[0]?.revision ?? 0) + 1) };
}
function mergeCoverage(ranges: Coverage[]): Coverage[] {
  const result: Coverage[]=[];
  for(const range of [...ranges].sort((a,b)=>b.upper-a.upper)){
    const last=result.at(-1);
    if(last && range.upper>=last.lower) last.lower=Math.min(last.lower,range.lower);
    else result.push({...range});
  }
  return result;
}
function missingCursor(coverage: Coverage[]): number | null {
  return mergeCoverage(coverage)[0]?.lower || null;
}
export function useMatchHistory(
  credential: string | null,
  matchId: Id<"eclipseMatchesV1"> | null,
  resetRevision=0,
): HistoryFeed {
  const client = useConvex();
  const key = credential && matchId ? `${credential}:${matchId}:${resetRevision}` : null;
  const latest = useQuery(
    api.eclipseMatches.getMatchHistory,
    credential && matchId ? { credential, matchId, limit: 40 } : "skip",
  );
  const [cache, setCache] = useState<HistoryCache>({
    key: null,
    coverage: [],
    entries: [],
    loading: false,
    error: null,
  });
  const inFlight = useRef<string | null>(null);
  useEffect(() => {
    if (!key || latest === null) {
      setCache({ key, coverage: [], entries: [], loading: false, error: null });
      return;
    }
    if (!latest) return;
    setCache((current) =>
      current.key === key
        ? {
            ...current,
            entries: merge([...current.entries, ...latest.entries]),
            coverage: mergeCoverage([...current.coverage,coverageFor(latest)]),
          }
        : { key, entries: latest.entries, coverage: [coverageFor(latest)], loading: false, error: null },
    );
  }, [key, latest]);
  const current = key && cache.key === key && latest !== null ? cache : null;
  const entries =
    key && latest !== null
      ? merge([...(current?.entries ?? []), ...(latest?.entries ?? [])])
      : [];
  const cursor = missingCursor([...(current?.coverage??[]),...(latest?[coverageFor(latest)]:[])]);
  async function loadPage(fromStart=false) {
    if (
      !credential ||
      !matchId ||
      !key ||
      (!fromStart && cursor === null) ||
      current?.loading ||
      inFlight.current === key
    )
      return;
    const requestKey = key;
    inFlight.current = requestKey;
    setCache((c) =>
      c.key === requestKey ? { ...c, loading: true, error: null } : c,
    );
    try {
      const page = await client.query(api.eclipseMatches.getMatchHistory, {
        credential,
        matchId,
        ...(fromStart?{fromStart:true}:{beforeRevision:cursor!}),
        limit: 40,
      });
      if (!page) throw Error("This match history is unavailable.");
      setCache((c) =>
        c.key === requestKey
          ? {
              ...c,
              entries: merge([...c.entries, ...page.entries]),
              coverage: mergeCoverage([...c.coverage,coverageFor(page,fromStart?undefined:cursor!,fromStart)]),
              loading: false,
            }
          : c,
      );
    } catch (error) {
      setCache((c) =>
        c.key === requestKey
          ? {
              ...c,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Could not load earlier actions.",
            }
          : c,
      );
    } finally {
      if (inFlight.current === requestKey) inFlight.current = null;
    }
  }
  return {
    entries,
    loading: !!key && latest === undefined,
    hasOlder: cursor !== null,
    loadingOlder: current?.loading ?? false,
    error: current?.error ?? null,
    loadOlder: () => { void loadPage(); },
    loadBeginning:()=>loadPage(true),
  };
}
