import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { LeaderboardResult } from "../shared/eclipse/ratings";
import type { GameState } from "../shared/eclipse/types";
import { syncLeaderboardResult } from "./eclipseLeaderboardStore";

export const getLeaderboard = query({
  args: {
    sort: v.union(
      v.literal("rating"),
      v.literal("wins"),
      v.literal("win-rate"),
    ),
  },
  handler: async (ctx, { sort }): Promise<LeaderboardResult> => {
    const index =
      sort === "rating"
        ? "by_rating"
        : sort === "wins"
          ? "by_wins"
          : "by_win_rate";
    const statistics = await ctx.db
      .query("eclipsePlayerStatsV1")
      .withIndex(index)
      .order("desc")
      .take(100);
    const rows = await Promise.all(
      statistics.map(async (row) => {
        const profile = await ctx.db
          .query("eclipsePlayersV1")
          .withIndex("by_guest", (q) => q.eq("guestId", row.guestId))
          .unique();
        return {
          playerId: row.guestId,
          username: profile?.username ?? "Guest player",
          rating: row.rating,
          games: row.games,
          wins: row.wins,
          winRate: row.winRate,
          factionWins: row.factionWins,
        };
      }),
    );
    return { rows };
  },
});

/** Operator-only bounded migration; continue using nextCursor until isDone. */
export const backfillPage = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    nextCursor: string;
    isDone: boolean;
    examined: number;
    awarded: number;
  }> => {
    const limit = Math.max(1, Math.min(25, Math.floor(args.limit ?? 10)));
    const page = await ctx.db
      .query("eclipseMatchesV1")
      .withIndex("by_phase_updated", (q) => q.eq("phase", "finished"))
      .order("asc")
      .paginate({ cursor: args.cursor ?? null, numItems: limit });
    let awarded = 0;
    for (const match of page.page) {
      if (match.lifecycle === "abandoned") continue;
      const state = JSON.parse(match.snapshotJson) as GameState;
      if (await syncLeaderboardResult(ctx, match._id, state)) awarded++;
    }
    return {
      nextCursor: page.continueCursor,
      isDone: page.isDone,
      examined: page.page.length,
      awarded,
    };
  },
});
