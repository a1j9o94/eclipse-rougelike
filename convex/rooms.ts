import { mutation, query, type DatabaseReader, type DatabaseWriter } from "./_generated/server";
import { v } from "convex/values";
// import { maybeStartCombat } from "./helpers/match";
import { logInfo, roomTag } from "./helpers/log";
import { maybeResolveRound, validateReadyToggle } from "./helpers/resolve";
import type { PlayerState } from "../shared/mpTypes";
// Default loss percent (server-side; do not import client code)
const DEFAULT_LOSS_PCT = 0.5;

// Helper function to generate a unique player ID
function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to generate room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createRoom = mutation({
  args: {
    roomName: v.string(),
    isPublic: v.boolean(),
    playerName: v.string(),
    gameConfig: v.object({
      startingShips: v.number(),
      livesPerPlayer: v.number(),
      multiplayerLossPct: v.optional(v.number()),
    }),
    playerFaction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const roomCode = generateRoomCode();
    const playerId = generatePlayerId();
    
    const roomId = await ctx.db.insert("rooms", {
      roomCode,
      roomName: args.roomName,
      isPublic: args.isPublic,
      status: "waiting",
      maxPlayers: 2,
      currentPlayers: 1,
      gameConfig: { ...args.gameConfig, multiplayerLossPct: args.gameConfig.multiplayerLossPct ?? DEFAULT_LOSS_PCT },
      createdAt: Date.now(),
    });

    await ctx.db.insert("players", {
      roomId,
      playerId,
      playerName: args.playerName,
      isHost: true,
      faction: args.playerFaction,
      lives: args.gameConfig.livesPerPlayer,
      isReady: false,
      joinedAt: Date.now(),
    });

    return { roomId, roomCode, playerId };
  },
});

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.string(),
    playerFaction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }
    
    if (room.status !== "waiting") {
      throw new Error("Game already in progress");
    }
    
    if (room.currentPlayers >= room.maxPlayers) {
      throw new Error("Room is full");
    }

    const playerId = generatePlayerId();
    
    await ctx.db.insert("players", {
      roomId: room._id,
      playerId,
      playerName: args.playerName,
      isHost: false,
      faction: args.playerFaction,
      lives: room.gameConfig.livesPerPlayer,
      isReady: false,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(room._id, {
      currentPlayers: room.currentPlayers + 1,
    });

    return { roomId: room._id, playerId };
  },
});

export const getRoomDetails = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return {
      room,
      players,
    };
  },
});

export const getPublicRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_public", (q) => q.eq("isPublic", true).eq("status", "waiting"))
      .collect();

    return rooms.filter(room => room.currentPlayers < room.maxPlayers);
  },
});

