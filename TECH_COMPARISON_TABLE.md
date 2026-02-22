# Technology System Comparison

Quick reference comparing current implementation vs proposed expansions.

## Track Structure

| Aspect | Current (3 tracks) | Option 1 (3 tracks+) | Option 2 (5 tracks) | Option 3 (6 tracks) |
|--------|-------------------|---------------------|-------------------|-------------------|
| **Tracks** | Military, Grid, Nano | Military, Grid, Nano | Military, Power, Propulsion, Weapons, Defense | Military, Power, Propulsion, Weapons, Defense, Computation |
| **Total Parts** | ~50 | ~75 | ~75 | ~100 |
| **Research Actions** | 3 buttons | 3 buttons | 5 buttons | 6 buttons |
| **UI Changes** | None | Minimal | Moderate (2-row grid) | Significant (2x3 grid or tabs) |
| **Complexity** | Low | Low-Medium | Medium | Medium-High |

## Part Distribution by Track

### Current System (3 Tracks, ~50 Parts)

| Track | Categories | Parts | Tiers |
|-------|-----------|-------|-------|
| Military | Frame unlocks | 0 (abilities only) | 3 |
| Grid | Source, Drive, Computer | 16 (6+6+4) | 3 |
| Nano | Weapon, Shield, Hull | 31 (16+5+7) | 3 |
| Rare | All categories | 13 | Mixed |

### Option 1: Enhanced 3-Track System (~75 Parts)

| Track | Categories | Current | +New | Total |
|-------|-----------|---------|------|-------|
| Military | Frame unlocks | 0 | 0 | 0 |
| Grid | Source, Drive, Computer | 16 | +10 | 26 |
| Nano | Weapon, Shield, Hull | 31 | +15 | 46 |
| Rare | All categories | 13 | +10 | 23 |

**New parts:**
- Grid: More source/drive/computer variants
- Nano: More weapons, shields, hull options
- Focus on horizontal variety, not vertical complexity

### Option 2: Split 5-Track System (~75 Parts)

| Track | Categories | Parts | Notes |
|-------|-----------|-------|-------|
| Military | Frame unlocks | 0 | Cruiser @T2, Dread @T3 |
| Power | Source | 10 | Current 6 + 4 new |
| Propulsion | Drive | 10 | Current 6 + 4 new |
| Weapons | Weapon | 30 | Current 16 + 14 new |
| Defense | Shield, Hull | 22 | Current 12 + 10 new |
| Rare | All | 23 | Current 13 + 10 new |

**Benefits:**
- Better organization (power vs speed vs offense vs defense)
- Same UI complexity as current (just 2 more buttons)
- Clear strategic choices

### Option 3: Full 6-Track System (~100 Parts)

| Track | Categories | Parts | Notes |
|-------|-----------|-------|-------|
| Military | Frame unlocks | 0 | Cruiser @T2, Dread @T3 |
| Power | Source | 10 | Energy generation |
| Propulsion | Drive | 10 | Initiative & speed |
| Weapons | Weapon | 30 | Damage dealing |
| Defense | Shield, Hull | 25 | Survivability |
| Computation | Computer, Special | 20 | Targeting + abilities |
| Rare | All | 25 | Special/experimental |

**Benefits:**
- Maximum strategic depth
- Computation track adds utility/economy parts
- Most Eclipse-like

## Research Costs

### Current System
- Tier 1→2: 20¢ + 2🔬
- Tier 2→3: 50¢ + 5🔬
- Same for all tracks

### Possible Future (Track-Specific Costs)
Could differentiate:
- **Cheap tracks** (Power, Propulsion): T1→2: 15¢+2🔬, T2→3: 40¢+5🔬
- **Standard tracks** (Weapons, Defense): Current costs
- **Expensive tracks** (Computation): T1→2: 25¢+3🔬, T2→3: 60¢+6🔬
- **Military**: Higher costs (30¢+3🔬, 70¢+7🔬) since it unlocks frames

## UI Layouts

### Current (3 Tracks)
```
┌─────────────────────────────────────┐
│  Tech                               │
├─────────────────────────────────────┤
│ [Military] [Grid  ] [Nano  ]        │
│                                     │
│ [Open Tech List]                    │
└─────────────────────────────────────┘
```

### Option 2 (5 Tracks) - 2 Rows
```
┌─────────────────────────────────────┐
│  Tech                               │
├─────────────────────────────────────┤
│ [Military] [Power  ] [Propulsion]   │
│ [Weapons ] [Defense]                │
│                                     │
│ [Open Tech List]                    │
└─────────────────────────────────────┘
```

