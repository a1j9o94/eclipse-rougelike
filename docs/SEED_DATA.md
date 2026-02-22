## Eclipse: Second Dawn - Seed Data Guide

## Overview

The `/workspace/group/eclipse-full-game/convex/seedData/` directory contains complete game configuration data for Eclipse: Second Dawn. This data should be used to populate the Convex database when initializing a new game.

## Files

### `technologies.ts`
Contains all 40 technology tiles from the board game.

**Structure:**
```typescript
interface TechnologySeedData {
  name: string;
  track: "nano" | "grid" | "military" | "rare";
  tier: number; // 1 (cheap) to 3 (expensive)
  minCost: number; // with discounts
  maxCost: number; // full price
  effect: string;
  effectData?: string; // JSON for game logic
  unlocksParts: string[]; // part names
  victoryPoints: number;
  position: { x: number; y: number };
}
```

**Tracks:**
- **Nano** (8 techs): Automation, construction, expansion
- **Grid** (8 techs): Energy, economy, ship systems
- **Military** (8 techs): Weapons, defenses, resource extraction
- **Rare** (16 techs): Unique, powerful technologies (only one of each per game)

### `parts.ts`
Contains all 30 ship components.

**Structure:**
```typescript
interface PartSeedData {
  name: string;
  type: "cannon" | "missile" | "shield" | "computer" | "drive" | "hull" | "power_source";

  // Combat stats
  diceType?: "yellow" | "orange" | "red";
  diceCount: number;

  // Ship stats
  energyProduction: number;
  energyCost: number;
  initiativeBonus: number;
  hullValue: number;
  driveSpeed: number;
  shieldValue: number;

  // Requirements
  requiresTechnologies: string[];
}
```

**Part Types:**
- **Cannons** (5): Energy weapons - Ion, Plasma, Antimatter, Soliton, Rift
- **Missiles** (3): No energy cost - Ion, Plasma, Flux
- **Shields** (4): Defense - Gauss, Phase, Absorption, Conifold
- **Computers** (3): Attack bonus - Targeting, Positron, Gluon
- **Drives** (4): Movement - Nuclear, Fusion, Tachyon, Transition
- **Power Sources** (4): Energy generation - Nuclear, Fusion, Tachyon, Zero-Point
- **Hulls** (7): Damage absorption - Interceptor, Cruiser, Dreadnought, Starbase, Improved, Sentient

**Ship Slot Limits:**
```typescript
{
  interceptor: { hull: 1, powerSource: 1, drives: 1, computers: 1, shields: 0, weapons: 1 },
  cruiser: { hull: 1, powerSource: 1, drives: 2, computers: 1, shields: 1, weapons: 2 },
  dreadnought: { hull: 1, powerSource: 1, drives: 2, computers: 2, shields: 2, weapons: 4 },
  starbase: { hull: 1, powerSource: 1, drives: 0, computers: 2, shields: 3, weapons: 4 },
}
```

### `factions.ts`
Contains all 13 playable factions.

**Structure:**
```typescript
interface FactionSeedData {
  name: string;
  description: string;
  isAlien: boolean;

  // Starting resources
  startingMaterials: number;
  startingScience: number;
  startingMoney: number;

  // Capacities
  maxInfluenceDisks: number;
  influenceCosts: number[];
  maxColonyShips: number;
  maxReputationTiles: number;
  maxAmbassadors: number;

  // Mechanics
  actionCount: string; // "3,4,4"
  tradeRatio: number;
  defaultBlueprints: string[];

  // Abilities
  specialAbilities: Array<{
    name: string;
    description: string;
    effect: string; // JSON
  }>;

  startingTechnologies: string[];
}
```

**Factions:**

**Terran (6):**
1. **Terran Directorate** - Balanced, no special abilities
2. **Terran Federation** - Extra influence disks and ambassadors
3. **Terran Union** - Economic focus, extra starting money
4. **Terran Republic** - Military focus, extra starting materials
5. **Terran Conglomerate** - Research focus, extra starting science
6. **Terran Alliance** - Balanced extra resources

