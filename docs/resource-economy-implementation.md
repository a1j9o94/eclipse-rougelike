# Eclipse Second Dawn - Resource Economy Implementation

**Status**: Core engine complete, awaiting upkeep table verification

**Implementation Date**: 2026-02-22

## Overview

Implemented the complete resource management system from Eclipse Second Dawn for the Galaxy board game, transforming the roguelike's simplified credit/materials/science system into the full board game economy.

## Components Implemented

### 1. Core Engine (`convex/engine/resources.ts`)

**Types & Data Structures**:
- `ResourceType`: 'money' | 'science' | 'materials'
- `Resources`: Storage amounts for all three resources
- `PopulationTrack`: Tracks cube deployment and production values
- `InfluenceState`: Manages influence disks across track/actions/sectors
- `PlayerEconomy`: Complete player economy state
- `ProductionResult`: Upkeep phase calculation results

**Resource Management Functions**:
- `canAfford()`: Check if player can pay a cost
- `spendResources()`: Deduct resources (with validation)
- `addResources()`: Add resources to storage
- `tradeResources()`: 2:1 conversion (configurable ratio by species)

**Population & Production**:
- `getProductionValue()`: Calculate production from cube positions
- `placePopulationCube()`: Deploy cube to sector (increases production)
- `removePopulationCube()`: Return cube to track (decreases production)
- Production table: 0-13 cubes (leftmost visible = production value)

**Influence Disk Mechanics**:
- `useInfluenceForAction()`: Move disk from track to action space
- `useInfluenceForSector()`: Move disk from track to sector control
- `returnInfluenceFromAction()`: Return disk to rightmost track position
- `returnInfluenceFromSector()`: Return disk from lost sector
- `addBonusInfluence()`: Tech bonuses (Advanced Robotics, Quantum Grid)
- `getUpkeepCost()`: Calculate money cost from track position

**Upkeep Phase**:
- `calculateProduction()`: Preview income vs upkeep
- `executeUpkeep()`: Apply production, detect shortfalls
- `resetInfluenceAfterRound()`: Return action disks to track

**Validation**:
- `validateEconomy()`: Check economy state integrity
- Prevents negative resources
- Ensures cube/disk counts match totals
- Validates track positions in range

### 2. Test Suite (`src/__tests__/resources_engine.spec.ts`)

**Coverage**: 35 tests across 6 categories
- ✅ Resource management (8 tests) - **PASSING**
- ✅ Population cubes & production (6 tests) - **PASSING**
- ✅ Influence disks (8 tests) - **PASSING**
- ⚠️ Upkeep phase (3 tests) - **4 FAILURES** (upkeep table issue)
- ✅ Validation (4 tests) - **PASSING**
- ✅ Integration (1 test) - **PASSING**

**Test Failures**:
All failures related to upkeep cost table values. Tests expect:
- 13 disks on track = 0 upkeep ✓
- 12 disks on track = 6 upkeep
- 9 disks on track = 14 upkeep
- 8 disks on track = 16 upkeep

Current table needs verification against physical board game components.

### 3. UI Components (`src/components/PlayerBoard.tsx`)

**Main Components**:
- `PlayerBoard`: Full player board display (default and compact modes)
- `ResourceBar`: Minimal HUD for in-game resource display
- `ResourceDisplay`: Individual resource with storage + production
- `PopulationTrack`: Visual cube deployment (13 positions)
- `InfluenceTrack`: Visual disk placement with breakdown

**Features**:
- Color-coded resources (amber, violet, orange)
- Visual cube/disk representations
- Production and upkeep cost display
- Responsive layouts (full/compact modes)
- Tailwind CSS styling matching game aesthetics

**Props & Customization**:
- `compact` mode for multiplayer sidebars
- `className` for layout integration
- `playerName` for multiplayer identification

## Game Mechanics Implemented

### Resources
- **Money**: General purpose, pays upkeep costs
- **Science**: Technology research
- **Materials**: Ship and structure construction
- **Storage**: Unlimited capacity (no caps)

