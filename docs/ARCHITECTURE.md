# Eclipse Second Dawn - Full Game Architecture

## Executive Summary

This document outlines the architecture for extending `eclipse-roguelike` into a full implementation of Eclipse: Second Dawn for the Galaxy as a multiplayer browser game (similar to colonist.io for Catan).

**Current State:**
- Working roguelike with combat system
- Convex multiplayer infrastructure
- Ship building (frames, parts, factions)
- Combat simulation engine

**Target State:**
- Full Eclipse Second Dawn board game
- 2-6 players
- Hex-grid galaxy exploration
- Full technology tracks (3 main + rare)
- Resource management (materials, science, money, influence)
- Victory point scoring
- Complete turn structure with 6 action types

---

## 1. Game Overview

### Core Mechanics (Eclipse Second Dawn)

**Objective:** Most victory points after 8-9 rounds

**Resources:**
- **Materials** - Build ships/structures
- **Science** - Research technologies
- **Money/Credits** - Economic transactions
- **Influence Disks** - Limited action currency (typically 13-16 per player)
- **Population Cubes** - Placed on planets to generate resources

**Actions (6 types):**
1. **Explore** - Draw and place new sector tiles
2. **Influence** - Place influence disk to control sector
3. **Research** - Purchase technologies from available pool
4. **Upgrade** - Add/remove parts from ship blueprints
5. **Build** - Construct ships or structures
6. **Move** - Relocate ships between sectors

**Turn Structure (4 phases):**
1. **Action Phase** - Players take actions or pass
2. **Combat Phase** - Resolve all battles
3. **Upkeep Phase** - Pay upkeep, collect resources
4. **Cleanup Phase** - Return influence disks, advance round

**Victory Points:**
- Controlled sectors (with influence disks)
- Technologies researched
- Discovery tiles collected
- Reputation tiles (from combat)
- Monuments/structures built

---

## 2. Current Roguelike Architecture

### Existing Schema (Convex)

```typescript
// convex/schema.ts
rooms: {
  roomCode, roomName, isPublic, status, maxPlayers, currentPlayers,
  gameConfig: { startingShips, livesPerPlayer, multiplayerLossPct }
}

players: {
  roomId, playerId, playerName, faction, isHost, lives, isReady
}

gameState: {
  roomId, currentTurn, gamePhase, playerStates, combatQueue,
  roundNum, roundSeed, roundLog, acks, matchResult
}

fleetArchives: {
  roomId, roundNum, fleet, sector
}
```

### Existing Game State (shared/types.ts)

```typescript
Ship: { frame, parts, weapons, riftDice, stats, hull, alive }
Resources: { credits, materials, science }
Research: { Military, Grid, Nano }
Capacity: { cap }
Tonnage: { used, cap }
```

### Existing Combat Engine

- **Location:** `convex/engine/combat.ts`
- **Features:** Deterministic simulation, initiative ordering, weapon dice rolls, shield mechanics
- **Input:** Two fleets (ShipSnap[])
- **Output:** Winner, combat log, final fleet states

---

## 3. Full Game Architecture Design

### 3.1 Galaxy & Sectors

**Hex Grid System:**
- Center hex: Galactic Center (neutral starting point)
- Ring-based expansion (inner rings explored first)
- ~60-100 sector tiles in full game
- Each sector has:
  - Terrain type (empty, nebula, asteroid field, etc.)
  - 0-3 planets (resources: materials/science/money)
  - Warp portals (1-6 connections to adjacent hexes)
  - Control marker (influence disk placement)
  - Discovery tile (drawn on exploration)

**Sector Types:**
- Empty space (no planets)
- Resource sectors (1-3 planets)
- Ancient sectors (special tiles)
- Galactic Center (starting point)

### 3.2 Technology System

**Tech Tracks (4 total):**
1. **Nano** - Weapons, shields, hull, special abilities
2. **Grid** - Power sources, drives, computers
3. **Military** - Combat-focused technologies
4. **Rare** - Unique, powerful technologies