**Alien (7):**
1. **Eridani Empire** - Starts with reputation tiles, fewer influence disks, enhanced movement
2. **Hydran Progress** - Research 2 techs per action, starts with Advanced Labs
3. **Planta** - Double explore, 4 colony ships, fragile population, VP per hex controlled
4. **Descendants of Draco** - Coexist with Ancients, selective exploration, VP per Ancient
5. **Mechanema** - Triple build/upgrade, reduced costs, extra materials
6. **Orion Hegemony** - Starts with Cruiser, better trade ratio (3:2), Neutron Bombs
7. (Base Terran counted as 7th)

### `tiles.ts`
Contains discovery tiles, reputation tiles, ambassadors, and dice.

**Discovery Tiles:**
```typescript
interface DiscoveryTileSeedData {
  type: "money" | "science" | "materials" | "reputation" | "technology" | "ship_part" | "colony_ship" | "ancient_tech" | "wormhole_generator" | "artifact";
  moneyBonus: number;
  scienceBonus: number;
  materialsBonus: number;
  victoryPoints: number;
  count: number; // quantity in game
}
```

**Discovery Tile Distribution:**
- 6× Money (5 credits)
- 6× Science (5 science)
- 6× Materials (5 materials)
- 3× Money + VP (3 credits, 1 VP)
- 3× Science + VP (3 science, 1 VP)
- 3× Materials + VP (3 materials, 1 VP)
- 9× Reputation tiles (2, 3, 4 VP)
- 6× Technology grants (random tech from track)
- 3× Ship part grants
- 2× Colony ships
- 4× Ancient tech artifacts
- 2× Wormhole generators
- 5× Artifacts (scaling VP)

**Total: ~50 discovery tiles**

**Reputation Tiles:**
```typescript
interface ReputationTileSeedData {
  victoryPoints: number;
  count: number;
}
```
- 8× 2VP
- 6× 3VP
- 4× 4VP
- 2× 5VP

**Total: 20 reputation tiles**

**Ambassadors:**
```typescript
interface AmbassadorSeedData {
  name: string;
  effect: string;
  effectData?: string; // JSON
  count: number;
}
```

**Types:**
- 3× Skilled Ambassador (+2 influence track)
- 2× Trade Ambassador (better trade ratio)
- 2× Military Ambassador (+1 combat)
- 2× Science Ambassador (-2 research cost)
- 2× Economic Ambassador (+3 money/round)
- 2× Industrial Ambassador (-1 build cost)
- 2× Explorer Ambassador (draw 2 discovery tiles)
- 1× Permanent Ambassador (2VP, cannot be removed)

**Total: 16 ambassadors**

**Dice:**
```typescript
interface DiceSeedData {
  type: "yellow" | "orange" | "red";
  sides: number[];
}
```
- Yellow: [0, 0, 0, 1, 1, 2] - Average 0.67 damage
- Orange: [0, 1, 1, 2, 2, 3] - Average 1.5 damage
- Red: [1, 2, 2, 3, 3, 4] - Average 2.5 damage

### `index.ts`
Central export point with validation.

**Usage:**
```typescript
import { eclipseSeedData, validateSeedData, printSeedDataSummary } from './seedData';

// Get all seed data
const { technologies, parts, factions, discoveryTiles, reputationTiles, ambassadors, dice } = eclipseSeedData;

// Validate data integrity
const validation = validateSeedData();
if (!validation.valid) {
  console.error("Seed data errors:", validation.errors);
}

// Print summary
printSeedDataSummary();
```

## Using Seed Data in Convex

### Option 1: Pre-seeded Database

Create a Convex mutation to seed static data once:

