# Eclipse Full Game - Integration Plan

**Version:** 1.0
**Date:** February 22, 2026
**Status:** Planning Phase

---

## Overview

This document outlines how the 6 parallel development streams will integrate into a cohesive Eclipse Second Dawn full game implementation.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │ Galaxy Map │  │ Tech Tree  │  │ Player Board/Resources ││
│  │ (Stream 1) │  │ (Stream 2) │  │ (Stream 3)            ││
│  └─────┬──────┘  └─────┬──────┘  └──────┬─────────────────┘│
│        │               │                 │                   │
│        └───────────────┴─────────────────┘                   │
│                        │                                     │
│                   Convex Queries                             │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                   Convex Backend                             │
│  ┌─────────────────────┴──────────────────────────────────┐ │
│  │           Action System (Stream 4)                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │ Explore  │ │ Research │ │ Upgrade  │ │ Build    │ │ │
│  │  │ Influence│ │          │ │          │ │ Move     │ │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │ │
│  └───────┼────────────┼────────────┼────────────┼────────┘ │
│          │            │            │            │           │
│  ┌───────┴────┐ ┌─────┴─────┐ ┌───┴──────┐ ┌──┴────────┐  │
│  │ Galaxy API │ │ Tech API  │ │Resource  │ │ Combat    │  │
│  │(Stream 1)  │ │(Stream 2) │ │API       │ │ Engine    │  │
│  │            │ │           │ │(Stream 3)│ │(Stream 5) │  │
│  └────────────┘ └───────────┘ └──────────┘ └───────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Victory Points System (Stream 6)             │  │
│  │  Aggregates: Sectors + Tech + Discovery + Reputation │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Stream Integration Points

### Stream 1: Galaxy & Sectors → Other Streams

**Provides to Stream 4 (Actions):**
- `getSectorById(sectorId)` - Query sector data
- `getAdjacentSectors(sectorId)` - Get physically adjacent hexes (6 neighbors)
- `getWormholeConnections(sectorId)` - Get wormhole-connected sectors
- `validateSectorPlacement(q, r)` - Check if hex placement valid
- `getPlayerControlledSectors(playerId)` - Check control for actions

**Provides to Stream 5 (Combat):**
- `getShipsInSector(sectorId)` - Get combatants
- `getSectorOwner(sectorId)` - Determine control changes

**Provides to Stream 6 (Victory Points):**
- `getPlayerSectorCount(playerId)` - Count controlled sectors (1 VP each)

**Consumes from Stream 3 (Resources):**
- Influence disk availability for sector control

**Schema Tables:**
```typescript
sectors: {
  roomId, sectorId, terrain, planets, warpPortals,
  controlledBy, hasInfluenceDisk, discoveryTileId, ancientShips
}

ships: {
  roomId, playerId, sectorId, shipType, blueprintSnapshot, hull, alive
}
```

**API Contract:**
```typescript
// Queries
export const getSector = query({
  args: { roomId: v.id("rooms"), sectorId: v.string() },
  handler: async (ctx, args) => { /* ... */ }
});

export const getAdjacentSectors = query({
  args: { roomId: v.id("rooms"), sectorId: v.string() },
  handler: async (ctx, args) => {
    // Returns array of physically adjacent sector IDs (6 neighbors in hex grid)
    // Uses axial coordinate math: (q, r) neighbors
    return ["sectorId1", "sectorId2", ...]; // array of sector IDs
  }
});

export const getWormholeConnections = query({
  args: { roomId: v.id("rooms"), sectorId: v.string() },
  handler: async (ctx, args) => {
    // Returns array of sector IDs connected via wormholes
    // Checks sector's warpPortals field + Warp Portal tech tiles
    return ["distantSectorId1", ...]; // array of sector IDs
  }
});

export const getSectorsByPlayer = query({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => { /* returns controlled sectors */ }
});

// Mutations
export const placeSector = mutation({
  args: { roomId: v.id("rooms"), sectorId: v.string(), q: v.number(), r: v.number(), terrain: v.string(), planets: v.any() },
  handler: async (ctx, args) => { /* ... */ }
});

export const setSectorControl = mutation({
  args: { roomId: v.id("rooms"), sectorId: v.string(), playerId: v.string(), hasInfluenceDisk: v.boolean() },
  handler: async (ctx, args) => { /* ... */ }
});
```

