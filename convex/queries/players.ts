/**
 * Eclipse: Second Dawn - Player Queries
 *
 * Query player state, resources, and economy data
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get player record by roomId and playerId
 */
export const getPlayer = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .first();

    return player;
  },
});

/**
 * Get player's resources and economy state
 */
export const getPlayerResources = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const resources = await ctx.db
      .query("playerResources")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .first();

    return resources;
  },
});

/**
 * Get all players in a room with their resources
 */
export const getAllPlayersWithResources = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const playersWithResources = await Promise.all(
      players.map(async (player) => {
        const resources = await ctx.db
          .query("playerResources")
          .withIndex("by_room_player", (q) =>
            q.eq("roomId", args.roomId).eq("playerId", player.playerId)
          )
          .first();

        return {
          ...player,
          resources,
        };
      })
    );

    return playersWithResources;
  },
});

/**
 * Get player's sectors (sectors where they have influence)
 */
export const getPlayerSectors = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const sectorResources = await ctx.db
      .query("sectorResources")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .collect();

    // Get full sector details
    const sectors = await Promise.all(
      sectorResources.map((sr) => ctx.db.get(sr.sectorId))
    );

    return sectors.filter((s) => s !== null);
  },
});

/**
 * Get player's ships
 */
export const getPlayerShips = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const ships = await ctx.db
      .query("ships")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .collect();

    return ships.filter((s) => !s.isDestroyed);
  },
});

/**
 * Get player's blueprints
 */
export const getPlayerBlueprints = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const blueprints = await ctx.db
      .query("blueprints")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .collect();

    return blueprints;
  },
});

/**
 * Get player's pinned (active) blueprints
 */
export const getPlayerActiveBlueprintsmap = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const blueprints = await ctx.db
      .query("blueprints")
      .withIndex("by_room_player_pinned", (q) =>
        q
          .eq("roomId", args.roomId)
          .eq("playerId", args.playerId)
          .eq("isPinned", true)
      )
      .collect();

    return blueprints;
  },
});

/**
 * Get player's victory points and ranking
 */
export const getPlayerScore = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const resources = await ctx.db
      .query("playerResources")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .first();

    if (!resources) {
      return { victoryPoints: 0, rank: null };
    }

    // Get all players' VP for ranking
    const allResources = await ctx.db
      .query("playerResources")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const sorted = allResources.sort(
      (a, b) => b.victoryPoints - a.victoryPoints
    );
    const rank = sorted.findIndex((r) => r.playerId === args.playerId) + 1;

    return {
      victoryPoints: resources.victoryPoints,
      rank: rank > 0 ? rank : null,
    };
  },
});
