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

// Guard readiness toggles so a player cannot ready without a snapshot
export function validateReadyToggle(args: {
  playerId: string;
  wantReady: boolean;
  playerStates: Record<string, { fleet?: ShipSnap[]; fleetValid?: boolean } | undefined>;
}): { ok: boolean; reason?: 'missingSnapshot' | 'invalidFleet' | 'notAllowed' } {
  const { playerId, wantReady, playerStates } = args;
  if (!wantReady) return { ok: true };
  const st = playerStates[playerId];
  // Missing state or snapshot
  if (!st || !Array.isArray(st.fleet) || st.fleet.length === 0) {
    return { ok: false, reason: 'missingSnapshot' };
  }
  if (st.fleetValid === false) {
    return { ok: false, reason: 'invalidFleet' };
  }
  return { ok: true };
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
  const { winnerPlayerId, roundLog, finalA, finalB } = simulateCombat({ seed, playerAId: pA, playerBId: pB, fleetA, fleetB });
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
  const prevLives = (loserRow.lives ?? 0);
  const newLives = Math.max(0, prevLives - 1);
  if (newLives !== prevLives) {
    await ctx.db.patch(loserRow._id, { lives: newLives });
    logInfo('lives', 'decrement', { tag: roomTag(roomId as unknown as string, roundNum), playerId: loserRow.playerId, prevLives, newLives });
  }

  // Winner rewards: grant credits/materials/science for destroyed enemy ships
  function rewardForFrame(id: string) {
    if (id === 'interceptor') return { c: 22, m: 2, s: 1 } as const;
    if (id === 'cruiser') return { c: 32, m: 3, s: 2 } as const;
    if (id === 'dread') return { c: 52, m: 4, s: 3 } as const;
    return { c: 0, m: 0, s: 0 } as const;
  }
  const loserSnaps = winnerPlayerId === pA ? finalB : finalA;
  // Count rewards only for ships that ended dead on the losing side
  let rc = 0, rm = 0, rs = 0;
  for (const s of loserSnaps) {
    if (!s.alive || s.hull <= 0) {
      const r = rewardForFrame(s.frame.id);
      rc += r.c; rm += r.m; rs += r.s;
    }
  }
  const statesAfter = { ...pStates } as Record<string, { resources?: { credits: number; materials: number; science: number } }>;
  const curr = statesAfter[winnerPlayerId]?.resources || { credits: 0, materials: 0, science: 0 };
  statesAfter[winnerPlayerId] = {
    ...statesAfter[winnerPlayerId],
    resources: { credits: (curr.credits || 0) + rc, materials: (curr.materials || 0) + rm, science: (curr.science || 0) + rs },
  } as any;

  await ctx.db.patch(gs._id, {
    gamePhase: "combat",
    roundSeed: seed,
    roundLog,
    acks: {},
    playerStates: statesAfter,
    matchResult: newLives === 0 ? { winnerPlayerId } : undefined,
    pendingFinish: newLives === 0 ? true : undefined,
    lastUpdate: Date.now(),
  });

  if (newLives === 0) {
    // Do not mark the room as finished yet; allow clients to view final combat first.
    logInfo('combat', 'final round — pending finish', { tag: roomTag(roomId as unknown as string, roundNum) });
  }

  return true;
}
