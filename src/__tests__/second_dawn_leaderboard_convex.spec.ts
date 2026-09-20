import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { createGame } from "../../shared/eclipse/setup";
import { scoreSeat } from "../../shared/eclipse/rounds";
import { syncLeaderboardResult } from "../../convex/eclipseLeaderboardStore";
import type { GameState } from "../../shared/eclipse/types";
const modules = import.meta.glob("../../convex/**/*.{ts,js}");
function finished() {
  const state = createGame({
    seed: 45,
    warpPortals: false,
    seats: [
      { id: "a", faction: "eridani", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
      { id: "c", faction: "planta", controller: "ai" },
    ],
  });
  state.phase = "finished";
  state.engine!.scores = state.seats.map((seat, i) => ({
    ...scoreSeat(state, seat),
    total: 30 - i * 10,
    resourceTotal: 0,
  }));
  return state;
}
async function fixture(humans = 2) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const a = await ctx.db.insert("eclipseGuestsV1", {
        credentialHash: "a",
        createdAt: 1,
      }),
      b = await ctx.db.insert("eclipseGuestsV1", {
        credentialHash: "b",
        createdAt: 1,
      });
    const state = finished();
    const matchId = await ctx.db.insert("eclipseMatchesV1", {
      snapshotJson: JSON.stringify(state),
      rulesVersion: state.rulesVersion,
      catalogVersion: state.catalogVersion,
      revision: 0,
      round: 8,
      phase: "finished",
      createdAt: 1,
      updatedAt: 100,
    });
    await ctx.db.insert("eclipseOwnershipV1", {
      matchId,
      guestId: a,
      seatId: "a",
    });
    if (humans === 2)
      await ctx.db.insert("eclipseOwnershipV1", {
        matchId,
        guestId: b,
        seatId: "b",
      });
    return { a, b, matchId };
  });
  return { t, ...ids };
}
it("awards only original humans even after takeover and is idempotent across backfill repeats", async () => {
  const { t, matchId } = await fixture();
  await t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  await t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  const { rows } = await t.query(api.eclipseLeaderboard.getLeaderboard, {
    sort: "rating",
  });
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    username: "Guest player",
    rating: 1016,
    games: 1,
    wins: 1,
    winRate: 1,
    factionWins: [{ faction: "eridani", games: 1, wins: 1 }],
  });
  expect(rows[1]).toMatchObject({ rating: 984, games: 1, wins: 0 });
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("eclipseRatingResultsV1")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .collect(),
    ),
  ).toHaveLength(1);
});
it("excludes solo and abandoned games entirely", async () => {
  const { t } = await fixture(1);
  await t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  expect(
    await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "wins" }),
  ).toEqual({ rows: [] });
  const other = await fixture();
  await other.t.run((ctx) =>
    ctx.db.patch(other.matchId, { lifecycle: "abandoned" }),
  );
  await other.t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  expect(
    await other.t.query(api.eclipseLeaderboard.getLeaderboard, {
      sort: "rating",
    }),
  ).toEqual({ rows: [] });
});
it("does not award a human win when an AI wins and places resignations below remaining humans", async () => {
  const { t, matchId, a, b } = await fixture();
  await t.run(async (ctx) => {
    const row = await ctx.db.get(matchId),
      state = JSON.parse(row!.snapshotJson) as GameState;
    state.engine!.scores = state.engine!.scores!.map((score) =>
      score.playerId === "c" ? { ...score, total: 100 } : score,
    );
    await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    const ownership = await ctx.db
      .query("eclipseOwnershipV1")
      .withIndex("by_match_guest", (q) =>
        q.eq("matchId", matchId).eq("guestId", a),
      )
      .unique();
    await ctx.db.patch(ownership!._id, {
      resignedAt: 50,
      resignationOutcome: "resigned",
    });
  });
  await t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  const { rows } = await t.query(api.eclipseLeaderboard.getLeaderboard, {
    sort: "rating",
  });
  expect(rows.every((r) => r.wins === 0)).toBe(true);
  expect(rows.map((r) => r.rating)).toEqual([1016, 984]);
  expect(rows[0].playerId).toBe(b);
});
it("reverses an old result without rebuilding later awards, and re-finish records exactly one new contribution", async () => {
  const { t, matchId, a } = await fixture();
  await t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  const second = await t.run(async (ctx) => {
    const original = await ctx.db.get(matchId);
    const id = await ctx.db.insert("eclipseMatchesV1", {
      snapshotJson: original!.snapshotJson,
      rulesVersion: original!.rulesVersion,
      catalogVersion: original!.catalogVersion,
      phase: "finished",
      round: 8,
      revision: 0,
      createdAt: 2,
      updatedAt: 200,
    });
    for (const owner of await ctx.db
      .query("eclipseOwnershipV1")
      .withIndex("by_match_guest", (q) => q.eq("matchId", matchId))
      .collect())
      await ctx.db.insert("eclipseOwnershipV1", {
        matchId: id,
        guestId: owner.guestId,
        seatId: owner.seatId,
      });
    return id;
  });
  await t.mutation(internal.eclipseLeaderboard.backfillPage, {});
  const later = await t.run((ctx) =>
    ctx.db
      .query("eclipseRatingResultsV1")
      .withIndex("by_match", (q) => q.eq("matchId", second))
      .unique(),
  );
  await t.run(async (ctx) => {
    const state = finished();
    state.phase = "upkeep";
    await syncLeaderboardResult(ctx, matchId, state);
  });
  const after = await t.query(api.eclipseLeaderboard.getLeaderboard, {
    sort: "rating",
  });
  expect(after.rows.find((r) => r.playerId === a)).toMatchObject({
    games: 1,
    wins: 1,
    rating:
      1000 + later!.contributions.find((c) => c.guestId === a)!.ratingDelta,
  });
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("eclipseRatingResultsV1")
        .withIndex("by_match", (q) => q.eq("matchId", second))
        .unique(),
    ),
  ).toEqual(later);
  await t.run((ctx) => syncLeaderboardResult(ctx, matchId, finished()));
  await t.run((ctx) => syncLeaderboardResult(ctx, matchId, finished()));
  expect(
    (
      await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" })
    ).rows.every((r) => r.games === 2),
  ).toBe(true);
});
it("reads current registered names and limits each backfill page", async () => {
  const { t, a } = await fixture();
  await t.mutation(internal.eclipseLeaderboard.backfillPage, { limit: 1 });
  await t.run((ctx) =>
    ctx.db.insert("eclipsePlayersV1", {
      guestId: a,
      username: "Commander A",
      normalizedUsername: "commander a",
      recoveryHash: "private",
      createdAt: 200,
    }),
  );
  const result = await t.query(api.eclipseLeaderboard.getLeaderboard, {
    sort: "win-rate",
  });
  expect(result.rows[0].username).toBe("Commander A");
  expect(JSON.stringify(result)).not.toMatch(
    /credential|recoveryHash|snapshotJson/,
  );
});

it("ranks the complete population on the server before selecting the top 100", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (let i = 0; i < 105; i++) {
      const guestId = await ctx.db.insert("eclipseGuestsV1", {
        credentialHash: String(i),
        createdAt: i,
      });
      await ctx.db.insert("eclipsePlayerStatsV1", {
        guestId,
        rating: 1100 - i,
        games: 105,
        wins: i,
        winRate: i / 105,
        factionWins: [{ faction: "eridani", games: 105, wins: i }],
        updatedAt: i,
      });
    }
  });
  const ratings = await t.query(api.eclipseLeaderboard.getLeaderboard, {
      sort: "rating",
    }),
    wins = await t.query(api.eclipseLeaderboard.getLeaderboard, {
      sort: "wins",
    }),
    rates = await t.query(api.eclipseLeaderboard.getLeaderboard, {
      sort: "win-rate",
    });
  expect(ratings.rows).toHaveLength(100);
  expect(ratings.rows[0].rating).toBe(1100);
  expect(wins.rows[0].wins).toBe(104);
  expect(rates.rows[0].winRate).toBe(104 / 105);
  expect(
    ratings.rows.some((row) => row.playerId === wins.rows[0].playerId),
  ).toBe(false);
});