**Technology Tile Pool:**
- Each round, new techs become available
- Technologies have costs (science + money)
- Technologies unlock ship parts
- Technologies provide permanent bonuses
- Technologies grant victory points

**Tech Progression:**
- Tier 1: 3-5 science cost
- Tier 2: 6-10 science cost
- Tier 3: 11+ science cost
- Rare techs: Special abilities, higher costs

### 3.3 Resource Economy

**Resource Generation:**
```typescript
PlayerResources: {
  materials: number      // Production track (0-11)
  science: number        // Science track (0-11)
  money: number          // Economy track (0-20+)
  materialIncome: number // Per-turn production
  scienceIncome: number  // Per-turn production
  moneyIncome: number    // Per-turn production
}
```

**Population Management:**
- Each player has ~13 population cubes
- Place cubes on planets during exploration/influence
- Cubes generate resources based on planet type
- Moving cubes costs actions
- Cubes in "graveyard" when ships/sectors lost

### 3.4 Ship Blueprints & Building

**Blueprint System (enhance existing):**
- 3 ship types: Interceptor, Cruiser, Dreadnought
- Each player has 3 blueprints (one per ship type)
- **Upgrade action** modifies blueprint (add/remove parts)
- **Build action** constructs ships from blueprint
- Parts cost materials to install
- Parts have slot limits per ship type

**Ship Storage:**
- Ships exist in sectors (not in abstract "fleet")
- Each sector can contain multiple ships
- Ships move between adjacent sectors
- Build ships at controlled sectors with shipyards

### 3.5 Actions & Turn Structure

**Action System:**
```typescript
ActionType =
  | "explore"      // Draw sector, place on board, place influence
  | "influence"    // Place influence disk in existing sector
  | "research"     // Buy tech from available pool
  | "upgrade"      // Modify ship blueprint
  | "build"        // Construct ships/structures
  | "move"         // Move ships between sectors

PlayerAction: {
  playerId: string
  type: ActionType
  cost: number              // Influence disks consumed
  params: ActionParams      // Type-specific parameters
}
```

**Turn Flow:**
1. **Action Phase:**
   - Players take turns clockwise
   - Each action costs 1+ influence disks
   - Players can take multiple actions per turn
   - Pass when done (or out of influence disks)
   - Round ends when all players pass

2. **Combat Phase:**
   - Resolve all battles (sectors with 2+ players)
   - Process in descending sector number order
   - Use existing combat engine
   - Award reputation tiles

3. **Upkeep Phase:**
   - Pay upkeep (money per influence disk placed)
   - Collect resource production
   - Refresh colony ships

4. **Cleanup Phase:**
   - Return influence disks from action track
   - Flip player boards ready
   - Advance round marker
   - Refresh tech pool

### 3.6 Victory Points

**VP Sources:**
```typescript
VictoryPoints: {
  sectors: number           // 1 VP per controlled sector (with influence)
  technologies: number      // VP printed on tech tiles
  discoveryTiles: number    // VP from exploration rewards
  reputationTiles: number   // VP from combat victories
  monuments: number         // VP from special structures
  ambassadors: number       // VP from diplomacy (advanced)
  total: number
}
```

**Reputation Tiles:**
- Awarded for participating in combat
- Higher tiers for bigger battles
- Grant end-game VP bonuses
- Limited supply creates competition

**Discovery Tiles:**
- Drawn when exploring new sectors
- Provide immediate bonuses (resources, VP, techs)
- Some are kept for end-game scoring
- Some trigger special effects

---

## 4. Convex Schema Design

### 4.1 Extended Schema

