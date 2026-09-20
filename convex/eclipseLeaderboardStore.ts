import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { GameState } from "../shared/eclipse/types";
import { rankScores } from "../shared/eclipse/scoring";
import {
  calculateRatingDeltas,
  INITIAL_RATING,
} from "../shared/eclipse/ratings";

type Contribution = Doc<"eclipseRatingResultsV1">["contributions"][number];
async function applyContribution(
  ctx: MutationCtx,
  contribution: Contribution,
  direction: 1 | -1,
): Promise<void> {
  const current = await ctx.db
    .query("eclipsePlayerStatsV1")
    .withIndex("by_guest", (q) => q.eq("guestId", contribution.guestId))
    .unique();
  if (direction === -1 && !current)
    throw new Error("Rating contribution has no statistics row.");
  const games = (current?.games ?? 0) + direction,
    wins = (current?.wins ?? 0) + direction * contribution.wins;
  if (games === 0) {
    if (current) await ctx.db.delete(current._id);
    return;
  }
  const factionWins = (current?.factionWins ?? []).map((record) => ({
    ...record,
  }));
  const faction = factionWins.find(
    (record) => record.faction === contribution.faction,
  );
  if (faction) {
    faction.games += direction;
    faction.wins += direction * contribution.wins;
  } else if (direction === 1)
    factionWins.push({
      faction: contribution.faction,
      games: 1,
      wins: contribution.wins,
    });
  else throw new Error("Rating contribution has no faction record.");
  const value = {
    guestId: contribution.guestId,
    rating:
      (current?.rating ?? INITIAL_RATING) +
      direction * contribution.ratingDelta,
    games,
    wins,
    winRate: wins / games,
    factionWins: factionWins.filter((record) => record.games > 0),
    updatedAt: Date.now(),
  };
  if (current) await ctx.db.patch(current._id, value);
  else await ctx.db.insert("eclipsePlayerStatsV1", value);
}

/** Same mutation as snapshot persistence: finalization is idempotent; undo reverses only this ledger. */
export async function syncLeaderboardResult(
  ctx: MutationCtx,
  matchId: Id<"eclipseMatchesV1">,
  state: GameState,
): Promise<boolean> {
  const existing = await ctx.db
    .query("eclipseRatingResultsV1")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .unique();
  if (state.phase !== "finished") {
    if (!existing) return false;
    for (const contribution of existing.contributions)
      await applyContribution(ctx, contribution, -1);
    await ctx.db.delete(existing._id);
    return true;
  }
  if (existing) return false;
  const match = await ctx.db.get(matchId);
  if (!match || match.lifecycle === "abandoned") return false;
  const ownerships = await ctx.db
    .query("eclipseOwnershipV1")
    .withIndex("by_match_guest", (q) => q.eq("matchId", matchId))
    .collect();
  const uniqueOwners = [
    ...new Map(ownerships.map((owner) => [owner.guestId, owner])).values(),
  ];
  if (uniqueOwners.length < 2) return false;
  const ranks = rankScores(state.engine?.scores ?? []);
  const entries = [];
  for (const owner of uniqueOwners) {
    const seat = state.seats.find((candidate) => candidate.id === owner.seatId);
    const rank = ranks.find((candidate) =>
      candidate.players.includes(owner.seatId),
    );
    if (!seat || !rank)
      throw new Error(
        "Finished multiplayer match is missing a participant score.",
      );
    const statistics = await ctx.db
      .query("eclipsePlayerStatsV1")
      .withIndex("by_guest", (q) => q.eq("guestId", owner.guestId))
      .unique();
    entries.push({
      owner,
      seat,
      place: rank.place,
      rating: statistics?.rating ?? INITIAL_RATING,
    });
  }
  const changes = calculateRatingDeltas(
    entries.map((entry) => ({
      playerId: entry.owner.guestId,
      rating: entry.rating,
      place: entry.place,
      resigned: entry.owner.resignedAt !== undefined,
    })),
  );
  const contributions: Contribution[] = entries.map((entry) => ({
    guestId: entry.owner.guestId,
    faction: entry.seat.faction,
    ratingDelta: changes.find(
      (change) => change.playerId === entry.owner.guestId,
    )!.delta,
    wins: Number(entry.place === 1 && entry.owner.resignedAt === undefined),
  }));
  for (const contribution of contributions)
    await applyContribution(ctx, contribution, 1);
  await ctx.db.insert("eclipseRatingResultsV1", {
    matchId,
    revision: state.revision,
    awardedAt: Date.now(),
    contributions,
  });
  return true;
}
