import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    roomCode: v.string(),
    roomName: v.string(),
    isPublic: v.boolean(),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    maxPlayers: v.number(),
    currentPlayers: v.number(),
    gameConfig: v.object({
      startingShips: v.number(),
      livesPerPlayer: v.number(),
    }),
    createdAt: v.number(),
  }).index("by_room_code", ["roomCode"])
    .index("by_status", ["status"])
    .index("by_public", ["isPublic", "status"]),
  
  players: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    playerName: v.string(),
    isHost: v.boolean(),
    lives: v.number(),
    isReady: v.boolean(),
    joinedAt: v.number(),
  }).index("by_room", ["roomId"])
    .index("by_player_id", ["playerId"]),
  
  gameState: defineTable({
    roomId: v.id("rooms"),
    currentTurn: v.string(), // playerId
    gamePhase: v.union(v.literal("setup"), v.literal("combat"), v.literal("finished")),
    playerStates: v.any(), // Store individual player game states
    combatQueue: v.any(), // Initiative queue for combat
    roundNum: v.number(),
    roundSeed: v.optional(v.string()),
    roundLog: v.optional(v.any()),
    acks: v.optional(v.any()), // { [playerId]: boolean }
    matchResult: v.optional(v.object({ winnerPlayerId: v.string() })),
    lastUpdate: v.number(),
  }).index("by_room", ["roomId"]),

  // Winner fleet archives (no player names stored)
  fleetArchives: defineTable({
    roomId: v.id("rooms"),
    roundNum: v.number(),
    createdAt: v.number(),
    // snapshot of winner's fleet for this round
    fleet: v.any(),
    // optional metadata for future use
    sector: v.optional(v.number()),
  }).index("by_room_round", ["roomId", "roundNum"]),
});