```typescript
// convex/schema.ts (additions)

export default defineSchema({
  // === Existing tables ===
  rooms: defineTable({ /* existing fields */ }),
  players: defineTable({ /* existing fields */ }),
  gameState: defineTable({ /* existing fields */ }),
  fleetArchives: defineTable({ /* existing fields */ }),

  // === New tables for full game ===

  // Galaxy map
  sectors: defineTable({
    roomId: v.id("rooms"),
    sectorId: v.string(),           // Hex coordinate (e.g., "0,0", "1,-1")
    terrain: v.string(),            // "empty" | "nebula" | "asteroid" | "ancient"
    planets: v.array(v.object({
      type: v.string(),             // "material" | "science" | "money" | "wild"
      advanced: v.boolean(),        // Advanced planets worth 2
    })),
    warpPortals: v.array(v.number()), // Directions (0-5 for hex adjacency)
    controlledBy: v.optional(v.string()), // playerId or null
    hasInfluenceDisk: v.boolean(),
    discoveryTileId: v.optional(v.string()),
    ancientShips: v.optional(v.number()), // NPC combat difficulty
  }).index("by_room", ["roomId"])
    .index("by_room_sector", ["roomId", "sectorId"]),

  // Ship instances in sectors
  ships: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    sectorId: v.string(),
    shipType: v.string(),          // "interceptor" | "cruiser" | "dreadnought"
    blueprintSnapshot: v.any(),    // Snapshot of blueprint at build time
    hull: v.number(),
    alive: v.boolean(),
  }).index("by_room_sector", ["roomId", "sectorId"])
    .index("by_player", ["playerId"]),

  // Player blueprints
  blueprints: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    shipType: v.string(),
    parts: v.array(v.string()),    // Part IDs installed
  }).index("by_player_type", ["playerId", "shipType"]),

  // Technologies
  technologies: defineTable({
    roomId: v.id("rooms"),
    techId: v.string(),            // Global tech ID
    track: v.string(),             // "military" | "grid" | "nano" | "rare"
    tier: v.number(),
    name: v.string(),
    cost: v.object({
      science: v.number(),
      money: v.number(),
    }),
    victoryPoints: v.number(),
    unlockedParts: v.array(v.string()),
    effectDescription: v.string(),
    available: v.boolean(),        // In current pool
    researchedBy: v.optional(v.string()), // playerId who researched
  }).index("by_room", ["roomId"])
    .index("by_room_available", ["roomId", "available"]),

  // Player resources & state
  playerResources: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    materials: v.number(),
    science: v.number(),
    money: v.number(),
    materialIncome: v.number(),    // Calculated from population
    scienceIncome: v.number(),
    moneyIncome: v.number(),
    influenceDisksTotal: v.number(),
    influenceDisksAvailable: v.number(),
    populationCubesTotal: v.number(),
    populationCubesAvailable: v.number(),
    colonyShipsAvailable: v.number(),
  }).index("by_player", ["playerId"]),

  // Player research progress
  playerTechs: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    techId: v.string(),
    acquired: v.boolean(),
  }).index("by_player", ["playerId"])
    .index("by_player_tech", ["playerId", "techId"]),

  // Discovery tiles
  discoveryTiles: defineTable({
    roomId: v.id("rooms"),
    tileId: v.string(),
    type: v.string(),              // "vp" | "resource" | "tech" | "ancient"
    victoryPoints: v.number(),
    immediateEffect: v.optional(v.object({
      materials: v.optional(v.number()),
      science: v.optional(v.number()),
      money: v.optional(v.number()),
    })),
    ownedBy: v.optional(v.string()), // playerId
    inSector: v.optional(v.string()), // sectorId
  }).index("by_room", ["roomId"])
    .index("by_player", ["ownedBy"]),

  // Reputation tiles (combat rewards)
  reputationTiles: defineTable({
    roomId: v.id("rooms"),
    tier: v.number(),              // 1-5 (based on combat size)
    victoryPoints: v.number(),
    ownedBy: v.optional(v.string()), // playerId
  }).index("by_room", ["roomId"])
    .index("by_player", ["ownedBy"]),

  // Action history
  actions: defineTable({
    roomId: v.id("rooms"),
    roundNum: v.number(),
    playerId: v.string(),
    actionType: v.string(),
    params: v.any(),
    influenceCost: v.number(),
    timestamp: v.number(),
  }).index("by_room_round", ["roomId", "roundNum"])
    .index("by_player", ["playerId"]),

  // Combat results (archive)
  combatResults: defineTable({
    roomId: v.id("rooms"),
    roundNum: v.number(),
    sectorId: v.string(),
    participants: v.array(v.string()), // playerIds
    winnerId: v.string(),
    combatLog: v.array(v.string()),
    reputationAwarded: v.number(),
  }).index("by_room_round", ["roomId", "roundNum"]),
});
```

