import { mutation, query, type DatabaseReader, type DatabaseWriter } from "./_generated/server";
import { v } from "convex/values";
// Legacy auto-start removed to prevent premature combat during Outpost
import { logInfo, roomTag } from "./helpers/log";
import { maybeResolveRound } from "./helpers/resolve";
import type { ShipSnap } from "./engine/combat";

// Build a minimal interceptor snapshot used for multiplayer seeding
export function makeBasicInterceptorSnap(): ShipSnap {
  return {
    frame: { id: 'interceptor', name: 'Interceptor' },
    weapons: [{ name: 'Plasma', dice: 1, dmgPerHit: 1, faces: [{ roll: 6 }] }],
    riftDice: 0,
    stats: { init: 1, hullCap: 1, valid: true, aim: 1, shieldTier: 0, regen: 0 },
    hull: 1,
    alive: true,
  };
}

export function makeStartingFleetSnaps(count: number): ShipSnap[] {
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, () => makeBasicInterceptorSnap());
}

export const initializeGameState = mutation({
  args: { 
    roomId: v.id("rooms"),
    gameConfig: v.object({
      startingShips: v.number(),
      livesPerPlayer: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    logInfo('init', 'initializeGameState called', { tag: roomTag(args.roomId as unknown as string) });
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (players.length !== 2) {
      throw new Error("Need exactly 2 players to initialize game state");
    }

    // Create initial player states based on multiplayer configuration
    const initialPlayerStates: Record<string, unknown> = {};
    
    for (const player of players) {
      const starting = Math.max(1, args.gameConfig.startingShips || 1);
      initialPlayerStates[player.playerId] = {
        resources: { credits: 20, materials: 5, science: 0 },
        research: { Military: 1, Grid: 1, Nano: 1 },
        lives: player.lives,
        fleet: makeStartingFleetSnaps(starting),
        fleetValid: true,
        blueprints: {
          interceptor: [], // Will contain default interceptor parts
          cruiser: [],
          dread: [],
        },
        isAlive: true,
        sector: 1,
        graceUsed: false,
      };
      // Log per-player seed counts for diagnostics
      try { logInfo('init', 'seeded', { tag: roomTag(args.roomId as unknown as string), playerId: player.playerId, count: starting }); } catch {}
    }

    // Set first player as starting player
    const startingPlayer = players.find(p => p.isHost) || players[0];

    await ctx.db.insert("gameState", {
      roomId: args.roomId,
      currentTurn: startingPlayer.playerId,
      gamePhase: "setup",
      playerStates: initialPlayerStates,
      combatQueue: [],
      roundNum: 1,
      lastUpdate: Date.now(),
    });
    logInfo('init', 'gameState inserted', { tag: roomTag(args.roomId as unknown as string), startingPlayer: startingPlayer.playerId });

    return true;
  },
});

export const getGameState = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    return gameState;
  },
});

export const updatePlayerFleetValidity = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), fleetValid: v.boolean() },
  handler: async (ctx, args) => {
    let gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    // Create a placeholder gameState during setup if missing
    if (!gameState) {
      await ctx.db.insert("gameState", {
        roomId: args.roomId,
        currentTurn: args.playerId,
        gamePhase: "setup",
        playerStates: {},
        combatQueue: [],
        roundNum: 1,
        lastUpdate: Date.now(),
      });
      // Fetch the inserted record (ctx.db.insert returns id)
      gameState = await ctx.db
        .query("gameState")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .first();
    }

    const playerStates = { ...(gameState!.playerStates as Record<string, unknown>) };
    const prev = (playerStates[args.playerId] as Record<string, unknown>) || {};
    playerStates[args.playerId] = { ...prev, fleetValid: args.fleetValid };

    await ctx.db.patch(gameState!._id, { playerStates, lastUpdate: Date.now() });
    logInfo('valid', 'fleet validity updated', { tag: roomTag(args.roomId as unknown as string), playerId: args.playerId, fleetValid: args.fleetValid });
    // Do not auto-start combat here; combat starts only when both players Ready in Outpost and snapshots exist.
    return true;
  },
});

export const updateGameState = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    updates: v.object({
      resources: v.optional(v.object({
        credits: v.number(),
        materials: v.number(),
        science: v.number(),
      })),
      research: v.optional(v.object({
        Military: v.number(),
        Grid: v.number(),
        Nano: v.number(),
      })),
      fleet: v.optional(v.any()),
      blueprints: v.optional(v.any()),
      sector: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // Allow updates regardless of turn so both players can outfit concurrently

    // Update the player's state
    const updatedPlayerStates = { ...gameState.playerStates };
    updatedPlayerStates[args.playerId] = {
      ...updatedPlayerStates[args.playerId],
      ...args.updates,
    };

    await ctx.db.patch(gameState._id, {
      playerStates: updatedPlayerStates,
      lastUpdate: Date.now(),
    });
    logInfo('state', 'player updated state', { tag: roomTag(args.roomId as unknown as string), playerId: args.playerId, keys: Object.keys(args.updates) });

    return true;
  },
});

export const switchTurn = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const currentPlayerIndex = players.findIndex(p => p.playerId === gameState.currentTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];

    await ctx.db.patch(gameState._id, {
      currentTurn: nextPlayer.playerId,
      lastUpdate: Date.now(),
    });

    return nextPlayer.playerId;
  },
});

export const updateGamePhase = mutation({
  args: {
    roomId: v.id("rooms"),
    phase: v.union(v.literal("setup"), v.literal("combat"), v.literal("finished")),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    await ctx.db.patch(gameState._id, {
      gamePhase: args.phase,
      lastUpdate: Date.now(),
    });
    logInfo('phase', 'phase changed', { tag: roomTag(args.roomId as unknown as string), phase: args.phase });

    return true;
  },
});

