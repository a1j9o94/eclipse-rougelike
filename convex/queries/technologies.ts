import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get all available technologies
 */
export const getAllTechnologies = query({
  args: {},
  handler: async (ctx) => {
    const technologies = await ctx.db.query("technologies").collect();
    return technologies;
  },
});

/**
 * Get technologies by track
 */
export const getTechnologiesByTrack = query({
  args: {
    track: v.union(
      v.literal("nano"),
      v.literal("grid"),
      v.literal("military"),
      v.literal("rare"),
      v.literal("propulsion"),
      v.literal("plasma")
    ),
  },
  handler: async (ctx, args) => {
    const technologies = await ctx.db
      .query("technologies")
      .withIndex("by_track", (q) => q.eq("track", args.track))
      .collect();

    return technologies;
  },
});

/**
 * Get a specific technology
 */
export const getTechnology = query({
  args: { technologyId: v.id("technologies") },
  handler: async (ctx, args) => {
    const technology = await ctx.db.get(args.technologyId);
    return technology;
  },
});

/**
 * Get player's researched technologies
 */
export const getPlayerTechnologies = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const playerTechs = await ctx.db
      .query("playerTechnologies")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .collect();

    return playerTechs;
  },
});

/**
 * Check if player has researched a specific technology
 */
export const hasPlayerResearchedTech = query({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    technologyId: v.id("technologies"),
  },
  handler: async (ctx, args) => {
    const playerTech = await ctx.db
      .query("playerTechnologies")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId)
      )
      .filter((q) => q.eq(q.field("technologyId"), args.technologyId))
      .first();

    return !!playerTech;
  },
});

/**
 * Get parts unlocked by a technology
 */
export const getPartsUnlockedByTech = query({
  args: { technologyId: v.id("technologies") },
  handler: async (ctx, args) => {
    const technology = await ctx.db.get(args.technologyId);

    if (!technology) {
      return [];
    }

    const parts = await Promise.all(
      technology.unlocksParts.map(partId => ctx.db.get(partId))
    );

    return parts.filter(p => p !== null);
  },
});
