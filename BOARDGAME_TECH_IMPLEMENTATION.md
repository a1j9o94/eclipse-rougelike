# Eclipse Second Dawn - Technology System Implementation

## Summary

Complete Eclipse Second Dawn board game technology system data files created, ready for integration.

## Files Created

### 1. `/workspace/group/eclipse-full-game/shared/technologies_boardgame.ts` (460 lines)

**Contains:**
- 40 technology definitions from Eclipse Second Dawn
- Complete type system for board game techs
- Helper functions for cost calculation

**Technology Structure:**
```typescript
{
  id: 'plasma_cannon',
  name: 'Plasma Cannon',
  track: 'Military',
  cost: [6, 5, 4, 4], // Decreases with discounts
  effect: 'You may Upgrade your Ship Blueprints with Plasma Cannon Ship Parts.',
  unlocksShipPart: { type: 'weapon', partId: 'plasma_cannon' },
  abilities: {...} // Special abilities
}
```

**Tracks:**
- **Nano** (8 techs): Construction, economy, mobility
  - Nanorobots, Fusion Drive, Orbital, Advanced Robotics, Advanced Labs, Monolith, Wormhole Generator, Artifact Key

- **Grid** (8 techs): Ship parts, infrastructure
  - Gauss Shield, Fusion Source, Improved Hull, Positron Computer, Advanced Economy, Tachyon Drive, Antimatter Cannon, Quantum Grid

- **Military** (8 techs): Weapons, defenses, population
  - Neutron Bombs, Starbase, Plasma Cannon, Phase Shield, Advanced Mining, Tachyon Source, Gluon Computer, Plasma Missile

- **Rare** (16 techs): Unique technologies (one of each per game)
  - Antimatter Splitter, Neutron Absorber, Conifold Field, Absorption Shield, Cloaking Device, Improved Logistics, Sentient Hull, Rift Cannon, Soliton Cannon, Transition Drive, Warp Portal, Flux Missile, Pico Modulator, Ancient Labs, Zero-Point Source, Metasynthesis

### 2. `/workspace/group/eclipse-full-game/shared/shipparts_boardgame.ts` (400 lines)

**Contains:**
- 25+ ship part definitions
- 6 categories: Source, Drive, Weapon, Computer, Shield, Hull
- Complete stats for combat/movement
- Converter to roguelike format

**Ship Part Structure:**
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

**Categories:**
- **Sources** (4): Nuclear (3⚡), Fusion (3⚡), Tachyon (4⚡), Zero-Point (5⚡)
- **Drives** (4): Ion (+1 init, 0⚡), Fusion (+2 init, 1⚡), Tachyon (+3 init, 2⚡), Transition (+3 init, 1⚡)
- **Weapons** (7): Ion Cannon, Plasma Cannon, Plasma Missile, Antimatter Cannon, Flux Missile, Soliton Cannon, Rift Cannon
- **Shields** (4): Gauss (1 shield, 1⚡), Phase (2 shield, 2⚡), Absorption (1 shield, +2⚡), Conifold (3 shield, 1⚡)
- **Hull** (2): Improved (+1 hull), Sentient (+1 hull, +1 computer)
- **Computers** (3): Electron (+1 init, +1 aim), Positron (+1 init, +1 aim, 1⚡), Gluon (+1 init, +2 aim, 2⚡)

## Key Board Game Mechanics

### Discount System

Unlike the current roguelike (fixed tier costs), Eclipse board game uses a **discount system**:

- Each tech has a cost array: `[base, 1 discount, 2 discounts, 3+ discounts]`
- Example: Plasma Cannon costs `[6, 5, 4, 4]` science
  - 6 science if you have 0 Military techs
  - 5 science if you have 1 Military tech
  - 4 science if you have 2+ Military techs

**Implementation:**
```typescript
function getTechCost(tech: Technology, techsInTrack: number): number {
  const discountLevel = Math.min(techsInTrack, tech.cost.length - 1);
  return tech.cost[discountLevel];
}
```

### Research State

Board game tracks:
- **Count per track** (Nano: 3, Grid: 2, Military: 1)
- **IDs of researched techs** (including Rare)

```typescript
type BoardGameResearch = {
  Nano: number;
  Grid: number;
  Military: number;
  researched: string[]; // All tech IDs including rare
};
```

Rare techs can be placed on any track for discount purposes.

### Ship Part Unlocking

- Technologies UNLOCK ship parts, they don't grant them directly
- Players then UPGRADE their ship blueprints with unlocked parts
- Parts have energy costs that must balance with energy production

**Current roguelike:** Parts are purchased from shop with credits
**Board game:** Parts are free once unlocked, but limited by blueprint slots

## Differences from Current Roguelike

