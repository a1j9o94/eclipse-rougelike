import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PublicHistoryEntry } from "../../shared/eclipse/history";
export interface HistoryFeed {
  entries: PublicHistoryEntry[];
  loading: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  error: string | null;
  loadOlder: () => void;
}
interface HistoryCache {
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
/** Every accepted revision has one journal row, including redacted private decisions.
 * Refill the newest gap first; a previously reached end never hides reconnect gaps. */
function missingCursor(entries: PublicHistoryEntry[]): number | null {
  for (let i = 1; i < entries.length; i++)
    if (entries[i - 1].revision > entries[i].revision + 1)
      return entries[i - 1].revision;
  const oldest = entries[entries.length - 1]?.revision;
  return oldest !== undefined && oldest > 1 ? oldest : null;
}
export function useMatchHistory(
  credential: string | null,
  matchId: Id<"eclipseMatchesV1"> | null,
): HistoryFeed {
  const client = useConvex();
  const key = credential && matchId ? `${credential}:${matchId}` : null;
  const latest = useQuery(
    api.eclipseMatches.getMatchHistory,
    credential && matchId ? { credential, matchId, limit: 40 } : "skip",
  );
  const [cache, setCache] = useState<HistoryCache>({
    key: null,
    entries: [],
    loading: false,
    error: null,
  });
  const inFlight = useRef<string | null>(null);
  useEffect(() => {
    if (!key || latest === null) {
      setCache({ key, entries: [], loading: false, error: null });
      return;
    }
    if (!latest) return;
    setCache((current) =>
      current.key === key
        ? {
            ...current,
            entries: merge([...current.entries, ...latest.entries]),
          }
        : { key, entries: latest.entries, loading: false, error: null },
    );
  }, [key, latest]);
  const current = key && cache.key === key && latest !== null ? cache : null;
  const entries =
    key && latest !== null
      ? merge([...(current?.entries ?? []), ...(latest?.entries ?? [])])
      : [];
  const cursor = missingCursor(entries);
  async function loadOlder() {
    if (
      !credential ||
      !matchId ||
      !key ||
      cursor === null ||
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
        beforeRevision: cursor,
        limit: 40,
      });
      if (!page) throw Error("This match history is unavailable.");
      setCache((c) =>
        c.key === requestKey
          ? {
              ...c,
              entries: merge([...c.entries, ...page.entries]),
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
    loadOlder: () => {
      void loadOlder();
    },
  };
}
