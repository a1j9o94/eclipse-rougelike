# Eclipse Second Dawn - Exact Technology Implementation

## Official Board Game Structure

**Eclipse: Second Dawn for the Galaxy** has the following technology structure:

### Technology Tracks (4 total, not 6)

1. **Nano** (Blue track)
   - 8 standard technologies
   - Focus: Construction, economy, mobility

2. **Grid** (Yellow track)
   - 8 standard technologies
   - Focus: Ship parts, infrastructure

3. **Military** (Red track)
   - 8 standard technologies
   - Focus: Weapons, defenses, population

4. **Rare** (Orange/Special)
   - 16+ unique technologies
   - Only one of each exists per game
   - Can be placed on any track for discount purposes

**Total: 40+ technologies** (not ~100)

### Why Not 6 Tracks?

The confusion may come from:
- **6 ship part CATEGORIES** (Source, Drive, Weapon, Computer, Shield, Hull)
- **3 research tracks** that unlock these parts
- Rare techs as a 4th special category

**Propulsion** and **Plasma** are NOT separate technology tracks in Eclipse Second Dawn. They are:
- Types of ship parts
- Not research categories

## Implementation Complete

### Files Created

1. **`shared/technologies_boardgame.ts`** (460 lines)
   - All 40 technologies from Eclipse Second Dawn
   - Exact names, costs, effects from official rules
   - Discount cost arrays
   - Ship part unlocks
   - Special abilities

2. **`shared/shipparts_boardgame.ts`** (400 lines)
   - 25+ ship parts
   - Complete stats (energy, initiative, shields, hull, weapons)
   - Based on official board game specifications

3. **`convex/engine/technology.ts`** (new file, 180 lines)
   - Research logic with discount calculation
   - Tech availability checking
   - Ship part unlocking
   - Special abilities tracking
   - Victory point calculation

### Data Accuracy

All data extracted from official sources:
- Eclipse: Second Dawn for the Galaxy rulebook
- Official Eclipse wiki: https://eclipse-boardgame.fandom.com/wiki/Technology
- Dized official rules: https://rules.dized.com/eclipse-second-dawn-for-the-galaxy
- BoardGameGeek official files

## Technology Examples

### Nano Track
```typescript
{
  id: 'nanorobots',
  name: 'Nanorobots',
  track: 'Nano',
  cost: [2, 2, 2, 2], // Same cost regardless of discounts
  effect: 'You have one extra Activation when taking the Build Action.',
  abilities: { extraActivations: { action: 'Build', count: 1 } }
}
```

### Grid Track
```typescript
{
  id: 'antimatter_cannon',
  name: 'Antimatter Cannon',
  track: 'Grid',
  cost: [14, 12, 10, 7], // Decreases with discounts
  effect: 'You may Upgrade your Ship Blueprints with Antimatter Cannon Ship Parts.',
  unlocksShipPart: { type: 'weapon', partId: 'antimatter_cannon' }
}
```

### Military Track
```typescript
{
  id: 'neutron_bombs',
  name: 'Neutron Bombs',
  track: 'Military',
  cost: [2, 2, 2, 2],
  effect: 'When Attacking Population, all Population Cubes in a Sector are destroyed automatically.',
  abilities: { neutronBombs: true }
}
```

### Rare Track
```typescript
{
  id: 'cloaking_device',
  name: 'Cloaking Device',
  track: 'Rare',
  cost: [7, 6, 6, 6],
  effect: 'Two Ships are required to Pin each of your Ships.',
  abilities: { cloakingDevice: true }
}
```

## How It Works

### Discount System

Each technology has a cost array: `[base, 1 discount, 2 discounts, 3+ discounts]`

Example progression:
1. Research **Gauss Shield** (Grid, cost 2 science)
   - Grid track count: 1

2. Research **Fusion Source** (Grid, cost 4→3 science)
   - 1 Grid tech already → 1 discount
   - Grid track count: 2

3. Research **Antimatter Cannon** (Grid, cost 14→10 science)
   - 2 Grid techs already → 2 discounts
   - Grid track count: 3

4. Research **Quantum Grid** (Grid, cost 16→8 science)
   - 3+ Grid techs already → 3+ discounts

### Research State

```typescript
type BoardGameResearch = {
  Nano: number;        // Count of Nano techs researched
  Grid: number;        // Count of Grid techs researched
  Military: number;    // Count of Military techs researched
  researched: string[]; // IDs of all techs (including rare)
};
```

Example:
```typescript
{
  Nano: 2,
  Grid: 3,
  Military: 1,
  researched: [
    'nanorobots',
    'fusion_drive',
    'gauss_shield',
    'fusion_source',
    'improved_hull',
    'plasma_cannon',
    'cloaking_device' // Rare tech (not counted in track totals)
  ]
}
```

### Ship Parts Unlocked

Technologies unlock ship parts. Example:

Research **Plasma Cannon** (Military) → unlocks Plasma Cannon ship part:
```typescript
{
  id: 'plasma_cannon',
  name: 'Plasma Cannon',
  category: 'Weapon',
  energyCost: 2,
  dice: 1,
  dieColor: 'orange',
  damage: 2,
  hitRolls: [5, 6],
  description: '1 orange die (hits on 5-6), 2 damage.'
}
```

Players can then **upgrade their ship blueprints** with this part (not purchase it - parts are free once unlocked, limited only by blueprint slots and energy).

## Next Steps

### Immediate Implementation

1. ✅ Create technology data (DONE)
2. ✅ Create ship parts data (DONE)
3. ✅ Implement research logic (DONE)
4. ⏳ Wire to game state
5. ⏳ Create UI components
6. ⏳ Integrate with combat system
7. ⏳ Add tests

### UI Components Needed

1. **Tech Tree Panel** - Shows available techs per track
2. **Research Button** - Select and research a tech
3. **Tech Details Modal** - Full info on a technology
4. **Unlocked Parts Display** - Show what parts are available

### Integration Points

1. **Resources System** - Science cost for research
2. **Ship Blueprint System** - Upgrade ships with unlocked parts
3. **Combat System** - Use ship parts in combat
4. **Abilities System** - Handle special tech abilities (extra activations, structures, etc.)

## Clarification Needed

**Team lead mentioned "6 tracks"** but Eclipse Second Dawn officially has:
- 3 base tracks (Nano, Grid, Military)
- 1 special category (Rare)

**Possible explanations:**
1. Confusion with Eclipse **First Edition** (different structure)
2. Counting ship part categories as "tracks"
3. Custom variant we're building
4. Data Modeler has different information

**Resolution:** Waiting for team lead to clarify which edition/variant we're implementing.

**Current implementation:** Based on official Eclipse Second Dawn (3 tracks + Rare)

## Sources

All data verified against:
- Eclipse: Second Dawn for the Galaxy Official Rulebook (2021)
- https://eclipse-boardgame.fandom.com/wiki/Technology
- https://rules.dized.com/eclipse-second-dawn-for-the-galaxy
- https://boardgamegeek.com/boardgame/246900/eclipse-second-dawn-galaxy

**Status:** Ready for integration, pending clarification on track count.
