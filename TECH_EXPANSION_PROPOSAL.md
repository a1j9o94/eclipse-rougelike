# Technology System Expansion Proposal

## Executive Summary

**Current State:** 3 tracks (Military, Grid, Nano), ~50 parts, fully functional
**Proposed State:** 6 tracks, ~100 parts, with prerequisites and strategic depth

This document outlines how to expand the technology system while maintaining the roguelike gameplay flow.

## Proposed 6-Track System

### Track 1: Military (Frames & Structure)
**Focus:** Ship frames, capacity, tonnage management
**Current Implementation:** Research unlocks frame upgrades
- T1: Base frames (already unlocked)
- T2: Cruiser upgrades unlocked
- T3: Dreadnought upgrades unlocked

**No additional parts needed** - Military is about unlocking capabilities, not parts.

### Track 2: Power (formerly Grid - Power)
**Focus:** Energy generation and management
**Parts:** Sources (8-10 parts)
- T1: Fusion Source (3⚡), Micro Fusion (2⚡), Unstable Reactor (4⚡, risk)
- T2: Tachyon Source (6⚡), Discount Source (4⚡), Efficient Core (5⚡)
- T3: Quantum Source (9⚡), Zero-Point Source (12⚡), Singularity Core (15⚡)

### Track 3: Propulsion (formerly Grid - Drives)
**Focus:** Initiative and positioning
**Parts:** Drives (8-10 parts)
- T1: Fusion Drive (+1🚀), Ion Thruster (+1🚀, 0⚡), Burst Engine (+2🚀, experimental)
- T2: Tachyon Drive (+2🚀), Warp Drive (+3🚀), Overtuned Drive (+2🚀, 1⚡)
- T3: Transition Drive (+3🚀, 2⚡), Quantum Drive (+4🚀, 3⚡), Instant Drive (+5🚀, 4⚡)

### Track 4: Weapons (formerly Nano - Weapons)
**Focus:** Offensive capabilities
**Parts:** Weapons (20-25 parts)
- T1: Plasma weapons, basic cannons, experimental weapons
- T2: Antimatter weapons, arrays, utility beams, conditional weapons
- T3: Singularity weapons, massive arrays, advanced beams

**Current Nano weapons move here** + add 10-15 new ones:
- Missile weapons (guaranteed hits, lower damage)
- Beam weapons (utility effects)
- Turret weapons (multi-target)
- Conditional weapons (damage based on fleet state)

### Track 5: Defense (new track)
**Focus:** Survivability and protection
**Parts:** Shields + Hull (15-20 parts)

**Shields (8-10 parts):**
- T1: Gauss Shield (🛡️1), Reflective Shield (🛡️1, retaliate)
- T2: Phase Shield (🛡️2), Magnet Shield (🛡️2 + aggro), Adaptive Shield (🛡️ varies)
- T3: Omega Shield (🛡️3), Unstable Shield (🛡️3, 1⚡), Fortress Shield (🛡️4, heavy)

**Hull (8-10 parts):**
- T1: Composite Hull (+1❤️), Reactive Armor (+1❤️, effect)
- T2: Improved Hull (+2❤️), Magnet Hull (+2❤️ + aggro), Spite Plating, Reckless Hull (+3❤️)
- T3: Adamantine Hull (+3❤️), Monolith Plating (+4❤️), Regenerative Hull (+2❤️, regen)

**Current Nano shields/hull move here** + add new defensive options.

### Track 6: Computation (formerly Grid - Computers + new)
**Focus:** Targeting, efficiency, special abilities
**Parts:** Computers + Special (15-20 parts)

**Computers (6-8 parts):**
- T1: Positron Computer (+1🎯), Targeting AI (+1🎯, effect)
- T2: Gluon Computer (+2🎯), Quantum CPU (+2🎯, 1⚡)
- T3: Neutrino Computer (+3🎯), Sentient AI (+4🎯), Tactical Core (+3🎯, abilities)

**Special Systems (8-10 new parts):**
- Economy boosters (discount parts, reroll cost reduction)
- Fleet coordination (buffs to allies)
- Sensor systems (intel bonuses)
- Repair systems (hull restoration)

## Part Distribution

| Track | Current Parts | New Parts | Total |
|-------|--------------|-----------|-------|
| Military | 0 (frame unlocks) | 0 | 0 |
| Power | 6 sources | 3-4 | 9-10 |
| Propulsion | 6 drives | 3-4 | 9-10 |
| Weapons | 16 weapons | 9-14 | 25-30 |
| Defense | 8 shields + 7 hull | 5-10 | 20-25 |
| Computation | 4 computers | 11-16 | 15-20 |
| Rare | 13 | 7-12 | 20-25 |
| **TOTAL** | **~50** | **~50** | **~100** |

## Prerequisites System

### Simple Prerequisites (Recommended for Roguelike)
- No cross-track dependencies
- Within-track only: Must research T1 before T2, T2 before T3
- **Already implemented** in current system

### Advanced Prerequisites (Optional)
If we want Eclipse-style tech tree complexity:
- Cross-track requirements (e.g., "Advanced Shields requires Defense T2 + Computation T1")
- Branching paths (choose between two T2 options)
- Unlock bonuses (researching both Power T3 + Propulsion T3 unlocks special parts)

