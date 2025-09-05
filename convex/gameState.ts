import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const initializeGameState = mutation({
  args: { 
    roomId: v.id("rooms"),
    gameConfig: v.object({
      startingShips: v.number(),
      livesPerPlayer: v.number(),
    }),
  },
  handler: async (ctx, args) => {
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
      initialPlayerStates[player.playerId] = {
        resources: { credits: 20, materials: 5, science: 0 },
        research: { Military: 1, Grid: 1, Nano: 1 },
        lives: player.lives,
        fleet: [], // Will be populated with starting interceptors
        blueprints: {
          interceptor: [], // Will contain default interceptor parts
          cruiser: [],
          dread: [],
        },
        isAlive: true,
        sector: 1,
        graceUsed: false,
      };
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

    // Verify it's the player's turn (for actions that require it)
    if (gameState.currentTurn !== args.playerId) {
      throw new Error("Not your turn");
    }

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

    return true;
  },
});
