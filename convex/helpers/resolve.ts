import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { logInfo, roomTag } from "./log";
import { simulateCombat, type ShipSnap } from "../engine/combat";

export type PlayerRow = { playerId: string; isReady: boolean };
export type GameStateLike = { gamePhase: 'setup'|'combat'|'finished'; roundNum?: number; playerStates: Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean }> };

export function computeResolvePlan(players: PlayerRow[], gs: GameStateLike) {
  const inSetup = gs.gamePhase === 'setup';
  const bothReady = players.length === 2 && players.every(p => p.isReady);
  const haveSnapshots = players.length === 2 && players.every(p => Array.isArray(gs.playerStates[p.playerId]?.fleet));
  const allValid = players.length === 2 && players.every(p => gs.playerStates[p.playerId]?.fleetValid !== false);
  const ok = Boolean(inSetup && bothReady && haveSnapshots && allValid);
  return { ok, flags: { inSetup, bothReady, haveSnapshots, allValid } } as const;
}

type Ctx = { db: DatabaseReader & DatabaseWriter };

export async function maybeResolveRound(ctx: Ctx, roomId: Id<"rooms">) {
  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  if (players.length !== 2) return false;

  const gs = await ctx.db
    .query("gameState")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .first();
  if (!gs) return false;

  if (gs.gamePhase !== "setup") return false;

  const pStates = (gs.playerStates as Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean; sector?: number }>);
  const plan = computeResolvePlan(players as PlayerRow[], { gamePhase: gs.gamePhase as 'setup'|'combat'|'finished', roundNum: gs.roundNum, playerStates: pStates });
  if (!plan.ok) {
    logInfo('combat', 'preconditions not met', { tag: roomTag(roomId as unknown as string, gs.roundNum || 1), ...plan.flags });
    return false;
  }

  const roundNum = gs.roundNum || 1;
  const seed = `${roomId}:${roundNum}:${Date.now()}`;
  const pA = players[0].playerId, pB = players[1].playerId;
  const fleetA = (pStates[pA]?.fleet as ShipSnap[]) || [];
  const fleetB = (pStates[pB]?.fleet as ShipSnap[]) || [];

  logInfo('combat', 'starting resolve', { tag: roomTag(roomId as unknown as string, roundNum), ...plan.flags });
  const { winnerPlayerId, roundLog } = simulateCombat({ seed, playerAId: pA, playerBId: pB, fleetA, fleetB });
  const loserRow = players.find(p => p.playerId !== winnerPlayerId)!;
  logInfo('combat', 'resolved', { tag: roomTag(roomId as unknown as string, roundNum), winnerPlayerId, loserId: loserRow.playerId, seed });

  // Archive winner fleet snapshot
  const winnerState = pStates[winnerPlayerId] as { fleet?: unknown, sector?: number } | undefined;
  if (winnerState?.fleet) {
    await ctx.db.insert("fleetArchives", {
      roomId,
      roundNum,
      createdAt: Date.now(),
      fleet: winnerState.fleet,
      sector: winnerState.sector,
    });
  }

  // Decrement loser lives
  const newLives = Math.max(0, (loserRow.lives ?? 0) - 1);
  await ctx.db.patch(loserRow._id, { lives: newLives });

  await ctx.db.patch(gs._id, {
    gamePhase: newLives === 0 ? "finished" : "combat",
    roundSeed: seed,
    roundLog,
    acks: {},
    lastUpdate: Date.now(),
  });

  if (newLives === 0) {
    await ctx.db.patch(roomId, { status: "finished" });
    logInfo('combat', 'match finished', { tag: roomTag(roomId as unknown as string, roundNum) });
  }

  return true;
}