---

### Stream 2: Technology System → Other Streams

**Provides to Stream 4 (Actions):**
- `getAvailableTechs(roomId)` - List techs in current pool
- `getTechCost(techId)` - Get science/money cost
- `validateResearch(playerId, techId)` - Check if can research
- `getPlayerTechs(playerId)` - Get researched techs
- `getUnlockedParts(playerId)` - Parts available for blueprints

**Provides to Stream 6 (Victory Points):**
- `getTechVictoryPoints(playerId)` - Sum VP from researched techs

**Consumes from Stream 3 (Resources):**
- Science and money for tech purchases

**Schema Tables:**
```typescript
technologies: {
  roomId, techId, track, tier, name, cost, victoryPoints,
  unlockedParts, effectDescription, available, researchedBy
}

playerTechs: {
  roomId, playerId, techId, acquired
}
```

**API Contract:**
```typescript
// Queries
export const getAvailableTechnologies = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => { /* returns available: true techs */ }
});

export const getPlayerTechnologies = query({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => { /* returns player's researched techs */ }
});

export const getUnlockedParts = query({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => { /* returns part IDs from techs */ }
});

// Mutations
export const researchTechnology = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), techId: v.string() },
  handler: async (ctx, args) => {
    // 1. Validate tech available
    // 2. Deduct resources (call Resource API)
    // 3. Mark tech as researched
    // 4. Remove from available pool
    // 5. Unlock parts for player
  }
});

export const refreshTechPool = mutation({
  args: { roomId: v.id("rooms"), roundNum: v.number() },
  handler: async (ctx, args) => {
    // Draw new techs from deck based on round/player count
  }
});
```

---

### Stream 3: Resources & Economy → Other Streams

**Provides to Stream 2 (Tech):**
- `deductResources(playerId, { science, money })` - For tech purchases

**Provides to Stream 4 (Actions):**
- `getPlayerResources(playerId)` - Check resource availability
- `deductMaterials(playerId, amount)` - For building
- `hasInfluenceDisks(playerId, count)` - Check action availability
- `useInfluenceDisk(playerId)` - Consume disk for action
- `placePopulation(playerId, sectorId, planetType)` - For explore/influence