| Aspect | Current Roguelike | Board Game |
|--------|------------------|------------|
| **Tracks** | 3 (Military, Grid, Nano) | 3 + Rare |
| **Research Cost** | Fixed tiers (20¢+2🔬, 50¢+5🔬) | Variable with discounts |
| **Parts** | Purchased from shop | Unlocked by tech, free to use |
| **Shop** | Filters by tier | No shop - all unlocked parts available |
| **Resources** | Credits, Materials, Science | Science for research only |
| **Progression** | Tier 1→2→3 | Discount-based (research more = cheaper) |

## Integration Challenges

### 1. Resource System Mismatch

**Roguelike:**
- Credits (purchase parts/ships)
- Materials (build ships)
- Science (research)

**Board game:**
- Science (research only)
- Money (actions, ship building)
- Materials (ship building, structures)
- Influence Disks (action economy)

**Solution:** Need to coordinate with Resources agent. Tech system should:
- Cost science only (no credits)
- Track researched techs differently
- Not generate shop rerolls (board game doesn't have shop)

### 2. Ship Customization

**Roguelike:**
- Build ship from blueprint
- Buy parts and install
- Parts have slots

**Board game:**
- Choose ship blueprint (Interceptor/Cruiser/Dreadnought)
- Upgrade blueprint by adding unlocked parts
- Limited by blueprint squares (slots)
- Energy must balance

**Solution:** Need new "upgrade blueprint" action separate from roguelike shop.

### 3. Special Abilities

Many techs grant abilities beyond ship parts:

- **Extra Activations:** Build/Move/Upgrade actions get bonus uses
- **Structures:** Starbases, Orbitals, Monoliths
- **Population:** Advanced population placement
- **Combat:** Neutron Bombs, Antimatter Splitter, Cloaking Device
- **Discovery:** Draw discovery tiles

**Solution:** These require board game systems (hex map, sectors, population, discovery tiles).

## Recommended Integration Approach

### Phase 1: Isolated Tech System (Current Work)
✅ Create data files (DONE)
- Implement research action with discounts
- Create simple UI showing available techs
- Track researched techs in state

### Phase 2: Ship Part Integration
- Map board game parts to existing combat system
- Create blueprint upgrade system
- Energy balance validation

### Phase 3: Resource Coordination
- Integrate with Resources agent's 4-resource system
- Science-only research costs
- Remove credit costs from tech

### Phase 4: Special Abilities
- Requires hex map from Frontend-hex agent
- Structures, population, influence disks
- Discovery tiles, sectors

### Phase 5: Full Board Game
- Turn structure (6 phases)
- Action economy with influence disks
- Galaxy exploration
- Victory conditions

## Next Steps

**Immediate (Tech Tree agent):**
1. Implement research logic with discount calculation
2. Create UI component for tech selection
3. Wire to existing game state
4. Write tests

**Coordination needed:**
1. **Resources agent:** Agree on resource structure
2. **Frontend-hex agent:** When abilities need hex map
3. **Team lead:** Decide on integration timeline

**Files ready for use:**
- `technologies_boardgame.ts` - All tech data
- `shipparts_boardgame.ts` - All part data
- Both have TypeScript types and helper functions

## Example Usage

```typescript
import { ALL_TECHNOLOGIES, getTechCost, type BoardGameResearch } from './technologies_boardgame';
import { getShipPartById } from './shipparts_boardgame';

// Research state
const research: BoardGameResearch = {
  Nano: 0,
  Grid: 1, // Researched Gauss Shield
  Military: 0,
  researched: ['gauss_shield']
};

// Find available tech
const plasmaCannon = ALL_TECHNOLOGIES.find(t => t.id === 'plasma_cannon');
const cost = getTechCost(plasmaCannon, research.Military); // 6 science (no discounts yet)

// After researching
research.Military = 1;
research.researched.push('plasma_cannon');

// Now future Military techs are cheaper
const phaseShield = ALL_TECHNOLOGIES.find(t => t.id === 'phase_shield');
const newCost = getTechCost(phaseShield, research.Military); // 6 instead of 8

// Get unlocked ship part
const plasmaPart = getShipPartById('plasma_cannon');
// { energyCost: 2, dice: 1, damage: 2, ... }
```

## Testing Strategy

1. **Unit tests:** Cost calculation with discounts
2. **Integration tests:** Research action updates state correctly
3. **UI tests:** Tech tree renders and filters properly
4. **System tests:** End-to-end research and ship upgrade flow

## Summary

**Status:** Foundation complete, ready for integration
**Data quality:** High (based on official board game)
**Next dependency:** Resources agent for 4-resource system
**Timeline:** 1-2 weeks for full tech + ship integration

The technology system is well-structured and ready to integrate once we have clarity on the board game transformation timeline and resource system coordination.