### 4.2 Key Schema Decisions

**Sectors as First-Class Entities:**
- Each sector is a database record
- Ships reference their current sector
- Influence/control tracked per sector
- Enables spatial queries and galaxy visualization

**Blueprints vs Ship Instances:**
- **Blueprint:** Template owned by player (can upgrade)
- **Ship Instance:** Built from blueprint snapshot (frozen at build time)
- Upgrading blueprint doesn't affect existing ships
- Matches physical board game behavior

**Technology Pool:**
- Global tech tiles with `available` flag
- Each round, new techs become available
- `researchedBy` tracks who purchased (removed from pool)
- Tech ownership tracked via `playerTechs` join table

**Resource Tracking:**
- Income calculated from population cube placement
- Resources stored per player
- Upkeep deducted each round (money per influence disk)
- Resource costs validated server-side

---

## 5. Game Flow Implementation

### 5.1 Room Setup

```typescript
// mutations/setupGame.ts
export const setupGame = mutation({
  args: { roomId: v.id("rooms"), playerConfigs: v.array(...) },
  handler: async (ctx, args) => {
    // 1. Initialize galaxy
    //    - Create Galactic Center sector (0,0)
    //    - Create starting sectors for each player
    //    - Initialize sector discovery deck

    // 2. Initialize player states
    //    - Create playerResources records
    //    - Grant starting resources (faction-specific)
    //    - Set influence disks (13-16 depending on faction)
    //    - Set population cubes (13)
    //    - Create starting blueprints (faction-specific)

    // 3. Initialize tech pool
    //    - Create all technology records
    //    - Mark tier-1 techs as available
    //    - Set up tech refresh mechanics

    // 4. Create starting ships
    //    - Each player gets 1-2 interceptors at home sector
    //    - Ships built from faction starting blueprints

    // 5. Set game state
    //    - gamePhase: "setup"
    //    - currentTurn: first player
    //    - roundNum: 1
  }
});
```

### 5.2 Action Phase

```typescript
// mutations/takeAction.ts
export const takeAction = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    action: v.object({
      type: v.string(),
      params: v.any(),
    })
  },
  handler: async (ctx, args) => {
    // 1. Validate turn order
    // 2. Validate influence disk availability
    // 3. Execute action based on type:

    switch (action.type) {
      case "explore":
        // - Draw random sector tile
        // - Player places on board (adjacent to controlled sector)
        // - Place influence disk + population (optional)
        // - Draw discovery tile
        // - Deduct influence disk

      case "influence":
        // - Place influence disk in existing sector
        // - Must be adjacent to controlled sector
        // - Place population cubes on planets (optional)
        // - Deduct influence disk

      case "research":
        // - Select available tech
        // - Deduct science + money
        // - Mark tech as researched
        // - Remove from available pool
        // - Grant unlocked parts to player

      case "upgrade":
        // - Select blueprint (interceptor/cruiser/dread)
        // - Add or remove parts
        // - Validate part prerequisites (techs researched)
        // - Deduct material costs for new parts
        // - Deduct influence disk

      case "build":
        // - Select sector (must control)
        // - Select ship type
        // - Snapshot current blueprint
        // - Create ship instance in sector
        // - Deduct materials
        // - Deduct influence disk

      case "move":
        // - Select ships in sector
        // - Select adjacent target sector
        // - Move ships
        // - Check for combat trigger
        // - Deduct influence disk
    }

    // 4. Record action in history
    // 5. Update player state
    // 6. Advance turn to next player or combat phase
  }
});
```

