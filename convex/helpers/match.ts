import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { canStartCombat } from "./ready";

type Ctx = { db: DatabaseReader & DatabaseWriter };

export async function maybeStartCombat(ctx: Ctx, roomId: Id<"rooms">) {
  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  const gs = await ctx.db
    .query("gameState")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .first();

  const states = (gs?.playerStates as Record<string, { fleetValid?: boolean }> | undefined) || {};
  const simplePlayers = players.map((p) => ({ playerId: p.playerId, isReady: p.isReady }));

  if (!canStartCombat(simplePlayers, states)) return false;

  // Transition to combat
  await ctx.db.patch(roomId, { status: "playing" });

  if (gs) {
    await ctx.db.patch(gs._id, { gamePhase: "combat", roundNum: 1, lastUpdate: Date.now() });
  } else {
    await ctx.db.insert("gameState", {
      roomId: roomId,
      currentTurn: simplePlayers[0].playerId,
      gamePhase: "combat",
      playerStates: states,
      combatQueue: [],
      roundNum: 1,
      lastUpdate: Date.now(),
    });
  }
  return true;
}
