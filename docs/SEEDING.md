# Eclipse: Second Dawn - Database Seeding Guide

## Overview

The seeding system populates the Convex database with all game configuration data. This includes factions, technologies, ship parts, tiles, and more.

## Seeding Functions

All seeding mutations are in `/workspace/group/eclipse-full-game/convex/mutations/seed.ts`

### Global Data (One-Time Seeds)

These functions should be called **once** when setting up a new Convex deployment. They create shared game configuration used by all rooms.

#### `initializeGlobalGameData()`

**Master function** - Seeds all global data in the correct order.

```typescript
import { api } from "./convex/_generated/api";

// In your setup script or admin panel
await client.mutation(api.mutations.seed.initializeGlobalGameData);
```

**What it seeds:**
- ✅ 13 Factions (Terran + Alien species)
- ✅ 40 Technologies (Nano, Grid, Military, Rare)
- ✅ 30 Ship Parts (weapons, shields, drives, etc.)
- ✅ 3 Dice types (Yellow, Orange, Red)
- ✅ 20 Reputation Tiles (2-5 VP)
- ✅ 16 Ambassadors
- ✅ Links technologies to the parts they unlock

**When to use:**
- First deployment of the app
- After clearing the database
- When updating game configuration

**Idempotent:** Safe to call multiple times - skips seeding if data already exists.

#### Individual Global Seeds

You can also seed data types individually:

```typescript
// Seed just factions
await client.mutation(api.mutations.seed.seedFactions);

// Seed just technologies
await client.mutation(api.mutations.seed.seedTechnologies);

// Seed just parts
await client.mutation(api.mutations.seed.seedParts);

// Seed just dice
await client.mutation(api.mutations.seed.seedDice);

// Seed just reputation tiles
await client.mutation(api.mutations.seed.seedReputationTiles);

// Seed just ambassadors
await client.mutation(api.mutations.seed.seedAmbassadors);

// Link techs to parts (after both are seeded)
await client.mutation(api.mutations.seed.linkTechnologiesToParts);
```

### Per-Game Data

These functions create new instances for each game room.

#### `initializeGameRoom(roomId)`

Seeds room-specific data like discovery tiles.

```typescript
import { api } from "./convex/_generated/api";

// When creating a new game room
const roomId = await client.mutation(api.rooms.create, { /* ... */ });
await client.mutation(api.mutations.seed.initializeGameRoom, { roomId });
```

**What it seeds:**
- ✅ ~50 Discovery Tiles (resource bonuses, tech grants, etc.)

**When to use:**
- After creating a new game room
- When resetting a game

#### Individual Per-Game Seeds

```typescript
// Seed discovery tiles for a room
await client.mutation(api.mutations.seed.seedDiscoveryTiles, {
  roomId: "j57abc123...",
});
```

## Setup Workflow

### 1. First-Time Setup

```bash
# Deploy your Convex functions
npx convex deploy

# Run global seed (in browser console, admin panel, or script)
npx convex run mutations/seed:initializeGlobalGameData
```

You should see:
```
🚀 Initializing Eclipse: Second Dawn global game data...
✅ Seeded 13 factions
✅ Seeded 40 technologies
✅ Seeded 30 ship parts
✅ Seeded 3 dice types
✅ Seeded 20 reputation tile types
✅ Seeded 16 ambassador types
✅ Linked 24 technologies to their parts
✅ Global game data initialized!
```

### 2. Creating a Game

```typescript
// In your game creation mutation
export const createGame = mutation({
  args: { /* roomCode, etc. */ },
  handler: async (ctx, args) => {
    // 1. Create room
    const roomId = await ctx.db.insert("rooms", {
      roomCode: args.roomCode,
      status: "waiting",
      // ... other fields
    });

    // 2. Initialize game-specific data
    await initializeGameRoom.handler(ctx, { roomId });

    return roomId;
  },
});
```

### 3. Development/Testing

```bash
# Clear all seed data (⚠️ destructive!)
npx convex run mutations/seed:clearAllSeedData

# Re-seed
npx convex run mutations/seed:initializeGlobalGameData
```

## Data Dependencies

Seeding order matters due to foreign key relationships:

```
1. Factions (no dependencies)
2. Dice (no dependencies)
3. Technologies (no dependencies initially)
4. Parts (references Technologies via requiresTechnologies)
5. Link Technologies->Parts (updates Technologies with part IDs)
6. Reputation Tiles (no dependencies)
7. Ambassadors (no dependencies)
8. Discovery Tiles (per-game, references Technologies/Parts)
```

**Important:** Always seed in this order to avoid missing references.

## Query Helpers

After seeding, you can query the data:

```typescript
// Get all factions
const factions = await ctx.db.query("factions").collect();

// Get technologies by track
const nanoTechs = await ctx.db
  .query("technologies")
  .filter((q) => q.eq(q.field("track"), "nano"))
  .collect();

// Get parts by type
const cannons = await ctx.db
  .query("parts")
  .filter((q) => q.eq(q.field("type"), "cannon"))
  .collect();

// Get faction by name
const terran = await ctx.db
  .query("factions")
  .withIndex("by_name", (q) => q.eq("name", "Terran Directorate"))
  .unique();
```

## Validation

The seed data includes built-in validation:

```typescript
import { validateSeedData } from "./convex/seedData";

const validation = validateSeedData();
if (!validation.valid) {
  console.error("Seed data errors:", validation.errors);
  // Don't seed if validation fails
}
```

**Checks:**
- Parts reference existing technologies
- Technologies reference existing parts
- Factions reference existing technologies
- No circular dependencies

## Troubleshooting

### "Technologies already seeded"

The seeding functions are idempotent. If you see this message, the data already exists. To re-seed:

```bash
npx convex run mutations/seed:clearAllSeedData
npx convex run mutations/seed:initializeGlobalGameData
```

### Missing technology/part links

If technologies don't show their unlocked parts:

```bash
npx convex run mutations/seed:linkTechnologiesToParts
```

### Discovery tiles not appearing

Discovery tiles are per-game. Make sure you called `initializeGameRoom()`:

```typescript
await client.mutation(api.mutations.seed.initializeGameRoom, {
  roomId: yourRoomId,
});
```

### Schema mismatch errors

If you updated the schema, you may need to:

1. Update seed data structures in `/convex/seedData/`
2. Clear existing data: `npx convex run mutations/seed:clearAllSeedData`
3. Re-seed: `npx convex run mutations/seed:initializeGlobalGameData`

## Extending the Seed System

### Adding New Game Content

1. **Add to seed data:**
   ```typescript
   // convex/seedData/technologies.ts
   export const technologies: TechnologySeedData[] = [
     // ... existing techs
     {
       name: "New Technology",
       track: "nano",
       tier: 3,
       // ... rest of fields
     },
   ];
   ```

2. **Clear and re-seed:**
   ```bash
   npx convex run mutations/seed:clearAllSeedData
   npx convex run mutations/seed:initializeGlobalGameData
   ```

### Adding New Seed Functions

```typescript
// convex/mutations/seed.ts
export const seedMyNewData = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("myTable").collect();
    if (existing.length > 0) {
      return { success: true, message: "Already seeded" };
    }

    // Seed your data
    for (const item of myData) {
      await ctx.db.insert("myTable", item);
    }

    return { success: true, count: myData.length };
  },
});

// Add to master function
export const initializeGlobalGameData = mutation({
  handler: async (ctx) => {
    // ... existing seeds
    const myResult = await seedMyNewData.handler(ctx);
    // ... return results
  },
});
```

## Performance

**Global seed time:** ~2-5 seconds for all 130+ entities

**Per-game seed time:** ~500ms for discovery tiles

**Recommendations:**
- Seed global data once at deployment
- Seed per-game data asynchronously when creating rooms
- Cache frequently-queried seed data (factions, techs) in app state

## Summary

```bash
# First deployment
npx convex run mutations/seed:initializeGlobalGameData

# When creating a game (in mutation)
await initializeGameRoom.handler(ctx, { roomId });

# To reset (dev/test only)
npx convex run mutations/seed:clearAllSeedData
npx convex run mutations/seed:initializeGlobalGameData
```

**Result:** Complete Eclipse: Second Dawn game with all 13 factions, 40 technologies, 30 parts, and all tiles ready to play!