### 5.3 Combat Phase

```typescript
// mutations/resolveCombat.ts
export const resolveCombat = mutation({
  args: { roomId: v.id("rooms"), sectorId: v.string() },
  handler: async (ctx, args) => {
    // 1. Identify all players with ships in sector
    // 2. Build fleet snapshots for each player
    // 3. Run combat simulation (existing engine)
    //    - Multi-player: resolve pairs, then winners fight
    //    - Or: modify engine for 3+ player battles
    // 4. Update ship hull/alive status
    // 5. Award reputation tiles
    // 6. Record combat log
    // 7. Check for sector control changes
  }
});
```

### 5.4 Upkeep Phase

```typescript
// mutations/upkeepPhase.ts
export const upkeepPhase = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // For each player:
    // 1. Calculate upkeep cost
    //    - 1 money per influence disk placed on board
    //    - Faction-specific modifiers
    // 2. Deduct upkeep from money
    //    - If insufficient: bankruptcy (lose sectors)
    // 3. Calculate resource income
    //    - Materials: sum of material population cubes
    //    - Science: sum of science population cubes
    //    - Money: sum of money population cubes + trade bonus
    // 4. Add income to resource pools
    // 5. Refresh colony ships
  }
});
```

### 5.5 Cleanup & Round Advance

```typescript
// mutations/cleanupPhase.ts
export const cleanupPhase = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // 1. Return all influence disks from action track
    // 2. Reset player "passed" flags
    // 3. Move population from graveyard
    // 4. Advance round marker
    // 5. Refresh technology pool
    //    - Mark new tier-appropriate techs as available
    //    - Random selection based on player count
    // 6. Check for game end (round 8-9)
    //    - If end: calculate final VP, declare winner
    //    - Else: start new action phase
  }
});
```

---

## 6. Frontend Architecture

### 6.1 Component Structure

```
src/
  pages/
    FullGameLobby.tsx          # Pre-game setup
    FullGameBoard.tsx          # Main game board

  components/
    galaxy/
      GalaxyMap.tsx            # Hex grid visualization
      SectorTile.tsx           # Individual hex sector
      SectorDetail.tsx         # Sector info popup

    player/
      PlayerBoard.tsx          # Player dashboard
      ResourcePanel.tsx        # Materials/Science/Money
      InfluenceTrack.tsx       # Available influence disks
      PopulationTrack.tsx      # Available population

    tech/
      TechTree.tsx             # Technology display
      TechTile.tsx             # Individual tech card

    ships/
      BlueprintEditor.tsx      # Upgrade ship blueprints
      ShipBuilder.tsx          # Build new ships
      FleetView.tsx            # Ships in sector

    actions/
      ActionPanel.tsx          # Available actions
      ExploreAction.tsx        # Exploration UI
      ResearchAction.tsx       # Tech purchase UI
      UpgradeAction.tsx        # Blueprint modification
      BuildAction.tsx          # Ship construction
      MoveAction.tsx           # Ship movement

    combat/
      CombatViewer.tsx         # Combat log display
      (Reuse existing combat components)

    victory/
      VictoryPointsTracker.tsx # VP breakdown
      ScoreBoard.tsx           # End-game results
```

### 6.2 State Management

**Convex Queries:**
- `useGameState()` - Current game phase, turn order
- `useSectors()` - All sectors in galaxy
- `usePlayerResources()` - Resources, influence, population
- `useTechnologies()` - Available + researched techs
- `useBlueprints()` - Player's ship designs
- `useShipsInSector()` - Ships at location
- `useVictoryPoints()` - Current VP standings

