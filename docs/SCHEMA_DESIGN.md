# Eclipse: Second Dawn - Convex Schema Design

## Overview

The Convex schema for Eclipse: Second Dawn is designed to support a complete implementation of the board game, including all core mechanics and both major expansions (Rise of the Ancients and Shadow of the Rift).

## Design Principles

### 1. Separation of Static vs. Dynamic Data

**Static Configuration Tables** (seeded once, read-only during gameplay):
- `factions` - 8 playable factions with unique abilities
- `technologies` - ~100 technologies across 6 tracks
- `parts` - ship components (weapons, drives, shields, etc.)
- `dice` - combat dice probabilities
- `discoveryTiles` - discovery tile effects
- `reputationTiles` - victory point tiles
- `ambassadors` - ambassador tiles

**Dynamic Game State Tables** (modified during gameplay):
- `rooms`, `players`, `gameState` - lobby and turn management
- `playerResources`, `playerTechnologies`, etc. - per-player state
- `sectors`, `sectorResources` - map state
- `ships`, `blueprints` - fleet management
- `combatLog`, `actionLog` - event history

**Rationale**: This separation allows for efficient queries, easy game resets, and potential future features like custom faction variants.

### 2. Composite Keys and Indexes

Most player-specific state uses composite indexes on `[roomId, playerId]` for efficient single-player queries and `[roomId]` for all-players queries.

Example indexes:
```typescript
playerResources
  .index("by_room", ["roomId"])
  .index("by_room_player", ["roomId", "playerId"])
```

This pattern is repeated across:
- `playerResources`
- `playerTechnologies`
- `playerReputationTiles`
- `playerAmbassadors`
- `playerDiscoveryTiles`
- `blueprints`
- `ships`
- `sectorResources`

**Rationale**: Convex queries are optimized for index-based lookups. These indexes support both "get all players in a room" and "get specific player's data" queries efficiently.

### 3. Denormalization for Performance

Several tables include derived/cached data:

**Blueprints** cache computed stats:
```typescript
{
  totalEnergy: v.number(),
  energyUsed: v.number(),
  initiative: v.number(),
  hull: v.number(),
  movement: v.number(),
  materialCost: v.number(),
}
```

**Sectors** cache control state:
```typescript
{
  controlledBy: v.optional(v.string()), // playerId
}
```

**Rationale**: Computing ship stats from parts on every render would be expensive. Caching these values on blueprint updates provides instant reads.

### 4. Axial Hex Coordinates

Sectors use axial coordinates (q, r) instead of cube or offset coordinates:

```typescript
position: v.object({
  q: v.number(),
  r: v.number(),
})
```

**Rationale**: Axial coordinates are standard for hex grids, provide clean neighbor calculations, and use less storage than cube coordinates (which require 3 values).

### 5. JSON for Complex/Flexible Data

Some fields use JSON strings for flexibility:

- `faction.specialAbilities[].effect` - faction-specific mechanics
- `technology.effectData` - programmatic tech effects
- `part.effectData` - special part abilities
- `combatLog.events[].data` - combat event details

**Rationale**: Eclipse has many special cases and unique abilities. Using JSON allows the schema to remain simple while supporting complex game mechanics without schema migrations.

## Table Groups

### Lobby & Game Management

**`rooms`**
- Core game room/lobby entity
- Tracks player count, status (waiting/playing/finished)
- Game configuration (expansions, victory conditions)

**`players`**
- Player membership in rooms
- Faction selection, ready status, turn order
- Links to auth/session via `playerId` string

**`gameState`**
- Single record per room
- Current round, phase, active player
- Combat queue
- Pass tracking

### Static Game Configuration

**`factions`**
- 8 base factions (Terran, Hydran, Planta, Eridani, Orion, Mechanema, Descendants, Draco)
- Expansion factions (if enabled)
- Starting resources, capacities, special abilities

**`technologies`**
- 6 tracks × 3 tiers × ~3 technologies = ~54 base techs
- Expansion techs add ~40 more
- Links to parts they unlock
- Victory points (tier 3 techs give 2-5 VP)

**`parts`**
- Weapons: cannons, missiles (with dice types)
- Defense: shields, armor
- Systems: computers, drives, power sources, hulls
- Combat stats (energy, initiative, hull, speed)

**`dice`**
- Yellow dice: [0,0,0,1,1,2] (weak, cheap)
- Orange dice: [0,1,1,2,2,3] (balanced)
- Red dice: [1,2,2,3,3,4] (strong, expensive)

**`discoveryTiles`**, **`reputationTiles`**, **`ambassadors`**
- Draw piles with various effects
- Victory points
- Special bonuses

### Map & Territory

**`sectors`**
- Hex tiles with position (q, r)
- Planets (materials/science/money, basic/advanced)
- Warp portals, discovery tiles
- Ancient presence (expansion)
- Control tracking

**`sectorResources`**
- Per-player per-sector state
- Population cubes on each planet type
- Constructs (monoliths, orbitals, starbases)
- Influence disk placement

**Rationale**: Separating `sectorResources` from `sectors` allows efficient queries like "all sectors controlled by player X" and "all players with presence in sector Y".

### Player State

**`playerResources`**
- Current materials, science, money
- Production track positions (0-7)
- Influence disk and colony ship usage
- Victory points
- Pass status

**`playerTechnologies`**, **`playerReputationTiles`**, **`playerAmbassadors`**, **`playerDiscoveryTiles`**
- Junction tables tracking ownership
- Acquisition round for history/undo
- Discovery tiles track kept vs. used state

**Rationale**: Separate tables for many-to-many relationships allow efficient queries in both directions (e.g., "which players have tech X?" and "what techs does player Y have?").

### Ships & Combat