### Option 3 (6 Tracks) - 2x3 Grid
```
┌─────────────────────────────────────┐
│  Tech                               │
├─────────────────────────────────────┤
│ [Military] [Power  ] [Propulsion]   │
│ [Weapons ] [Defense] [Computation]  │
│                                     │
│ [Open Tech List]                    │
└─────────────────────────────────────┘
```

Alternative: Tabbed interface
```
┌─────────────────────────────────────┐
│  Tech  [Core] [Combat]              │
├─────────────────────────────────────┤
│ [Military] [Power] [Propulsion]     │  ← Core tab
│                                     │
│ [Open Tech List]                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Tech  [Core] [Combat]              │
├─────────────────────────────────────┤
│ [Weapons] [Defense] [Computation]   │  ← Combat tab
│                                     │
│ [Open Tech List]                    │
└─────────────────────────────────────┘
```

## Implementation Effort

| Task | Option 1 | Option 2 | Option 3 |
|------|----------|----------|----------|
| **Type definitions** | 1 hour | 3 hours | 4 hours |
| **Part creation** | 2-3 days | 4-5 days | 6-8 days |
| **Logic updates** | 1 day | 2 days | 3 days |
| **UI changes** | 1 hour | 1 day | 2 days |
| **Testing** | 1-2 days | 2-3 days | 3-4 days |
| **Balancing** | 2-3 days | 4-5 days | 6-8 days |
| **TOTAL** | **1-2 weeks** | **3-4 weeks** | **4-6 weeks** |

## File Changes Summary

| File | Option 1 | Option 2 | Option 3 |
|------|----------|----------|----------|
| `shared/parts.ts` | +300 lines | +600 lines | +900 lines |
| `shared/types.ts` | No change | Update TechTrack | Update TechTrack |
| `shared/defaults.ts` | No change | Update Research type | Update Research type |
| `src/game/shop.ts` | No change | Update tierCap() | Update tierCap() |
| `src/pages/OutpostPage.tsx` | +10 lines | +20 lines UI | +40 lines UI |
| `src/components/modals.tsx` | +50 lines | +100 lines | +150 lines |
| Test files | +200 lines | +400 lines | +600 lines |

## Strategic Depth Comparison

### Current System
**Decision points per run:** ~15-20
- 6 research decisions (3 tracks × 2 upgrades)
- 40-60 shop purchases across 10 sectors
- Ship composition decisions

**Viable strategies:**
- Weapons-heavy (Nano focus)
- Balanced (spread research)
- Economy (Grid sources for reroll spam)

### Option 2 (5 Tracks)
**Decision points per run:** ~25-30
- 10 research decisions (5 tracks × 2 upgrades)
- 50-70 shop purchases
- More focused builds (offense vs defense)

**Viable strategies:**
- Glass cannon (Weapons + Propulsion, skip Defense)
- Tank (Defense + Power, moderate Weapons)
- Initiative rush (Propulsion + Weapons)
- Balanced multi-track

### Option 3 (6 Tracks)
**Decision points per run:** ~30-35
- 12 research decisions (6 tracks × 2 upgrades)
- 60-80 shop purchases
- Computation adds utility strategies

**Viable strategies:**
- All Option 2 strategies, plus:
- Economy focus (Computation discounts + reroll)
- Fleet coordination (Computation buffs)
- Specialist builds (deep in 2-3 tracks)

## Recommendation Matrix

| Priority | Best Option | Reasoning |
|----------|------------|-----------|
| **Time-to-market** | Option 1 | Fastest, least risk |
| **Strategic depth** | Option 3 | Most decisions, most variety |
| **Balance of both** | Option 2 | ✅ **Recommended** - good depth without overwhelming complexity |
| **True Eclipse feel** | Option 3 | Closest to board game |
| **Roguelike optimization** | Option 1 or 2 | Streamlined for fast runs |
| **Multiplayer depth** | Option 3 | More counter-play options |

## Next Steps

1. **Team decision:** Choose target scope (1, 2, or 3)
2. **Part design:** Create detailed specs for new parts
3. **Implementation:** Follow phased approach from TECH_EXPANSION_PROPOSAL.md
4. **Iteration:** Test and balance incrementally

---

**Summary:** Current system is solid. Option 1 adds variety with minimal risk. Option 2 adds strategic structure. Option 3 maximizes depth. Choose based on timeline and desired complexity.