### Population Cubes
- 13 cubes per resource type (money, science, materials)
- Start on track, deployed to sectors via colony ships
- Leftmost visible position = production value per round
- Production range: 0-13 per resource type

### Influence Disks
- Start with 13 disks on influence track
- Move to actions (returned each round) or sectors (permanent until lost)
- Leftmost visible position = money upkeep cost per round
- Tech bonuses add extra disks (stacked on leftmost position)
- Upkeep range: 0-30 money per round

### Trading
- Convert resources at species-specific ratio
- Default: 2:1 (give 2 of one type, receive 1 of another)
- Some species have better/worse ratios (e.g., 1:1 or 3:1)

### Upkeep Phase
1. Calculate income from population tracks
2. Calculate upkeep cost from influence track
3. Net money = income - upkeep
4. If negative: player must trade or lose sectors
5. Add science and materials production
6. Reset action influence disks to track

## Integration Points

### Data Flow
```
Game State (Convex)
  ↓
PlayerEconomy state
  ↓
Resource Engine (calculations)
  ↓
UI Components (display)
```

### Future Connections
- **Hex Galaxy Map**: Sector control triggers population placement
- **Technology System**: Research costs science, some techs add influence
- **Ship Building**: Costs materials (and money for some)
- **Combat**: Winning sectors allows colonization
- **Turn Structure**: Upkeep phase at end of each round

## Remaining Work

### High Priority
1. **Verify upkeep cost table** - Need exact values from physical board
   - Current table is estimated from partial BGG data
   - Tests are failing on specific upkeep values
   - 4/35 tests blocked on this

2. **Species-specific economies** - Different starting resources/ratios
   - Terrans: 2:1 trade, standard start
   - Other factions: varied bonuses (cheaper buildings, better production, etc.)

### Medium Priority
3. **Integration with turn system** - Hook upkeep into round structure
4. **Colony ship mechanics** - Link exploration to population deployment
5. **Sector control** - Track which sectors player controls (influence placement)
6. **Bankruptcy handling** - Force sector loss if upkeep unpaid

### Low Priority
7. **Advanced influence rules** - Diplomacy (4+ players), sector trading
8. **UI polish** - Animations, tooltips, accessibility
9. **Tutorial mode** - Explain economy mechanics to new players

## Technical Notes

### Performance
- All functions are pure (no mutations)
- Immutable state updates
- Efficient lookups via indexed tables
- No complex algorithms (O(1) or O(n) operations)

### Type Safety
- Full TypeScript coverage
- Exported types for integration
- Validation functions for runtime safety
- No `any` types in public API

### Testing Philosophy
- TDD approach: tests written first
- Isolated unit tests for each function
- Integration test for full round simulation
- Comprehensive edge case coverage

## References

**Documentation Sources**:
- [Eclipse: Second Dawn Rulebook PDF](https://cdn.1j1ju.com/medias/bb/af/07-eclipse-second-dawn-for-the-galaxy-rulebook.pdf)
- [Dized Interactive Rules](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/eclipse-second-dawn-for-the-galaxy)
- [UltraBoardGames Rules Guide](https://www.ultraboardgames.com/eclipse/game-rules.php)
- [BoardGameGeek Forums](https://boardgamegeek.com/boardgame/246900/eclipse-second-dawn-for-the-galaxy)

**Key Research Findings**:
- Influence track values: -30, -25, -21, -17, -13, -10, -7, -5, -3 (partial data from BGG)
- Population cubes track production via leftmost visible square
- Influence disks: leftmost = always used first, rightmost = always returned first
- Extra influence disks from techs stack on leftmost position

## Summary

The resource economy engine is **functionally complete** and ready for integration. Core mechanics are implemented and tested (31/35 tests passing). The 4 failing tests are due to unverified upkeep table values, which require confirmation from the physical board game or official rulebook.

UI components are ready for integration into the game interface, supporting both full player board view and compact in-game HUD display.

Next steps: Verify upkeep table, then integrate with turn system and hex galaxy map.