```typescript
// convex/seed.ts
import { mutation } from "./_generated/server";
import { eclipseSeedData } from "./seedData";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Seed factions
    for (const faction of eclipseSeedData.factions) {
      await ctx.db.insert("factions", {
        name: faction.name,
        description: faction.description,
        startingMaterials: faction.startingMaterials,
        startingScience: faction.startingScience,
        startingMoney: faction.startingMoney,
        // ... rest of fields
      });
    }

    // Seed technologies
    for (const tech of eclipseSeedData.technologies) {
      // Create parts first, get their IDs
      const partIds = [];
      for (const partName of tech.unlocksParts) {
        const part = eclipseSeedData.parts.find(p => p.name === partName);
        if (part) {
          const partId = await ctx.db.insert("parts", { /* ... */ });
          partIds.push(partId);
        }
      }

      await ctx.db.insert("technologies", {
        name: tech.name,
        track: tech.track,
        tier: tech.tier,
        cost: tech.maxCost,
        effect: tech.effect,
        effectData: tech.effectData,
        unlocksParts: partIds,
        victoryPoints: tech.victoryPoints,
        position: tech.position,
      });
    }

    // Seed discovery tiles, reputation tiles, etc.
    // ...
  },
});
```

Run once: `npx convex run seed:seedDatabase`

### Option 2: On-Demand Seeding

Seed data when creating a new game:

```typescript
// convex/games.ts
import { mutation } from "./_generated/server";
import { eclipseSeedData } from "./seedData";

export const createGame = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const roomId = await ctx.db.insert("rooms", { /* ... */ });

    // Clone discovery tiles for this game
    for (const tile of eclipseSeedData.discoveryTiles) {
      for (let i = 0; i < tile.count; i++) {
        await ctx.db.insert("discoveryTiles", {
          type: tile.type,
          moneyBonus: tile.moneyBonus,
          scienceBonus: tile.scienceBonus,
          materialsBonus: tile.materialsBonus,
          victoryPoints: tile.victoryPoints,
          // ... rest of fields
        });
      }
    }

    return roomId;
  },
});
```

## Data Relationships

### Technology → Parts
Technologies unlock parts. When a player researches a technology, they gain access to the parts it unlocks.

```typescript
const plasmaCannon = technologies.find(t => t.name === "Plasma Cannon");
// plasmaCannon.unlocksParts = ["Plasma Cannon"]

const plasmaPart = parts.find(p => p.name === "Plasma Cannon");
// plasmaPart.requiresTechnologies = ["Plasma Cannon"]
```

### Faction → Technologies
Factions can start with technologies already researched.

```typescript
const hydran = factions.find(f => f.name === "Hydran Progress");
// hydran.startingTechnologies = ["Advanced Labs"]
```

### Blueprint → Parts
Ship blueprints reference parts by ID. Use the part lookup helpers:

```typescript
import { getPartByName } from './seedData/parts';

const ionCannon = getPartByName("Ion Cannon");
const nuclearSource = getPartByName("Nuclear Source");
```

## Validation

The seed data includes a validation function to ensure integrity:

```typescript
const validation = validateSeedData();
// {
//   valid: true,
//   errors: []
// }
```

**Checks:**
- Parts reference existing technologies
- Technologies reference existing parts
- Factions reference existing technologies
- No circular dependencies

## Summary Statistics

```
Technologies: 40
  - Nano: 8
  - Grid: 8
  - Military: 8
  - Rare: 16

Parts: 30
  - Cannons: 5
  - Missiles: 3
  - Shields: 4
  - Computers: 3
  - Drives: 4
  - Hulls: 7
  - Power Sources: 4

Factions: 13
  - Terran: 6
  - Alien: 7

Discovery Tiles: ~50 (various types)
Reputation Tiles: 20 (4 values)
Ambassadors: 16 (8 types)
Dice: 3 (Yellow, Orange, Red)

Total Entities: ~130
```

## Next Steps

1. **Create seeding mutations** in `convex/seed.ts`
2. **Run validation** to ensure data integrity
3. **Test seeding** in development environment
4. **Document any custom logic** for special abilities
5. **Create query helpers** for common lookups

## References

- Schema: `/workspace/group/eclipse-full-game/convex/schema.ts`
- Schema Design: `/workspace/group/eclipse-full-game/docs/SCHEMA_DESIGN.md`
- Eclipse Rules: [Eclipse: Second Dawn Rulebook](https://www.lautapelit.fi/eclipse)
- Wiki: [Eclipse Fandom Wiki](https://eclipse-boardgame.fandom.com/wiki/Eclipse:_Second_Dawn_for_the_Galaxy_Wiki)