**Local UI State:**
- Selected sector (for actions)
- Selected ships (for movement)
- Action preview (before commit)
- Modal dialogs (tech tree, blueprint editor)

### 6.3 Rendering Priorities

**Phase 0: Core Infrastructure**
1. Galaxy map (hex grid, basic rendering)
2. Sector placement and visualization
3. Player boards (resources, influence, population)

**Phase 1: Actions**
1. Explore action (draw, place, populate)
2. Influence action (control sectors)
3. Research action (buy techs)
4. Upgrade action (modify blueprints)
5. Build action (create ships)
6. Move action (relocate fleets)

**Phase 2: Combat & Upkeep**
1. Combat resolution (reuse existing)
2. Upkeep calculation
3. Resource production
4. Round advancement

**Phase 3: Victory & Polish**
1. VP tracking and display
2. End-game scoring
3. Animations and transitions
4. Tutorial and help system

---

## 7. Migration from Roguelike

### 7.1 Reusable Systems

**Keep As-Is:**
- Combat engine (`convex/engine/combat.ts`)
- Ship stats calculation (`shared/parts.ts`, `shared/frames.ts`)
- Faction definitions (`shared/factions.ts`)
- Convex multiplayer infrastructure

**Adapt:**
- `shared/types.ts` - Extend for full game state
- `shared/game.ts` - Add full game config
- `convex/schema.ts` - Add new tables (sectors, techs, etc.)
- Frontend components - New layouts for board game

**Replace:**
- `shared/pacing.ts` - Roguelike progression → full game rules
- `shared/difficulty.ts` - No longer needed
- Singleplayer mode - Full game is multiplayer-only

### 7.2 Migration Strategy

**Approach: Parallel Development**

1. **Keep roguelike functional:**
   - Don't break existing game
   - Separate routes: `/roguelike` vs `/full-game`

2. **Share common code:**
   - Combat engine
   - Ship/part definitions
   - Faction configs
   - Convex infrastructure

3. **New schema for full game:**
   - Separate table prefix: `fullGame_*`
   - Or: separate Convex project
   - Prevents conflicts with roguelike

4. **Incremental rollout:**
   - Week 1-2: Schema + galaxy map
   - Week 3-4: Actions (explore, influence, research)
   - Week 5-6: Build, move, combat
   - Week 7-8: Upkeep, VP, end-game
   - Week 9-10: Polish, balance, testing

---

## 8. Technical Challenges

### 8.1 Hex Grid Rendering

**Options:**
1. **SVG** - Scalable, crisp at any zoom
2. **Canvas** - Better performance for 100+ hexes
3. **CSS Grid + clip-path** - Simple but limited

**Recommendation:** Start with SVG, migrate to Canvas if needed

**Libraries:**
- `honeycomb-grid` - Hex math utilities
- `react-hexgrid` - React hex components
- `d3-hexbin` - D3 hex layouts

### 8.2 Turn Order & State Synchronization

**Challenges:**
- Multiple players acting concurrently (action phase)
- Optimistic UI updates
- Conflict resolution (two players research same tech)

**Solutions:**
- Server-authoritative turn order
- Action queue with validation
- Optimistic UI with rollback on conflict
- Use Convex reactivity for instant updates

### 8.3 Combat with 3+ Players

**Current engine:** 1v1 only

**Options:**
1. **Resolve pairs sequentially**
   - Round-robin tournament style
   - Simple but slow with many players

2. **Free-for-all mode**
   - All ships in initiative order
   - Target selection rules (nearest, lowest HP, etc.)
   - More complex but realistic

**Recommendation:** Start with pairs, add FFA later

### 8.4 Tech Pool Randomization

**Rules:**
- Each round, new techs appear
- Count depends on player count
- Must balance availability vs scarcity