**`blueprints`**
- Ship designs (interceptor, cruiser, dreadnought, starbase)
- Parts equipped in each slot
- Cached stats (energy, initiative, hull, movement, cost)
- Pin state (active design vs. saved design)

**`ships`**
- Instances of blueprints
- Location (sector)
- Combat state (damage, retreat status)
- Movement tracking (used this round)

**Rationale**: Blueprints are reusable designs. Ships are instances. This allows players to build multiple ships from one blueprint and update the blueprint without affecting existing ships.

**`combatLog`**
- Per-combat event history
- Initiative, attacks, damage, retreats, destructions
- Winner tracking

**Rationale**: Combat is complex and players need to review what happened. Event logs enable replay, undo, and debugging.

### History & Analytics

**`actionLog`**
- Per-action history (explore, influence, research, upgrade, build, move, pass)
- Round and action number
- Resource deltas
- Links to affected entities

**`gameResults`**
- Final rankings
- Victory points
- Game duration

**Rationale**: Action logs enable undo, analytics, and detecting invalid states. Game results support leaderboards and player statistics.

## Query Patterns

### Common Queries

**Get all players in a room:**
```typescript
db.query("players")
  .withIndex("by_room", q => q.eq("roomId", roomId))
  .collect()
```

**Get player's resources:**
```typescript
db.query("playerResources")
  .withIndex("by_room_player", q =>
    q.eq("roomId", roomId).eq("playerId", playerId))
  .unique()
```

**Get all ships in a sector:**
```typescript
db.query("ships")
  .withIndex("by_room_sector", q =>
    q.eq("roomId", roomId).eq("sectorId", sectorId))
  .collect()
```

**Get player's technologies:**
```typescript
const playerTechs = await db.query("playerTechnologies")
  .withIndex("by_room_player", q =>
    q.eq("roomId", roomId).eq("playerId", playerId))
  .collect()

const techDetails = await Promise.all(
  playerTechs.map(pt => db.get(pt.technologyId))
)
```

**Get sectors controlled by player:**
```typescript
db.query("sectors")
  .withIndex("by_controller", q =>
    q.eq("roomId", roomId).eq("controlledBy", playerId))
  .collect()
```

### Performance Considerations

1. **Indexes cover all common access patterns** - No table scans needed
2. **Denormalized stats** - Blueprint stats cached, not computed on every read
3. **Separate tables for many-to-many** - Efficient bidirectional queries
4. **Scoped by roomId** - All indexes start with roomId to partition data

## Validation Strategy

Convex schema provides type safety, but game rules require additional validation:

**At mutation time:**
- Check player has sufficient resources
- Verify technology prerequisites
- Validate ship blueprint energy balance
- Confirm sector adjacency for movement
- Enforce turn order and phase restrictions

**Validators should be in:**
- `convex/validators/` - Pure validation functions
- `convex/mutations/` - Apply validators before mutations
- `convex/queries/` - Derive valid action lists

**Example validator structure:**
```typescript
// convex/validators/blueprints.ts
export function validateBlueprint(
  blueprint: Blueprint,
  parts: Part[],
  technologies: Technology[]
): ValidationResult {
  // Check energy balance
  // Check slot limits
  // Check tech requirements
  // Return { valid: boolean, errors: string[] }
}
```

## Migration Strategy

Convex handles schema evolution automatically, but we should:

1. **Add optional fields** instead of required fields when evolving
2. **Use `v.optional()` liberally** for new features
3. **Version effectData JSON** to handle format changes
4. **Keep old fields** until all games using them are finished

**Example evolution:**
```typescript
// v1: Simple effect string
effect: v.string()

// v2: Add structured effect data
effect: v.string(),
effectData: v.optional(v.string()), // JSON

// v3: Eventually deprecate old effect field
effect: v.optional(v.string()), // legacy
effectData: v.string(), // primary
```

## Testing Strategy

**Schema validation:**
- Create example records for each table
- Verify indexes work as expected
- Test query performance with realistic data volumes

**Data integrity:**
- Ensure foreign keys are valid (Convex IDs exist)
- Check cascading deletes/updates work correctly
- Verify composite indexes cover all query patterns

**Load testing:**
- 6-player games = ~300 ships, ~40 sectors, ~100 technologies
- Combat with 50 ships in one sector
- Concurrent games (100 rooms)

## Future Enhancements

### Potential Additions

**Expansions:**
- Shadow of the Rift: wormholes, anomalies, rift sectors
- Rise of the Ancients: ancients, relics, special hexes

**Features:**
- Real-time multiplayer sync
- Undo/redo system (using actionLog)
- AI opponents (store AI state in separate table)
- Tournament mode (bracket tracking)
- Replay system (reconstruct game from logs)

**Optimizations:**
- Materialized views for VP calculations
- Cached query results for complex computations
- Batch mutations for multi-step actions

### Schema Stability

This schema is designed to be **stable** through v1.0. Future versions should:
- Add new optional fields rather than changing existing ones
- Use new tables for major features
- Keep backwards compatibility for 2 major versions

## References

- [Eclipse: Second Dawn Rules](https://www.lautapelit.fi/eclipse)
- [Convex Schema Documentation](https://docs.convex.dev/database/schemas)
- [Axial Hex Coordinates](https://www.redblobgames.com/grids/hexagons/)
- Prisma reference schema: `/workspace/extra/home/eclipse-browser-game/prisma/schema.prisma`

## Summary

This schema provides:
- ✅ Complete Eclipse game state representation
- ✅ Efficient queries for all game operations
- ✅ Type safety via Convex validators
- ✅ Extensibility for expansions and features
- ✅ Performance through denormalization and indexing
- ✅ Maintainability through clear separation of concerns

Total tables: **27**
Total indexes: **45+**
Estimated records per 6-player game: **~1000**
