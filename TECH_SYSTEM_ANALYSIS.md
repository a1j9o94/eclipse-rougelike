# Technology System Analysis - Eclipse Full Game

## Current Implementation Status

### Architecture Overview

The game currently has a **complete and functional** 3-track technology research system.

### Tech Tracks (3 total)
1. **Military** - Unlocks ship frame upgrades (Cruiser at L2, Dreadnought at L3)
2. **Grid** - Power sources, drives, computers
3. **Nano** - Weapons, shields, hull upgrades

### Tier System
- Each track has 3 tiers (1→2→3)
- Parts are gated by research level
- Research costs:
  - Tier 1→2: 20¢ + 2🔬
  - Tier 2→3: 50¢ + 5🔬

### Parts Catalog (~50 parts total)

**Sources (Grid):**
- T1: Fusion Source (3⚡), Micro Fusion (2⚡)
- T2: Tachyon Source (6⚡), Discount Source (4⚡)
- T3: Quantum Source (9⚡), Zero-Point Source (12⚡)

**Drives (Grid):**
- T1: Fusion Drive (+1🚀), Ion Thruster (+1🚀, 0⚡)
- T2: Tachyon Drive (+2🚀), Warp Drive (+3🚀), Overtuned Drive (+2🚀, 1⚡)
- T3: Transition Drive (+3🚀, 2⚡)

**Weapons (Nano):**
- T1: Plasma Cannon (1🎲, 1💥), Bargain Plasma, Rebound Blaster
- T2: Antimatter Cannon (1🎲, 2💥), Plasma Array (2🎲, 1💥), Volatile Cannon, Fleetfire Array, Hexfire Projector, Entropy Beam, Recursive Array Mk I
- T3: Singularity Cannon (1🎲, 3💥), Plasma Battery (3🎲, 1💥), Plasma Cluster (4🎲, 1💥), Antimatter Array (2🎲, 2💥), Volatile Array

**Computers (Grid):**
- T1: Positron Computer (+1🎯)
- T2: Gluon Computer (+2🎯)
- T3: Neutrino Computer (+3🎯), Sentient AI (+4🎯)

**Shields (Nano):**
- T1: Gauss Shield (🛡️1)
- T2: Phase Shield (🛡️2), Magnet Shield (🛡️2 + aggro)
- T3: Omega Shield (🛡️3), Unstable Shield (🛡️3, 1⚡)

**Hull (Nano):**
- T1: Composite Hull (+1❤️)
- T2: Improved Hull (+2❤️), Magnet Hull (+2❤️ + aggro), Spite Plating, Reckless Hull (+3❤️)
- T3: Adamantine Hull (+3❤️), Monolith Plating (+4❤️)

**Rare Parts (13 total):**
Special parts with unique effects (rift dice, chaining, etc.)

## File Structure

### Core Logic
- `/workspace/group/eclipse-full-game/shared/parts.ts` - All part definitions (~214 lines)
- `/workspace/group/eclipse-full-game/shared/economy.ts` - Research costs
- `/workspace/group/eclipse-full-game/src/game/shop.ts` - Research action, shop filtering by tier
- `/workspace/group/eclipse-full-game/src/game/research.ts` - Research labels and validation

### State Management
- `/workspace/group/eclipse-full-game/src/engine/commands.ts` - `ResearchCmd` command handler
- `/workspace/group/eclipse-full-game/src/engine/state.ts` - Research state in OutpostState
- `/workspace/group/eclipse-full-game/shared/defaults.ts` - Initial research levels (all 1)

### UI Components
- `/workspace/group/eclipse-full-game/src/pages/OutpostPage.tsx` (lines 316-329) - Research buttons
- `/workspace/group/eclipse-full-game/src/components/modals.tsx` (lines 128-210) - Tech List Modal
- `/workspace/group/eclipse-full-game/src/selectors/researchUi.ts` - UI helpers

### Multiplayer Support
- Research persists per-player in GameState
- Economy modifiers apply to research costs
- Tested in `/workspace/group/eclipse-full-game/src/__tests__/mp_research_persistence.spec.tsx`

## How It Works

### Research Flow
1. Player clicks research button (e.g., "Grid 1→2")
2. `ResearchCmd` command dispatched with track name
3. Command handler in `commands.ts`:
   - Validates resources (credits + science)
   - Increments research level
   - Deducts costs
   - Rerolls shop with new tier unlocked
4. Shop now shows tier-2 parts for that track

### Shop Filtering
```typescript
// From shop.ts:19-26
const capByCat = tierCap(research); // { Military: 2, Grid: 2, Nano: 1 }
const pool = ALL_PARTS.filter((p:Part) =>
  !p.rare && p.tier === capByCat[p.tech_category]
);
```
Shop only shows parts matching current research tier for each category.

### Blueprint Customization
- Parts already have all stats (powerProd, powerCost, init, dice, dmgPerHit, etc.)
- Ships built from blueprints (Part arrays)
- Stats calculated in ship building logic
- No separate "technology tiles" needed - parts ARE the tech

## Missing Features (vs Eclipse Board Game)

The original Eclipse board game has:
- **6 technology tracks**: Military, Grid, Nano, Defense, Science, Economy
- **~18 technologies per track** = ~108 total tech tiles
- Technologies provide:
  - Ship parts (cannons, missiles, shields, drives, computers)
  - Special abilities (rerolls, discounts, etc.)
  - Victory points
- Prerequisites (some techs require others first)

Current implementation simplifies to:
- 3 tracks (Military, Grid, Nano)
- Parts are the technology (no separate tech tiles)
- No prerequisites
- No victory points from research

## Implementation Options

### Option A: Keep 3-Track System (Current)
**Pros:**
- Already complete and tested
- Simpler for roguelike gameplay
- Good variety (50 parts)

**Cons:**
- Not faithful to Eclipse board game
- Less strategic depth

### Option B: Expand to 6-Track Eclipse System
**Pros:**
- Faithful to original
- More strategic choices
- Richer tech tree

**Cons:**
- Requires significant work:
  - Add 3 new tracks (Defense, Science, Economy)
  - Create ~50+ new technologies
  - Add prerequisite system
  - Redesign UI for 6 tracks

### Option C: Hybrid (3 tracks, more depth)
**Pros:**
- Keep current architecture
- Add more techs per track (to ~100 total)
- Add prerequisites within tracks

**Cons:**
- Still not Eclipse-accurate
- May overwhelm roguelike flow

## Recommendation

**Need clarification on project goals:**

1. Is this meant to be a faithful Eclipse board game port?
   → Implement Option B (6 tracks, ~100 techs, prerequisites)

2. Is this an Eclipse-inspired roguelike?
   → Keep Option A (current 3-track system works well)

3. Want more depth but keep roguelike feel?
   → Option C (expand current tracks to ~100 parts, add prerequisites)

The current implementation is **production-ready** for a 3-track system. Expanding to 6 tracks is feasible but requires defining:
- Defense track parts (armor, shields, etc.)
- Science track parts (computers, sensors, etc.)
- Economy track parts (discounts, resource generation, etc.)
- Tech tree structure and prerequisites