**Implementation:**
- Pre-shuffle tech deck at game start
- Draw N cards per round (deterministic)
- Store shuffle seed in gameState
- Enables replay and fairness verification

---

## 9. Work Breakdown

### Stream 1: Galaxy & Sectors

**Owner:** Map Engineer

**Tasks:**
1. Design hex grid coordinate system
2. Create sector generation logic
3. Implement sector placement rules (adjacency)
4. Build GalaxyMap component (SVG rendering)
5. Add sector control visualization
6. Implement warp portal connections

**Dependencies:** None (can start immediately)

**Deliverables:**
- `convex/galaxy.ts` - Sector logic
- `src/components/galaxy/` - Map components
- Tests for hex math and adjacency

---

### Stream 2: Technology System

**Owner:** Tech Tree Engineer

**Tasks:**
1. Define technology data (all 50+ techs)
2. Create tech pool refresh logic
3. Implement research action
4. Build TechTree UI component
5. Add tech filtering and sorting
6. Implement part unlocking

**Dependencies:** Resource system (stream 3)

**Deliverables:**
- `shared/technologies.ts` - Tech definitions
- `convex/technologies.ts` - Tech pool logic
- `src/components/tech/` - Tech UI

---

### Stream 3: Resources & Economy

**Owner:** Economy Engineer

**Tasks:**
1. Implement resource tracking (materials/science/money)
2. Create income calculation logic
3. Implement upkeep system
4. Build resource display UI
5. Add population cube management
6. Implement influence disk tracking

**Dependencies:** None (can start immediately)

**Deliverables:**
- `convex/resources.ts` - Resource mutations
- `src/components/player/ResourcePanel.tsx`
- Tests for income/upkeep calculations

---

### Stream 4: Actions & Turn Flow

**Owner:** Action System Engineer

**Tasks:**
1. Implement action validation framework
2. Create explore action
3. Create influence action
4. Create upgrade action
5. Create build action
6. Create move action
7. Implement turn order and passing

**Dependencies:** All other streams (integrative)

**Deliverables:**
- `convex/actions/` - Action mutations
- `src/components/actions/` - Action UI
- Integration tests for full turn cycle

---

### Stream 5: Combat Integration

**Owner:** Combat Engineer

**Tasks:**
1. Adapt existing combat engine for board game
2. Implement reputation tile awards
3. Add multi-player combat resolution
4. Integrate combat with sector control
5. Build combat phase UI
6. Add combat history/replay

**Dependencies:** Sectors (stream 1), Ships/Blueprints (stream 4)

**Deliverables:**
- `convex/combat.ts` - Full game combat
- `src/components/combat/` - Combat UI
- Tests for combat scenarios

---

### Stream 6: Victory Points & End Game

**Owner:** Scoring Engineer

**Tasks:**
1. Implement VP calculation logic
2. Create VP tracking UI
3. Implement game end detection
4. Build final scoring screen
5. Add game history/replay
6. Implement winner declaration

**Dependencies:** All game systems (final integration)

**Deliverables:**
- `convex/scoring.ts` - VP calculations
- `src/components/victory/` - Scoring UI
- End-to-end game tests

---

## 10. Success Metrics

**Technical:**
- [ ] Support 2-6 players concurrently
- [ ] Sub-1s action latency (Convex mutation → UI update)
- [ ] Complete game playable in 60-90 minutes
- [ ] Zero data loss on network reconnect
- [ ] Mobile-responsive UI (tablets minimum)

**Gameplay:**
- [ ] All 6 action types functional
- [ ] Technology research working (50+ techs)
- [ ] Combat system balanced (not too random, not too deterministic)
- [ ] VP scoring accurate (matches physical board game)
- [ ] Tutorial mode for new players

**Quality:**
- [ ] 80%+ test coverage for game logic
- [ ] No critical bugs after 10+ full playtests
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Performance (60fps rendering on 3-year-old devices)