export const updatePlayerReady = mutation({
  args: {
    playerId: v.string(),
    isReady: v.boolean(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_player_id", (q) => q.eq("playerId", args.playerId))
      .first();

    if (!player) {
      throw new Error("Player not found");
    }

    // Determine room status to decide which guard to apply
    const room = await ctx.db.get(player.roomId);

    // If marking ready during Outpost (room is playing and in setup), ensure snapshot exists and fleet isn't invalid
    const gs = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", player.roomId))
      .first();
    const isOutpostSetup = room?.status === 'playing' && gs?.gamePhase === 'setup';
    if (args.isReady && isOutpostSetup) {
      const states = (gs?.playerStates as Record<string, PlayerState | undefined>) || {};
      const guard = validateReadyToggle({ playerId: player.playerId, wantReady: true, playerStates: states });
      if (!guard.ok) {
        const msg = guard.reason === 'missingSnapshot'
          ? 'Submit your fleet snapshot first.'
          : guard.reason === 'invalidFleet'
            ? 'Your fleet is invalid. Fix it before readying up.'
            : 'Not allowed.';
        logInfo('ready', 'blocked by guard', { playerId: player.playerId, reason: guard.reason });
        throw new Error(msg);
      }
    }

    await ctx.db.patch(player._id, { isReady: args.isReady });
    logInfo('ready', `player toggled`, { playerId: player.playerId, isReady: args.isReady });

    // Attempt to resolve round when both players are ready and valid snapshots exist
    // Fetch current state to update readiness, then attempt to resolve round
    await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", player.roomId))
      .collect();

    // Try resolving a round now that readiness might have changed (only meaningful during Outpost)
    if (isOutpostSetup) {
      await maybeResolveRound(ctx as unknown as { db: DatabaseReader & DatabaseWriter }, player.roomId);
    }

    return player._id;
  },
});

export const startGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Anyone can request start; server checks both players present and ready
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();

    if (players.length !== 2) throw new Error("Need two players to start");
    const allReady = players.every(p => p.isReady);
    if (!allReady) throw new Error("Both players must be ready");

    // Move room to playing; reset readiness so Outpost ready is decoupled from lobby readiness
    await ctx.db.patch(args.roomId, { status: "playing" });
    logInfo('start', 'room moved to playing', { tag: roomTag(args.roomId as unknown as string) });
    const inRoom = await ctx.db
      .query("players")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();
    await Promise.all(inRoom.map(p => ctx.db.patch(p._id, { isReady: false })));
    logInfo('start', 'reset player readiness for Outpost', { tag: roomTag(args.roomId as unknown as string) });
    return true;
  },
});

export const restartToSetup = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Find player row
    const player = await ctx.db
      .query("players")
      .withIndex("by_player_id", (q) => q.eq("playerId", args.playerId))
      .first();
    if (!player) throw new Error("Player not found");

    const lives = Math.max(0, (player.lives ?? 0) - 1);
    await ctx.db.patch(player._id, { lives, isReady: false });

    // Reset room/game state
    const gs = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (gs) {
      await ctx.db.patch(gs._id, {
        gamePhase: lives === 0 ? "finished" : "setup",
        combatQueue: [],
        lastUpdate: Date.now(),
      });
    }
    // If a player is out of lives, mark room finished
    if (lives === 0) {
      await ctx.db.patch(args.roomId, { status: "finished" });
    } else {
      // Ensure all players become not-ready to prevent accidental start
      const others = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();
      for (const p of others) {
        await ctx.db.patch(p._id, { isReady: false });
      }
      await ctx.db.patch(args.roomId, { status: "waiting" });
    }

    return { lives };
  },
});

export const prepareRematch = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error('Room not found');

    // Reset players lives and readiness
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const livesPerPlayer = room.gameConfig.livesPerPlayer;
    for (const p of players) {
      await ctx.db.patch(p._id, { lives: livesPerPlayer, isReady: false });
    }

    // Reset gameState to a clean setup placeholder so UI doesn't show old logs
    const gs = await ctx.db
      .query("gameState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
    if (gs) {
      await ctx.db.patch(gs._id, {
        gamePhase: "setup",
        roundNum: 1,
        playerStates: {},
        combatQueue: [],
        roundSeed: undefined,
        roundLog: undefined,
        acks: {},
        // Cleanup finishing markers if present
        pendingFinish: undefined,
        matchResult: undefined,
        lastUpdate: Date.now(),
      });
    }

    // Move room back to waiting
    await ctx.db.patch(args.roomId, { status: "waiting" });
    logInfo('start', 'room prepared for rematch', { tag: roomTag(args.roomId as unknown as string) });
    return true;
  },
});

export const setPlayerFaction = mutation({
  args: { playerId: v.string(), faction: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query('players')
      .withIndex('by_player_id', q => q.eq('playerId', args.playerId))
      .first();
    if (!player) throw new Error('Player not found');
    await ctx.db.patch(player._id, { faction: args.faction });
    logInfo('ready', 'player faction set', { playerId: args.playerId, faction: args.faction });
    return true;
  }
});