**Provides to Stream 6 (Victory Points):**
- No direct VP contribution (resources don't grant VP)

**Consumes from Stream 1 (Galaxy):**
- Planet types for income calculation

**Schema Tables:**
```typescript
playerResources: {
  roomId, playerId,
  materials, science, money,
  materialIncome, scienceIncome, moneyIncome,
  influenceDisksTotal, influenceDisksAvailable,
  populationCubesTotal, populationCubesAvailable,
  colonyShipsAvailable
}
```

**API Contract:**
```typescript
// Queries
export const getPlayerResources = query({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => { /* ... */ }
});

export const calculateIncome = query({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Count population on planets by type
    // Return { materials, science, money }
  }
});

// Mutations
export const deductResources = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), materials: v.optional(v.number()), science: v.optional(v.number()), money: v.optional(v.number()) },
  handler: async (ctx, args) => { /* ... */ }
});

export const addResources = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), materials: v.optional(v.number()), science: v.optional(v.number()), money: v.optional(v.number()) },
  handler: async (ctx, args) => { /* ... */ }
});

export const useInfluenceDisk = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Decrement influenceDisksAvailable
  }
});

export const returnInfluenceDisks = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Return all disks during cleanup phase
  }
});

export const payUpkeep = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Calculate upkeep (1 money per placed disk)
    // Deduct money
    // Handle bankruptcy if insufficient
  }
});

export const collectIncome = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Call calculateIncome
    // Add to player resources
  }
});
```

---

### Stream 4: Actions & Turn Flow → All Streams

**Orchestrates all other streams** - Actions call APIs from Streams 1, 2, 3, 5

**Turn Order Management:**
```typescript
export const advanceTurn = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Move to next player (clockwise)
    // Check if all passed → advance to combat phase
  }
});

export const passTurn = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Mark player as passed
    // Advance turn
  }
});
```

**Action Implementations:**

```typescript
// EXPLORE ACTION
export const exploreAction = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), placementQ: v.number(), placementR: v.number(), rotation: v.number() },
  handler: async (ctx, args) => {
    // 1. Check influence disk (Stream 3)
    const resources = await ctx.runQuery(api.resources.getPlayerResources, { roomId, playerId });
    if (resources.influenceDisksAvailable < 1) throw new Error("No influence disks");

    // 2. Draw sector tile (Stream 1)
    const sector = await ctx.runMutation(api.galaxy.drawSectorTile, { roomId });

    // 3. Place sector (Stream 1)
    await ctx.runMutation(api.galaxy.placeSector, {
      roomId,
      sectorId: sector.id,
      q: placementQ,
      r: placementR,
      terrain: sector.terrain,
      planets: sector.planets
    });

    // 4. Place influence disk (Stream 1)
    await ctx.runMutation(api.galaxy.setSectorControl, {
      roomId,
      sectorId: sector.id,
      playerId,
      hasInfluenceDisk: true
    });

    // 5. Use influence disk (Stream 3)
    await ctx.runMutation(api.resources.useInfluenceDisk, { roomId, playerId });

    // 6. Draw discovery tile (future)

    // 7. Record action
    await ctx.runMutation(api.actions.recordAction, {
      roomId, playerId, actionType: "explore", params: { sectorId: sector.id }
    });
  }
});

// RESEARCH ACTION
export const researchAction = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), techId: v.string() },
  handler: async (ctx, args) => {
    // 1. Check influence disk (Stream 3)
    const resources = await ctx.runQuery(api.resources.getPlayerResources, { roomId, playerId });
    if (resources.influenceDisksAvailable < 1) throw new Error("No influence disks");

    // 2. Get tech cost (Stream 2)
    const tech = await ctx.runQuery(api.technologies.getTechnology, { roomId, techId });

    // 3. Validate resources (Stream 3)
    if (resources.science < tech.cost.science || resources.money < tech.cost.money) {
      throw new Error("Insufficient resources");
    }

    // 4. Deduct resources (Stream 3)
    await ctx.runMutation(api.resources.deductResources, {
      roomId, playerId, science: tech.cost.science, money: tech.cost.money
    });

    // 5. Research tech (Stream 2)
    await ctx.runMutation(api.technologies.researchTechnology, { roomId, playerId, techId });

    // 6. Use influence disk (Stream 3)
    await ctx.runMutation(api.resources.useInfluenceDisk, { roomId, playerId });

    // 7. Record action
    await ctx.runMutation(api.actions.recordAction, {
      roomId, playerId, actionType: "research", params: { techId }
    });
  }
});

// UPGRADE ACTION
export const upgradeAction = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), shipType: v.string(), partToAdd: v.optional(v.string()), partToRemove: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // 1. Check influence disk
    // 2. Get unlocked parts (Stream 2)
    const unlockedParts = await ctx.runQuery(api.technologies.getUnlockedParts, { roomId, playerId });

    // 3. Validate part unlocked
    if (partToAdd && !unlockedParts.includes(partToAdd)) {
      throw new Error("Part not unlocked");
    }

    // 4. Modify blueprint (new mutation)
    await ctx.runMutation(api.blueprints.modifyBlueprint, {
      roomId, playerId, shipType, partToAdd, partToRemove
    });

    // 5. Deduct materials if adding part (Stream 3)
    if (partToAdd) {
      const part = getPart(partToAdd); // from shared/parts.ts
      await ctx.runMutation(api.resources.deductResources, {
        roomId, playerId, materials: part.cost
      });
    }

    // 6. Use influence disk
    await ctx.runMutation(api.resources.useInfluenceDisk, { roomId, playerId });

    // 7. Record action
  }
});

// BUILD ACTION
export const buildAction = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), sectorId: v.string(), shipType: v.string() },
  handler: async (ctx, args) => {
    // 1. Check sector control (Stream 1)
    const sector = await ctx.runQuery(api.galaxy.getSector, { roomId, sectorId });
    if (sector.controlledBy !== playerId) throw new Error("Sector not controlled");

    // 2. Get blueprint (new)
    const blueprint = await ctx.runQuery(api.blueprints.getBlueprint, { roomId, playerId, shipType });

    // 3. Calculate material cost
    const totalCost = calculateBuildCost(blueprint); // from shared logic

    // 4. Deduct materials (Stream 3)
    await ctx.runMutation(api.resources.deductResources, { roomId, playerId, materials: totalCost });

    // 5. Create ship instance (Stream 1)
    await ctx.runMutation(api.galaxy.createShip, {
      roomId, playerId, sectorId, shipType, blueprintSnapshot: blueprint
    });

    // 6. Use influence disk
    await ctx.runMutation(api.resources.useInfluenceDisk, { roomId, playerId });

    // 7. Record action
  }
});

// MOVE ACTION
export const moveAction = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string(), shipIds: v.array(v.id("ships")), targetSectorId: v.string() },
  handler: async (ctx, args) => {
    // 1. Check influence disk
    // 2. Validate ships exist and owned by player (Stream 1)
    // 3. Validate target sector reachable (Stream 1)
    const adjacent = await ctx.runQuery(api.galaxy.getAdjacentSectors, { roomId, sectorId: sourceSector });
    const wormholes = await ctx.runQuery(api.galaxy.getWormholeConnections, { roomId, sectorId: sourceSector });
    const reachable = [...adjacent, ...wormholes];
    if (!reachable.includes(targetSectorId)) throw new Error("Not reachable");

    // 4. Move ships (Stream 1)
    await ctx.runMutation(api.galaxy.moveShips, { roomId, shipIds, targetSectorId });

    // 5. Check for combat trigger (Stream 5)
    const shipsInTarget = await ctx.runQuery(api.galaxy.getShipsInSector, { roomId, sectorId: targetSectorId });
    const players = [...new Set(shipsInTarget.map(s => s.playerId))];
    if (players.length > 1) {
      // Queue combat for this sector
      await ctx.runMutation(api.combat.queueCombat, { roomId, sectorId: targetSectorId });
    }

    // 6. Use influence disk
    await ctx.runMutation(api.resources.useInfluenceDisk, { roomId, playerId });

    // 7. Record action
  }
});
```

**Phase Orchestration:**

```typescript
export const advanceToPhase = mutation({
  args: { roomId: v.id("rooms"), phase: v.string() },
  handler: async (ctx, args) => {
    switch (args.phase) {
      case "combat":
        // Stream 5: Resolve all queued combats
        await ctx.runMutation(api.combat.resolveCombatPhase, { roomId });
        break;

      case "upkeep":
        // Stream 3: Pay upkeep, collect income
        const players = await ctx.runQuery(api.rooms.getPlayers, { roomId });
        for (const player of players) {
          await ctx.runMutation(api.resources.payUpkeep, { roomId, playerId: player.id });
          await ctx.runMutation(api.resources.collectIncome, { roomId, playerId: player.id });
        }
        break;

      case "cleanup":
        // Stream 3: Return influence disks
        for (const player of players) {
          await ctx.runMutation(api.resources.returnInfluenceDisks, { roomId, playerId: player.id });
        }

        // Stream 2: Refresh tech pool
        const gameState = await ctx.runQuery(api.gameState.get, { roomId });
        await ctx.runMutation(api.technologies.refreshTechPool, { roomId, roundNum: gameState.roundNum + 1 });

        // Advance round
        await ctx.runMutation(api.gameState.advanceRound, { roomId });
        break;
    }
  }
});
```

---

### Stream 5: Combat Integration → Streams 1, 3, 6

**Consumes from Stream 1 (Galaxy):**
- `getShipsInSector(sectorId)` - Get combatants
- Ship blueprints for combat simulation

**Provides to Stream 1 (Galaxy):**
- Update ship hull/alive status after combat
- Transfer sector control to winner

**Provides to Stream 6 (Victory Points):**
- Award reputation tiles to combatants

**Consumes from Stream 3 (Resources):**
- No direct resource changes (combat doesn't cost resources)

**API Contract:**
```typescript
export const queueCombat = mutation({
  args: { roomId: v.id("rooms"), sectorId: v.string() },
  handler: async (ctx, args) => {
    // Add to combat queue for combat phase
  }
});

export const resolveCombatPhase = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Get all queued combats
    const combats = await ctx.runQuery(api.combat.getQueuedCombats, { roomId });

    // Process in descending sector number order
    const sorted = combats.sort((a, b) => parseInt(b.sectorId) - parseInt(a.sectorId));

    for (const combat of sorted) {
      // 1. Get ships (Stream 1)
      const ships = await ctx.runQuery(api.galaxy.getShipsInSector, { roomId, sectorId: combat.sectorId });

      // 2. Group by player
      const fleetsByPlayer = groupByPlayer(ships);

      // 3. Run combat simulation (existing engine)
      const result = simulateCombat({
        seed: `${roomId}-round-${roundNum}-${combat.sectorId}`,
        playerAId: playerA,
        playerBId: playerB,
        fleetA: fleetsByPlayer[playerA],
        fleetB: fleetsByPlayer[playerB]
      });

      // 4. Update ship states (Stream 1)
      await ctx.runMutation(api.galaxy.updateShips, {
        roomId,
        updates: result.finalA.concat(result.finalB)
      });

      // 5. Update sector control (Stream 1)
      if (result.winnerPlayerId) {
        await ctx.runMutation(api.galaxy.setSectorControl, {
          roomId,
          sectorId: combat.sectorId,
          playerId: result.winnerPlayerId
        });
      }

      // 6. Award reputation tiles (Stream 6)
      const tier = calculateReputationTier(fleetsByPlayer);
      await ctx.runMutation(api.reputation.awardTile, {
        roomId,
        tier,
        playerIds: Object.keys(fleetsByPlayer)
      });

      // 7. Record combat result
      await ctx.runMutation(api.combat.recordResult, {
        roomId,
        sectorId: combat.sectorId,
        winnerId: result.winnerPlayerId,
        combatLog: result.roundLog
      });
    }
  }
});
```

---

### Stream 6: Victory Points & End Game → Streams 1, 2, 3

**Consumes from all streams:**
- Stream 1: Sector count (1 VP each controlled sector)
- Stream 2: Tech VP (sum of VP on researched techs)
- Discovery tiles VP (from explore actions)
- Reputation tiles VP (from combat)

**API Contract:**
```typescript
export const calculateVictoryPoints = query({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    // Sector VP
    const sectors = await ctx.runQuery(api.galaxy.getSectorsByPlayer, { roomId, playerId });
    const sectorVP = sectors.length;

    // Tech VP
    const techs = await ctx.runQuery(api.technologies.getPlayerTechnologies, { roomId, playerId });
    const techVP = techs.reduce((sum, tech) => sum + tech.victoryPoints, 0);

    // Discovery tile VP
    const discoveries = await ctx.runQuery(api.discoveries.getPlayerTiles, { roomId, playerId });
    const discoveryVP = discoveries.reduce((sum, tile) => sum + tile.victoryPoints, 0);

    // Reputation tile VP
    const reputation = await ctx.runQuery(api.reputation.getPlayerTiles, { roomId, playerId });
    const reputationVP = reputation.reduce((sum, tile) => sum + tile.victoryPoints, 0);

    return {
      sectors: sectorVP,
      technologies: techVP,
      discoveries: discoveryVP,
      reputation: reputationVP,
      total: sectorVP + techVP + discoveryVP + reputationVP
    };
  }
});

export const checkGameEnd = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const gameState = await ctx.runQuery(api.gameState.get, { roomId });
    return gameState.roundNum >= 9; // Game ends after round 8 or 9
  }
});

export const finalizeGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Calculate VP for all players
    const players = await ctx.runQuery(api.rooms.getPlayers, { roomId });
    const vpResults = [];

    for (const player of players) {
      const vp = await ctx.runQuery(api.victoryPoints.calculateVictoryPoints, { roomId, playerId: player.id });
      vpResults.push({ playerId: player.id, ...vp });
    }

    // Sort by total VP (descending)
    vpResults.sort((a, b) => b.total - a.total);

    // Handle tiebreakers
    const winner = vpResults[0];
    const tied = vpResults.filter(p => p.total === winner.total);
    if (tied.length > 1) {
      // Tiebreaker: most techs
      // If still tied: most money
    }

    // Update game state
    await ctx.runMutation(api.gameState.setWinner, { roomId, winnerId: winner.playerId, vpResults });
  }
});
```

---

## Frontend Integration Points

### Galaxy Map Component

**Renders:** Hex grid with sectors, ships, control markers

**Data Sources:**
- `useQuery(api.galaxy.getSectors, { roomId })`
- `useQuery(api.galaxy.getShipsInSector, { roomId, sectorId })`

**User Actions:**
- Click sector → Show sector detail
- Drag ship → Trigger move action (if valid)
- Click empty hex → Explore action placement UI

**Connects to:**
- Action Panel (enable/disable explore, influence, move)
- Sector Detail Modal (show planets, ships, control)

### Tech Tree Component

**Renders:** 3 tracks + Rare pool, available vs researched

**Data Sources:**
- `useQuery(api.technologies.getAvailableTechnologies, { roomId })`
- `useQuery(api.technologies.getPlayerTechnologies, { roomId, playerId })`
- `useQuery(api.resources.getPlayerResources, { roomId, playerId })` (to show if affordable)

**User Actions:**
- Click available tech → Research action (if affordable + has influence disk)

**Connects to:**
- Resource Panel (show costs, deduct on purchase)
- Action Panel (enable/disable research)

### Player Board Component

**Renders:** Resources, influence disks, population, blueprints

**Data Sources:**
- `useQuery(api.resources.getPlayerResources, { roomId, playerId })`
- `useQuery(api.blueprints.getPlayerBlueprints, { roomId, playerId })`

**User Actions:**
- Click blueprint → Upgrade action UI
- Shows available influence disks (limits actions)

**Connects to:**
- Action Panel (show action costs)
- Blueprint Editor (upgrade action)

### Action Panel Component

**Renders:** 6 action buttons + Pass button

**Enables/Disables based on:**
- Influence disks available (Stream 3)
- Resources available (Stream 3 for research/build)
- Sector control (Stream 1 for build)
- Turn order (only current player)

**User Actions:**
- Click action → Open action-specific UI
- Click Pass → `useMutation(api.actions.passTurn)`

### Turn Flow Indicators

**Shows:**
- Current phase (Action, Combat, Upkeep, Cleanup)
- Current player (for action phase)
- Round number

**Data Source:**
- `useQuery(api.gameState.get, { roomId })`

**Triggers:**
- Phase transitions (auto-advance after all players pass)
- Combat resolution (show combat log during combat phase)
- Upkeep calculations (show income/costs during upkeep)

---

## Data Flow Examples

### Example 1: Research Technology

```
User clicks "Research Plasma Cannon"
  ↓
Frontend: TechTree.tsx
  ↓
useMutation(api.actions.researchAction, { techId: "plasma_cannon" })
  ↓
Backend: convex/actions/research.ts
  ↓
1. Check influence disk (api.resources.getPlayerResources)
2. Get tech cost (api.technologies.getTechnology)
3. Validate resources (science >= cost.science, money >= cost.money)
4. Deduct resources (api.resources.deductResources)
5. Research tech (api.technologies.researchTechnology)
   ↓
   - Mark tech as researched
   - Remove from available pool
   - Unlock "Plasma Cannon" part
6. Use influence disk (api.resources.useInfluenceDisk)
7. Record action (api.actions.recordAction)
  ↓
Convex reactivity triggers frontend updates:
  ↓
- TechTree.tsx: Tech moves from "available" to "researched"
- ResourcePanel.tsx: Science and money decrease
- InfluenceTrack.tsx: Available disks decrease
- BlueprintEditor.tsx: "Plasma Cannon" part now selectable
```

### Example 2: Move Ships (triggers combat)

```
User drags ships from Sector A to Sector B
  ↓
Frontend: GalaxyMap.tsx
  ↓
useMutation(api.actions.moveAction, { shipIds: [1,2], targetSectorId: "B" })
  ↓
Backend: convex/actions/move.ts
  ↓
1. Check influence disk
2. Validate ships owned by player
3. Validate sectors adjacent (api.galaxy.getAdjacentSectors)
4. Move ships (api.galaxy.moveShips)
5. Check combatants in target (api.galaxy.getShipsInSector)
   → Two players detected!
6. Queue combat (api.combat.queueCombat)
7. Use influence disk
8. Record action
  ↓
Action phase continues...
  ↓
All players pass
  ↓
advanceToPhase("combat")
  ↓
Backend: convex/phases/combat.ts
  ↓
1. Get queued combats
2. For each combat (descending sector order):
   - Get ships in sector
   - Group by player
   - Run combat simulation (existing engine)
   - Update ship states (hull, alive)
   - Update sector control (winner)
   - Award reputation tiles
   - Record combat log
  ↓
Convex reactivity:
  ↓
- GalaxyMap.tsx: Ships updated (some destroyed)
- GalaxyMap.tsx: Sector control changes color
- CombatLog.tsx: Shows battle results
- ReputationPanel.tsx: New tile awarded
```

### Example 3: End Game Scoring

```
Round 9 cleanup phase completes
  ↓
Backend: checkGameEnd() returns true
  ↓
finalizeGame() mutation triggered
  ↓
For each player:
  1. Calculate sector VP (api.galaxy.getSectorsByPlayer)
  2. Calculate tech VP (api.technologies.getPlayerTechnologies)
  3. Calculate discovery VP (api.discoveries.getPlayerTiles)
  4. Calculate reputation VP (api.reputation.getPlayerTiles)
  5. Sum total VP
  ↓
Sort players by total VP
  ↓
Apply tiebreakers if needed
  ↓
Update game state with winner
  ↓
Frontend: Navigate to FinalScoring.tsx
  ↓
Display VP breakdown per player
  ↓
Highlight winner
```

---

## Testing Integration Points

### Unit Tests (per stream)

Each stream tests its own logic in isolation with mocked dependencies.

**Example: Tech System Tests**
```typescript
describe("researchTechnology", () => {
  it("deducts correct resources", async () => {
    // Mock resources API
    const mockDeduct = vi.fn();

    // Test tech research
    await researchTechnology({ techId: "plasma_cannon" });

    // Verify deduct called with correct amounts
    expect(mockDeduct).toHaveBeenCalledWith({ science: 5, money: 2 });
  });
});
```

### Integration Tests (cross-stream)

Test API contracts between streams.

**Example: Research Action Integration**
```typescript
describe("researchAction integration", () => {
  it("researches tech and unlocks parts", async () => {
    // Setup: Player has 10 science, 5 money, 2 influence disks
    // Setup: Plasma Cannon tech costs 5 science, 2 money
    // Setup: Plasma Cannon tech unlocks "plasma" part

    await researchAction({ playerId, techId: "plasma_cannon" });

    // Verify: Resources deducted
    const resources = await getPlayerResources({ playerId });
    expect(resources.science).toBe(5);
    expect(resources.money).toBe(3);
    expect(resources.influenceDisksAvailable).toBe(1);

    // Verify: Tech researched
    const techs = await getPlayerTechnologies({ playerId });
    expect(techs).toContainEqual(expect.objectContaining({ techId: "plasma_cannon" }));

    // Verify: Part unlocked
    const parts = await getUnlockedParts({ playerId });
    expect(parts).toContain("plasma");
  });
});
```

### End-to-End Tests

Test complete game flows.

**Example: Full Turn Cycle**
```typescript
describe("Full turn cycle", () => {
  it("completes action → combat → upkeep → cleanup", async () => {
    // Action phase: Player 1 explores, Player 2 researches, both pass
    // Combat phase: No combats queued
    // Upkeep phase: Pay upkeep, collect income
    // Cleanup phase: Return disks, refresh tech pool, advance round

    expect(gameState.roundNum).toBe(2);
    expect(gameState.gamePhase).toBe("action");
  });
});
```

---

## Deployment Strategy

### Phase 1: Foundation (Weeks 1-2)

**Deploy:**
- Stream 1: Galaxy schema + basic queries
- Stream 2: Tech schema + basic queries
- Stream 3: Resource schema + basic queries

**Integration:**
- Schema compatibility verified
- Basic queries return mock data
- Frontend renders empty boards

### Phase 2: Actions (Weeks 3-4)

**Deploy:**
- Stream 4: Explore, Influence, Research actions
- Frontend: Action UI for these 3 actions

**Integration:**
- Explore → Galaxy + Resources
- Research → Tech + Resources
- Influence → Galaxy + Resources
- End-to-end tests for each action

### Phase 3: Building & Combat (Weeks 5-6)

**Deploy:**
- Stream 4: Upgrade, Build, Move actions
- Stream 5: Combat resolution
- Frontend: Blueprint editor, combat viewer

**Integration:**
- Upgrade → Tech (unlocked parts) + Resources
- Build → Galaxy (create ships) + Resources
- Move → Galaxy + Combat (trigger battles)
- Combat → Galaxy (update ships) + Reputation

### Phase 4: Completion (Weeks 7-8)

**Deploy:**
- Stream 6: VP calculation, game end
- Frontend: Final scoring screen
- Polish & bug fixes

**Integration:**
- VP system queries all streams
- Game end triggers final scoring
- Full game playable start to finish

---

## Monitoring & Debugging

### Stream Health Checks

**Per-stream queries:**
```typescript
// Galaxy health
export const galaxyHealthCheck = query({
  handler: async (ctx) => {
    const sectorCount = await ctx.db.query("sectors").collect();
    const shipCount = await ctx.db.query("ships").collect();
    return { sectors: sectorCount.length, ships: shipCount.length };
  }
});

// Tech health
export const techHealthCheck = query({
  handler: async (ctx) => {
    const availableCount = await ctx.db.query("technologies").filter(q => q.eq("available", true)).collect();
    return { availableTechs: availableCount.length };
  }
});
```

### Integration Logs

Log cross-stream calls for debugging:

```typescript
export const researchAction = mutation({
  handler: async (ctx, args) => {
    console.log("[INTEGRATION] Research action started", { playerId, techId });

    console.log("[INTEGRATION] Calling resources.getPlayerResources");
    const resources = await ctx.runQuery(api.resources.getPlayerResources, args);

    console.log("[INTEGRATION] Calling technologies.researchTechnology");
    await ctx.runMutation(api.technologies.researchTechnology, args);

    console.log("[INTEGRATION] Research action complete");
  }
});
```

### Performance Metrics

Track integration overhead:
- Action latency (time from frontend call to completion)
- Cross-stream query counts
- Database query counts per action

---

## Rollback Plan

If integration issues arise:

1. **Isolate the problem stream** - Disable actions that depend on it
2. **Fallback to mocks** - Replace broken API with mock data
3. **Fix in isolation** - Agent fixes their stream independently
4. **Re-integrate** - Test integration before re-enabling
5. **Deploy incrementally** - Enable one action at a time

---

## Success Criteria

Integration is successful when:

✅ All 6 actions work end-to-end
✅ Full turn cycle completes (action → combat → upkeep → cleanup)
✅ Game ends after 8-9 rounds with correct VP calculation
✅ No cross-stream API breaking changes
✅ Frontend updates in real-time via Convex reactivity
✅ Sub-1s latency for all user actions
✅ Zero data loss on network reconnect

---

**Last Updated:** February 22, 2026
**Next Review:** After Phase 1 deployment (Week 2)
