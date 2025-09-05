import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    }),
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
      gameConfig: args.gameConfig,
      createdAt: Date.now(),
    });

    await ctx.db.insert("players", {
      roomId,
      playerId,
      playerName: args.playerName,
      isHost: true,
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

    await ctx.db.patch(player._id, {
      isReady: args.isReady,
    });

    return player._id;
  },
});

export const startGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (players.length !== 2) {
      throw new Error("Need exactly 2 players to start");
    }

    const allReady = players.every(p => p.isReady);
    if (!allReady) {
      throw new Error("All players must be ready");
    }

    // Update room status
    await ctx.db.patch(args.roomId, {
      status: "playing",
    });

    // Initialize game state (will be implemented later)
    // This is where we'll create the initial game state for multiplayer

    return true;
  },
});