export const endCombatToSetup = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // Rotate the current turn to the next player for the next setup phase
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Reset readiness for both players; keep room in playing status
    for (const p of players) {
      await ctx.db.patch(p._id, { isReady: false });
    }

    await ctx.db.patch(gameState._id, {
      gamePhase: "setup",
      roundNum: (gameState.roundNum || 1) + 1,
      // currentTurn retained but not used for outpost; no rotation needed
      lastUpdate: Date.now(),
    });

    return true;
  },
});

export const resolveCombatResult = mutation({
  args: { roomId: v.id("rooms"), winnerPlayerId: v.string() },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!gameState) throw new Error("Game state not found");
    if (gameState.gamePhase !== "combat") {
      // Already processed this round
      return { processed: false };
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (players.length !== 2) throw new Error("Expected two players");
    const winner = players.find(p => p.playerId === args.winnerPlayerId);
    if (!winner) throw new Error("Winner not found in room");
    const loser = players.find(p => p.playerId !== args.winnerPlayerId)!;

    const newLives = Math.max(0, (loser.lives ?? 0) - 1);
    await ctx.db.patch(loser._id, { lives: newLives });

    // Update per-player state lives if present
    const states = { ...(gameState.playerStates as Record<string, unknown>) } as Record<string, { [k: string]: unknown }>;
    if (states[loser.playerId]) {
      states[loser.playerId] = { ...states[loser.playerId], lives: newLives };
    }

    // Archive winner fleet snapshot if available
    const winnerState = (states[winner.playerId] as { fleet?: unknown; sector?: number } | undefined);
    if (winnerState?.fleet) {
      await ctx.db.insert("fleetArchives", {
        roomId: args.roomId,
        roundNum: (gameState.roundNum || 1),
        createdAt: Date.now(),
        fleet: winnerState.fleet,
        sector: winnerState.sector,
      });
    }

    if (newLives === 0) {
      await ctx.db.patch(args.roomId, { status: "finished" });
      await ctx.db.patch(gameState._id, {
        gamePhase: "finished",
        playerStates: states,
        lastUpdate: Date.now(),
      });
      return { processed: true, finished: true, loserLives: newLives };
    }

    // Otherwise loop back to setup
    for (const p of players) {
      await ctx.db.patch(p._id, { isReady: false });
    }
    await ctx.db.patch(gameState._id, {
      gamePhase: "setup",
      roundNum: (gameState.roundNum || 1) + 1,
      playerStates: states,
      lastUpdate: Date.now(),
    });

    return { processed: true, finished: false, loserLives: newLives };
  },
});

export const submitFleetSnapshot = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), fleet: v.any(), fleetValid: v.boolean() },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!gameState) throw new Error("Game state not found");

    const playerStates = { ...(gameState.playerStates as Record<string, unknown>) };
    const prev = (playerStates[args.playerId] as Record<string, unknown>) || {};
    playerStates[args.playerId] = { ...prev, fleet: args.fleet, fleetValid: args.fleetValid };

    await ctx.db.patch(gameState._id, { playerStates, lastUpdate: Date.now() });
    logInfo('snapshot', 'fleet snapshot submitted', { tag: roomTag(args.roomId as unknown as string), playerId: args.playerId, count: Array.isArray(args.fleet) ? (args.fleet as unknown[]).length : 0, fleetValid: args.fleetValid });
    // If both players are ready and snapshots exist, resolve now
    await maybeResolveRound(ctx as unknown as { db: DatabaseReader & DatabaseWriter }, args.roomId);
    return true;
  },
});

export const ackRoundPlayed = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    const gs = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (!gs) throw new Error("Game state not found");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const acksSource = (gs.acks as Record<string, boolean> | undefined) || {};
    const acks: Record<string, boolean> = { ...acksSource };
    acks[args.playerId] = true;

    // If all players ack'd, go back to setup (or finish match if pending)
    const allAck = players.every(p => acks[p.playerId]);
    if (allAck === true) {
      const pendingFinish = Boolean((gs as any).pendingFinish);
      if (pendingFinish) {
        // Mark room finished now and show match over; clear readiness
        for (const p of players) {
          await ctx.db.patch(p._id, { isReady: false });
        }
        await ctx.db.patch(args.roomId, { status: "finished" });
        await ctx.db.patch(gs._id, {
          gamePhase: "finished",
          pendingFinish: undefined,
          lastUpdate: Date.now(),
        });
        logInfo('ack', 'final combat acked — match finished', { tag: roomTag(args.roomId as unknown as string) });
        return { done: true, finished: true } as any;
      } else {
        const resetReadiness: Promise<void>[] = [];
        for (const p of players) {
          resetReadiness.push(ctx.db.patch(p._id, { isReady: false }));
        }
        await Promise.all(resetReadiness);
        await ctx.db.patch(gs._id, {
          gamePhase: "setup",
          roundLog: undefined,
          acks: {},
          roundNum: (gs.roundNum || 1) + 1,
          lastUpdate: Date.now(),
        });
        logInfo('ack', 'all players acked — back to setup', { tag: roomTag(args.roomId as unknown as string), nextRound: (gs.roundNum || 1) + 1 });
        return { done: true };
      }
    }

    await ctx.db.patch(gs._id, { acks, lastUpdate: Date.now() });
    logInfo('ack', 'player acked round', { tag: roomTag(args.roomId as unknown as string), playerId: args.playerId });
    return { done: false };
  },
});