**Recommendation:** Keep it simple for roguelike gameplay. Advanced prerequisites work better for multiplayer strategy, less so for single-player runs.

## UI Changes Required

### Research Panel (OutpostPage.tsx line 316)
**Current:** 3 buttons in a row
```tsx
<div className="grid grid-cols-3 gap-2">
```

**Proposed:** 6 buttons in 2 rows or 3 columns
```tsx
<div className="grid grid-cols-3 gap-2">
  {/* Row 1: Core Systems */}
  <button>Military</button>
  <button>Power</button>
  <button>Propulsion</button>

  {/* Row 2: Combat Systems */}
  <button>Weapons</button>
  <button>Defense</button>
  <button>Computation</button>
</div>
```

Alternative: Tabbed interface if space is tight.

### Tech List Modal (modals.tsx line 128)
**Current:** Lists all parts by track
**Proposed:** Same structure, just more tracks and parts
- Keep Military special (frame unlock display)
- Show 6 tracks instead of 3
- May need pagination or virtual scrolling for ~100 parts

### Shop Display
**No changes needed** - shop filtering logic already handles any number of tracks via `tierCap()` function.

## Implementation Plan

### Phase 1: Type System & Data (1-2 days)
1. Update `TechTrack` type to include 6 tracks
2. Split current parts into new track assignments
3. Create 50 new part definitions
4. Update `tierCap()` to handle 6 tracks

**Files to modify:**
- `shared/parts.ts` - Add new parts
- `shared/types.ts` - Update TechTrack type
- `shared/defaults.ts` - Update initial research (6 fields)
- `src/game/shop.ts` - Update tierCap function

### Phase 2: State & Logic (1 day)
1. Update Research type: `{ Military:number; Power:number; Propulsion:number; Weapons:number; Defense:number; Computation:number }`
2. Update all functions that use Research type
3. Add research costs for all 6 tracks
4. Update shop filtering logic

**Files to modify:**
- `shared/defaults.ts` - Research type
- `shared/economy.ts` - Costs (may need track-specific costs)
- `src/game/shop.ts` - Filtering logic
- `src/engine/commands.ts` - Command types

### Phase 3: UI Updates (1 day)
1. Update research button grid (3→6)
2. Update tech list modal
3. Update research labels
4. Update tests

**Files to modify:**
- `src/pages/OutpostPage.tsx` - Button grid
- `src/components/modals.tsx` - Tech list
- `src/selectors/researchUi.ts` - Labels
- Tests throughout

### Phase 4: Testing & Balance (1-2 days)
1. Unit tests for new parts
2. Integration tests for research flow
3. Balance testing (costs, power levels)
4. Multiplayer compatibility testing

## Alternative: Incremental Approach

Rather than expanding to 6 tracks immediately, consider:

### Phase A: Split Grid → Power + Propulsion (easier)
- 4 tracks total: Military, Power, Propulsion, Nano
- Move sources to Power, drives to Propulsion
- Add 5-10 new parts per track
- ~60 parts total

### Phase B: Split Nano → Weapons + Defense (medium)
- 5 tracks total: Military, Power, Propulsion, Weapons, Defense
- Move weapons to Weapons track, shields/hull to Defense
- Add 10-15 new parts
- ~75 parts total

### Phase C: Add Computation (final)
- 6 tracks total
- Add Computation track with computers + special systems
- Add final 20-25 parts
- ~100 parts total

This allows testing and balancing at each stage.

## Risks & Mitigations

### Risk 1: Complexity Overload
**Problem:** 6 tracks may overwhelm players in a roguelike
**Mitigation:**
- Clear track grouping (Core vs Combat systems)
- Tooltip explanations
- Tutorial updates

### Risk 2: Balance Challenges
**Problem:** 100 parts is hard to balance
**Mitigation:**
- Copy proven parts from current set
- Incremental approach (test at 60, 75, then 100)
- Community feedback

### Risk 3: UI Clutter
**Problem:** 6 research buttons + 100 parts in modal
**Mitigation:**
- Tabbed or accordion UI
- Virtual scrolling for tech list
- Filter/search in tech modal

## Recommendation

**For Eclipse-inspired roguelike:**
- **Option 1 (Conservative):** Keep 3 tracks, add 20-30 more parts (to ~70-80 total)
  - Least risk, maintains current UX
  - Still adds strategic depth
  - 1-2 weeks work

- **Option 2 (Moderate):** Incremental expansion to 5 tracks, ~75 parts
  - Split Grid and Nano into 4 tracks
  - Add Computation as 5th
  - Better organization
  - 3-4 weeks work

- **Option 3 (Ambitious):** Full 6-track, ~100 parts system
  - Maximum strategic depth
  - True Eclipse homage
  - Requires careful balancing
  - 4-6 weeks work

**My recommendation:** Option 2 (5 tracks, ~75 parts) hits the sweet spot of depth without overwhelming roguelike flow.

## Next Steps

1. **Get alignment** on target scope (3/5/6 tracks)
2. **Design new parts** (write specs for each)
3. **Create implementation tasks** (break into testable chunks)
4. **Execute incrementally** (one track at a time)
5. **Test & balance** at each stage

Questions or feedback? This is a living document - update as we learn.