---

## 11. Future Enhancements

**Post-MVP:**
- Rise of the Ancients expansion (AI opponents)
- Shadow of the Rift expansion (new techs, factions)
- Custom faction creator
- Tournament mode (Swiss pairings, ELO ratings)
- Spectator mode (watch ongoing games)
- Replay system (watch completed games)
- AI assistants (suggest optimal actions)
- Async play (email notifications for turns)

---

## 12. References

**Eclipse Rules:**
- [Official Rules PDF](https://cdn.1j1ju.com/medias/bb/af/07-eclipse-second-dawn-for-the-galaxy-rulebook.pdf)
- [Eclipse Wiki](https://eclipse-boardgame.fandom.com/wiki/Official_Rules)
- [BoardGameGeek](https://boardgamegeek.com/boardgame/246900/eclipse-second-dawn-for-the-galaxy)

**Technical:**
- [Convex Documentation](https://docs.convex.dev/)
- [Hex Grid Guide](https://www.redblobgames.com/grids/hexagons/)
- [React Hexgrid](https://github.com/Hellenic/react-hexgrid)

**Inspiration:**
- [Colonist.io](https://colonist.io/) - Catan browser implementation
- [Terraforming Mars Digital](https://terraformingmarsthegame.com/)
- [Board Game Arena](https://boardgamearena.com/)

---

## Appendix A: Technology System Structure

**Technology Tracks:** 4 tracks (Nano, Grid, Military, Rare)

**Total Technologies:** 41 technologies (verified against Eclipse wiki)

### Technology Track Breakdown

**1. Nano Track:** 9 technologies
- Weapons, shields, hull enhancements
- Special abilities: Nanorobots, Advanced Labs
- Structures: Orbital, Monolith
- Movement: Wormhole Generator

**2. Grid Track:** 8 technologies
- Power Sources: Fusion Source, Tachyon Source, Quantum Source
- Drives: Fusion Drive, Tachyon Drive, Transition Drive
- Computers: Positron Computer, Gluon Computer, Neutrino Computer
- Infrastructure improvements

**3. Military Track:** 8 technologies
- Combat-focused technologies
- Weapons and defensive systems
- Battle optimizations

**4. Rare Track:** 16 technologies
- Unique, powerful technologies
- Limited availability (one of each per game)

Examples include:
- Absorption Shield
- Antimatter Splitter
- Cloaking Device
- Conifold Field
- Flux Missile
- Improved Logistics
- Metasynthesis
- Neutron Absorber
- Pico Modulator
- Sentient Hull
- Soliton Cannon
- Transition Drive
- Warp Portal
- Zero-Point Source

### Ship Part Categories (6 total)

Technologies unlock parts across these categories:
1. **Weapons** - Cannons, missiles, beams
2. **Shields** - Defense layers
3. **Drives** - Initiative/movement
4. **Computers** - Targeting/aim
5. **Sources** - Power generation
6. **Hull** - HP/armor

**Note:** The roguelike currently uses simplified part categories that map to these Eclipse board game categories. Full game will use exact Eclipse part definitions.

---

## Appendix B: Faction Abilities (Board Game)

**Terran Federation:**
- Start with 2 interceptors
- Extra colony ship
- Standard resources

**Mechanema:**
- Can move after building
- Cheaper builds
- Unique starting techs

**Planta:**
- Extra population cubes
- Better income
- Slower ships

**Eridani Empire:**
- Start with cruiser
- Better weapons
- Lower science production

**Hydran Progress:**
- Cheaper research
- Better computers
- Fragile ships

**Descendants of Draco:**
- Ancient tech affinity
- Unique part bonuses
- Complex economy

(6+ more factions in expansions)

---

**End of Architecture Document**

*Version 1.0 - February 22, 2026*
*Author: Lead Architect (Claude Sonnet 4.5)*
