# Eclipse Second Dawn - Work Stream Breakdown

## Overview

This document breaks down the full game implementation into **6 parallel development streams** that can be worked on concurrently with minimal dependencies.

Each stream is owned by a specialized agent/developer and includes:
- Clear objectives
- Specific tasks
- Dependencies
- Acceptance criteria
- Estimated complexity

---

## Stream 1: Galaxy & Sectors 🗺️

**Owner:** Map Engineer / Galaxy Agent

**Objective:** Implement the hex-grid galaxy map system, sector tiles, and spatial navigation.

**Priority:** HIGH (foundational system)

### Tasks

#### 1.1 Hex Grid Coordinate System
- **Description:** Implement axial/cube coordinate system for hex grid
- **Deliverables:**
  - `shared/hexGrid.ts` - Coordinate math utilities
  - Functions: `axialToPixel()`, `pixelToAxial()`, `getNeighbors()`, `distance()`, `pathfinding()`
- **Tests:**
  - Neighbor calculation
  - Distance measurement
  - Coordinate conversions
- **Complexity:** Medium

#### 1.2 Sector Data Model
- **Description:** Define sector types, planet configurations, warp portals
- **Deliverables:**
  - `shared/sectors.ts` - Sector type definitions
  - Sector generation logic (random planets, warp portals)
- **Tests:**
  - Sector generation
  - Planet type distribution
  - Warp portal placement
- **Complexity:** Low

#### 1.3 Galaxy Initialization
- **Description:** Create starting galaxy (Galactic Center + player home sectors)
- **Deliverables:**
  - `convex/mutations/initializeGalaxy.ts`
  - Create 6-7 starting sectors per player count
  - Place Galactic Center at (0,0)
- **Tests:**
  - Galaxy setup for 2-6 players
  - Sector placement rules
- **Complexity:** Medium

#### 1.4 Sector Discovery Deck
- **Description:** Implement deck of sector tiles to be drawn during exploration
- **Deliverables:**
  - `convex/queries/sectorDeck.ts`
  - Shuffle and draw mechanics
  - Sector tile distribution by type
- **Tests:**
  - Deck shuffling (seeded random)
  - Draw mechanics
  - Tile distribution
- **Complexity:** Low

#### 1.5 GalaxyMap Component
- **Description:** Build SVG-based hex grid renderer
- **Deliverables:**
  - `src/components/galaxy/GalaxyMap.tsx`
  - `src/components/galaxy/HexTile.tsx`
  - Pan/zoom controls
  - Hex highlighting on hover
- **Tests:**
  - Component rendering
  - Click/hover interactions
  - Pan/zoom behavior
- **Complexity:** High

#### 1.6 SectorDetail Component
- **Description:** Popup showing sector info (planets, ships, control)
- **Deliverables:**
  - `src/components/galaxy/SectorDetail.tsx`
  - Display planets, resources, occupying ships
  - Control status (influenced by whom)
- **Tests:**
  - Component rendering
  - Data display accuracy
- **Complexity:** Medium

#### 1.7 Sector Placement UI
- **Description:** UI for placing newly explored sectors
- **Deliverables:**
  - `src/components/galaxy/SectorPlacement.tsx`
  - Highlight valid adjacent hexes
  - Rotate sector before placement
  - Confirm placement action
- **Tests:**
  - Adjacency validation
  - Rotation mechanics
  - Placement confirmation
- **Complexity:** Medium

### Dependencies
- **None** (foundational system, can start immediately)

### Acceptance Criteria
- [ ] Hex grid renders 100+ sectors smoothly (60fps)
- [ ] Click any hex to view sector details
- [ ] Pan and zoom work on touch devices
- [ ] Sector placement validates adjacency rules
- [ ] Galaxy initializes correctly for 2-6 players

### Estimated Timeline
**2-3 weeks** (1 developer)

---

## Stream 2: Technology System 🔬

**Owner:** Tech Tree Engineer / Research Agent

**Objective:** Implement the technology research system, tech pool, and part unlocking.

**Priority:** HIGH (core game mechanic)

### Tasks

#### 2.1 Technology Data Definition
- **Description:** Define all 50+ technologies with costs, effects, unlocked parts
- **Deliverables:**
  - `shared/technologies.ts` - Complete tech catalog
  - Each tech: name, track, tier, cost (science/money), VP, unlocked parts, description
- **Tests:**
  - Data integrity (all techs have required fields)
  - Part references valid
- **Complexity:** Medium (data entry)

#### 2.2 Tech Pool Refresh Logic
- **Description:** Each round, new techs become available based on player count
- **Deliverables:**
  - `convex/technologies.ts` - `refreshTechPool()` mutation
  - Shuffle tech deck at game start
  - Draw N techs per round (deterministic)
- **Tests:**
  - Shuffle seeding (same seed = same order)
  - Tech count per player count
  - No duplicate techs in pool
- **Complexity:** Medium

#### 2.3 Research Action Implementation
- **Description:** Player purchases tech from available pool
- **Deliverables:**
  - `convex/actions/research.ts` - `researchTechnology()` mutation
  - Validate tech available
  - Deduct science + money
  - Grant tech to player
  - Unlock parts
  - Remove from pool
- **Tests:**
  - Resource validation
  - Part unlocking
  - Pool removal
- **Complexity:** Medium

#### 2.4 TechTree UI Component
- **Description:** Display available and researched technologies
- **Deliverables:**
  - `src/components/tech/TechTree.tsx`
  - Grid layout by track (Military/Grid/Nano/Rare)
  - Filter by tier, available, researched
  - Click to view details
- **Tests:**
  - Component rendering
  - Filtering logic
  - Click interactions
- **Complexity:** High

#### 2.5 TechTile Component
- **Description:** Individual tech card with icon, name, cost, effects
- **Deliverables:**
  - `src/components/tech/TechTile.tsx`
  - Display tech info
  - Show unlock status
  - Show cost and VP
  - Highlight if affordable
- **Tests:**
  - Component rendering
  - Conditional styling
- **Complexity:** Low

#### 2.6 Research Action UI
- **Description:** Modal/panel for purchasing techs
- **Deliverables:**
  - `src/components/actions/ResearchAction.tsx`
  - Select tech from available pool
  - Show cost and current resources
  - Confirm purchase button
  - Show unlocked parts preview
- **Tests:**
  - Component rendering
  - Purchase flow
  - Resource validation feedback
- **Complexity:** Medium

#### 2.7 Part Unlocking System
- **Description:** Grant ship parts to player when tech researched
- **Deliverables:**
  - `convex/mutations/unlockParts.ts`
  - Add parts to player's available pool
  - Enable parts in blueprint editor
- **Tests:**
  - Part unlocking
  - Availability in editor
- **Complexity:** Low

### Dependencies
- **Stream 3 (Resources):** Needs resource tracking for purchase validation

### Acceptance Criteria
- [ ] All 50+ techs defined with accurate data
- [ ] Tech pool refreshes correctly each round
- [ ] Research action deducts correct resources
- [ ] TechTree UI displays 50+ techs clearly
- [ ] Unlocked parts appear in blueprint editor
- [ ] Cannot research unavailable/unaffordable techs

### Estimated Timeline
**2-3 weeks** (1 developer)

---

## Stream 3: Resources & Economy 💰

**Owner:** Economy Engineer / Resource Agent

**Objective:** Implement resource tracking, income calculation, upkeep system, and population management.

**Priority:** HIGH (required by most other systems)

### Tasks

#### 3.1 Resource Data Model
- **Description:** Define player resource state (materials, science, money)
- **Deliverables:**
  - Extend `convex/schema.ts` - `playerResources` table
  - Initial resource grants (faction-specific)
- **Tests:**
  - Schema validation
  - Initial grants
- **Complexity:** Low

#### 3.2 Influence Disk Tracking
- **Description:** Track available vs placed influence disks
- **Deliverables:**
  - `convex/mutations/influenceDisks.ts`
  - `placeInfluenceDisk()`, `returnInfluenceDisk()`
  - Validate disk availability
- **Tests:**
  - Disk placement/return
  - Availability limits
- **Complexity:** Low

#### 3.3 Population Cube Management
- **Description:** Track population cubes (total, available, placed on planets)
- **Deliverables:**
  - `convex/mutations/populationCubes.ts`
  - `placePopulation()`, `removePopulation()`
  - Track graveyard (lost cubes)
- **Tests:**
  - Cube placement/removal
  - Graveyard tracking
- **Complexity:** Medium

#### 3.4 Income Calculation
- **Description:** Calculate per-turn income from population on planets
- **Deliverables:**
  - `convex/queries/calculateIncome.ts`
  - Sum materials from material planets
  - Sum science from science planets
  - Sum money from money planets + trade bonus
- **Tests:**
  - Income calculation
  - Trade bonus application
  - Advanced planet multipliers
- **Complexity:** Medium

#### 3.5 Upkeep System
- **Description:** Deduct upkeep cost each round (1 money per influence disk)
- **Deliverables:**
  - `convex/mutations/upkeep.ts` - `payUpkeep()` mutation
  - Calculate cost
  - Deduct money
  - Handle bankruptcy (lose sectors)
- **Tests:**
  - Upkeep calculation
  - Bankruptcy handling
  - Sector loss
- **Complexity:** Medium

#### 3.6 Resource Display UI
- **Description:** Panel showing current resources and income
- **Deliverables:**
  - `src/components/player/ResourcePanel.tsx`
  - Display materials/science/money
  - Show income rates
  - Show influence disks (available/total)
  - Show population cubes (available/total)
- **Tests:**
  - Component rendering
  - Real-time updates
- **Complexity:** Medium

#### 3.7 Upkeep Phase UI
- **Description:** Display upkeep payment and income collection
- **Deliverables:**
  - `src/components/phases/UpkeepPhase.tsx`
  - Show upkeep cost breakdown
  - Show income breakdown
  - Animate resource changes
- **Tests:**
  - Component rendering
  - Animation timing
- **Complexity:** Low

### Dependencies
- **None** (foundational system, can start immediately)

### Acceptance Criteria
- [ ] Resources tracked per player (materials/science/money)
- [ ] Influence disks limited to faction max (13-16)
- [ ] Population cubes limited to 13 per player
- [ ] Income calculated correctly from planets
- [ ] Upkeep deducted each round
- [ ] Bankruptcy handled (lose sectors if can't pay)
- [ ] UI displays resources and updates in real-time

### Estimated Timeline
**1-2 weeks** (1 developer)

---

## Stream 4: Actions & Turn Flow 🎮

**Owner:** Action System Engineer / Turn Agent

**Objective:** Implement all 6 action types, turn order, passing, and action validation.

**Priority:** CRITICAL (integrates all other systems)

### Tasks

#### 4.1 Action Framework
- **Description:** Generic action validation and execution pipeline
- **Deliverables:**
  - `convex/actions/framework.ts`
  - `validateAction()` - Check turn order, resources, influence disks
  - `executeAction()` - Dispatch to specific action handler
  - `recordAction()` - Log action history
- **Tests:**
  - Turn order validation
  - Resource validation
  - Influence disk validation
- **Complexity:** High

#### 4.2 Explore Action
- **Description:** Draw sector tile, place on board, populate
- **Deliverables:**
  - `convex/actions/explore.ts` - `exploreAction()` mutation
  - Draw random sector from deck
  - Validate placement (adjacency, rotation)
  - Place influence disk
  - Place population cubes (optional)
  - Draw discovery tile
  - Deduct influence disk
- **Tests:**
  - Sector drawing
  - Placement validation
  - Discovery tile award
- **Complexity:** High

#### 4.3 Influence Action
- **Description:** Place influence disk in existing sector
- **Deliverables:**
  - `convex/actions/influence.ts` - `influenceAction()` mutation
  - Validate sector exists and is adjacent
  - Place influence disk
  - Place population cubes (optional)
  - Deduct influence disk
- **Tests:**
  - Adjacency validation
  - Disk placement
  - Population placement
- **Complexity:** Medium

#### 4.4 Upgrade Action
- **Description:** Modify ship blueprint (add/remove parts)
- **Deliverables:**
  - `convex/actions/upgrade.ts` - `upgradeAction()` mutation
  - Validate part unlocked (tech researched)
  - Validate slot limits
  - Validate power balance
  - Add or remove part
  - Deduct materials (for new parts)
  - Deduct influence disk
- **Tests:**
  - Part validation
  - Slot limits
  - Power balance
  - Material costs
- **Complexity:** High

#### 4.5 Build Action
- **Description:** Construct ship from blueprint
- **Deliverables:**
  - `convex/actions/build.ts` - `buildAction()` mutation
  - Validate sector control
  - Snapshot current blueprint
  - Create ship instance
  - Deduct materials
  - Deduct influence disk
- **Tests:**
  - Sector control validation
  - Blueprint snapshot
  - Ship creation
  - Material costs
- **Complexity:** Medium

#### 4.6 Move Action
- **Description:** Move ships between adjacent sectors
- **Deliverables:**
  - `convex/actions/move.ts` - `moveAction()` mutation
  - Validate ships exist in source sector
  - Validate target sector adjacent
  - Move ships
  - Check for combat trigger
  - Deduct influence disk
- **Tests:**
  - Ship selection
  - Adjacency validation
  - Combat trigger detection
- **Complexity:** Medium

#### 4.7 Turn Order Management
- **Description:** Track current player, handle passing, advance turns
- **Deliverables:**
  - `convex/turnOrder.ts`
  - `passTurn()` mutation
  - `advanceTurn()` - Move to next player
  - Detect when all players passed (end action phase)
- **Tests:**
  - Turn advancement
  - Pass detection
  - Phase transition
- **Complexity:** Medium

#### 4.8 Action UI Components
- **Description:** UI for each action type
- **Deliverables:**
  - `src/components/actions/ActionPanel.tsx` - Main action selector
  - `src/components/actions/ExploreAction.tsx`
  - `src/components/actions/InfluenceAction.tsx`
  - `src/components/actions/UpgradeAction.tsx`
  - `src/components/actions/BuildAction.tsx`
  - `src/components/actions/MoveAction.tsx`
- **Tests:**
  - Component rendering
  - Form validation
  - Action submission
- **Complexity:** High

### Dependencies
- **Stream 1 (Galaxy):** Needed for explore/influence/move actions
- **Stream 2 (Tech):** Needed for upgrade action (part unlocking)
- **Stream 3 (Resources):** Needed for all actions (resource costs)

### Acceptance Criteria
- [ ] All 6 action types functional
- [ ] Turn order enforced (clockwise)
- [ ] Passing works correctly
- [ ] Action costs validated server-side
- [ ] UI provides clear feedback on invalid actions
- [ ] Action history recorded for replay

### Estimated Timeline
**3-4 weeks** (1-2 developers)

---

## Stream 5: Combat Integration ⚔️

**Owner:** Combat Engineer / Battle Agent

**Objective:** Adapt existing combat engine for board game, implement reputation tiles, multi-player battles.

**Priority:** MEDIUM (builds on existing engine)

### Tasks

#### 5.1 Combat Trigger Detection
- **Description:** Detect when multiple players occupy same sector
- **Deliverables:**
  - `convex/combat/detection.ts`
  - Check for battles after move actions
  - Queue battles by sector number (descending)
- **Tests:**
  - Battle detection
  - Queue ordering
- **Complexity:** Low

#### 5.2 Fleet Snapshot Creation
- **Description:** Convert ships in sector to combat fleet format
- **Deliverables:**
  - `convex/combat/snapshot.ts` - `buildFleetSnapshot()`
  - Gather ships from sector
  - Convert to `ShipSnap` format (existing)
  - Include blueprint data
- **Tests:**
  - Snapshot creation
  - Data completeness
- **Complexity:** Low

#### 5.3 Multi-Player Combat Resolution
- **Description:** Extend combat engine to handle 3+ players
- **Deliverables:**
  - `convex/combat/multiplayer.ts`
  - Option 1: Resolve pairs sequentially
  - Option 2: Free-for-all initiative queue
- **Tests:**
  - 3-player combat
  - 4-player combat
  - Combat fairness
- **Complexity:** High

#### 5.4 Reputation Tile System
- **Description:** Award reputation tiles based on combat participation
- **Deliverables:**
  - `convex/combat/reputation.ts`
  - Calculate tier based on total ships in battle
  - Award tiles to combatants
  - Track available tile supply
- **Tests:**
  - Tier calculation
  - Tile distribution
  - Supply limits
- **Complexity:** Medium

#### 5.5 Sector Control Changes
- **Description:** Update sector control after combat
- **Deliverables:**
  - `convex/combat/control.ts`
  - Loser loses control (remove influence disk)
  - Loser loses population cubes on planets
  - Winner maintains/gains control
- **Tests:**
  - Control transfer
  - Population loss
  - Influence disk return
- **Complexity:** Medium

#### 5.6 Combat Phase Orchestration
- **Description:** Run all battles in correct order
- **Deliverables:**
  - `convex/phases/combat.ts` - `resolveCombatPhase()` mutation
  - Process battles by sector number (descending)
  - Update ship states
  - Award reputation
  - Update control
- **Tests:**
  - Phase execution
  - Battle ordering
  - State updates
- **Complexity:** Medium

#### 5.7 Combat Viewer UI
- **Description:** Display combat log and results
- **Deliverables:**
  - `src/components/combat/CombatViewer.tsx`
  - Show battle participants
  - Show combat log (reuse existing)
  - Show reputation awarded
  - Show control changes
- **Tests:**
  - Component rendering
  - Log display
- **Complexity:** Medium

### Dependencies
- **Existing Combat Engine:** Already functional
- **Stream 1 (Galaxy):** Needed for sector references
- **Stream 4 (Actions):** Move action triggers combat

### Acceptance Criteria
- [ ] Combat triggers when 2+ players in same sector
- [ ] Combat resolves using existing engine
- [ ] Reputation tiles awarded correctly
- [ ] Sector control updates after battles
- [ ] Multi-player combat (3+ players) works
- [ ] Combat log displays all events clearly

### Estimated Timeline
**2 weeks** (1 developer)

---

## Stream 6: Victory Points & End Game 🏆

**Owner:** Scoring Engineer / VP Agent

**Objective:** Implement VP calculation, game end detection, final scoring, winner declaration.

**Priority:** LOW (final integration)

### Tasks

#### 6.1 VP Calculation Logic
- **Description:** Calculate total VP from all sources
- **Deliverables:**
  - `convex/scoring/victoryPoints.ts` - `calculateVP()` query
  - Sum sectors controlled (1 VP each)
  - Sum tech VP (printed on tiles)
  - Sum discovery tile VP
  - Sum reputation tile VP
  - Sum monument/structure VP
- **Tests:**
  - VP calculation accuracy
  - Edge cases (ties)
- **Complexity:** Medium

#### 6.2 VP Tracking UI
- **Description:** Real-time VP display during game
- **Deliverables:**
  - `src/components/victory/VPTracker.tsx`
  - Show VP by source (sectors, techs, etc.)
  - Show current standings (leaderboard)
  - Highlight VP changes
- **Tests:**
  - Component rendering
  - Real-time updates
- **Complexity:** Medium

#### 6.3 Game End Detection
- **Description:** Detect when final round completes
- **Deliverables:**
  - `convex/phases/endGame.ts`
  - Check if round 8 or 9 complete
  - Trigger final scoring
  - Declare winner
- **Tests:**
  - End detection
  - Winner declaration
- **Complexity:** Low

#### 6.4 Final Scoring Screen
- **Description:** Display complete VP breakdown and winner
- **Deliverables:**
  - `src/components/victory/FinalScoring.tsx`
  - Show VP breakdown per player
  - Highlight winner
  - Show game stats (rounds, actions, battles)
  - Replay button
- **Tests:**
  - Component rendering
  - Data accuracy
- **Complexity:** Medium

#### 6.5 Game History/Replay
- **Description:** Save completed games for replay
- **Deliverables:**
  - `convex/history/gameArchive.ts`
  - Archive final game state
  - Store action log
  - Store combat logs
  - Enable replay viewer
- **Tests:**
  - Archive creation
  - Replay playback
- **Complexity:** High (optional)

#### 6.6 Tiebreaker Rules
- **Description:** Resolve ties (most techs → most money)
- **Deliverables:**
  - `convex/scoring/tiebreaker.ts`
  - Compare tech count
  - Compare money reserve
  - Declare winner or shared victory
- **Tests:**
  - Tiebreaker scenarios
- **Complexity:** Low

### Dependencies
- **All other streams:** VP depends on complete game state

### Acceptance Criteria
- [ ] VP calculated correctly from all sources
- [ ] Game ends after round 8 or 9
- [ ] Winner declared correctly
- [ ] Tiebreakers resolved per rules
- [ ] Final scoring screen displays complete breakdown
- [ ] Optional: Game replay functional

### Estimated Timeline
**1-2 weeks** (1 developer)

---

## Parallelization Strategy

### Week 1-2: Foundation (3 parallel streams)
- **Stream 1:** Galaxy & Sectors (Map Engineer)
- **Stream 2:** Technology System (Tech Engineer)
- **Stream 3:** Resources & Economy (Economy Engineer)

### Week 3-4: Integration (2 parallel streams)
- **Stream 4:** Actions & Turn Flow (Action Engineer) - depends on 1, 2, 3
- **Stream 5:** Combat Integration (Combat Engineer) - depends on 1

### Week 5-6: Completion (1 stream)
- **Stream 6:** Victory Points & End Game (Scoring Engineer) - depends on all

### Week 7-8: Testing & Polish
- Integration testing
- Playtesting
- Bug fixes
- Performance optimization

---

## Critical Path

**Longest dependency chain:**
1. Resources (Stream 3) → 1-2 weeks
2. Actions (Stream 4) → 3-4 weeks (depends on 1, 2, 3)
3. Victory Points (Stream 6) → 1-2 weeks (depends on 4, 5)

**Total critical path: 5-8 weeks**

With parallelization: **5-8 weeks** (vs 12-16 weeks sequential)

---

## Communication & Coordination

### Daily Sync (Async)
- Each agent posts progress update
- Blockers identified
- Interface changes communicated

### Weekly Integration
- Merge streams into main branch
- Run full test suite
- Demo integrated features
- Adjust priorities

### Handoff Points
- **Stream 3 → Stream 4:** Resource API finalized
- **Stream 2 → Stream 4:** Tech unlocking API finalized
- **Stream 1 → Stream 4:** Galaxy API finalized
- **All → Stream 6:** VP source APIs finalized

---

## Risk Mitigation

**Risk 1: Stream 4 blocked by dependencies**
- Mitigation: Streams 1, 2, 3 prioritize API stabilization
- Fallback: Stream 4 mocks dependencies until ready

**Risk 2: Combat (Stream 5) needs engine changes**
- Mitigation: Analyze engine early, flag needed changes
- Fallback: Limit to 1v1 combat initially

**Risk 3: Scope creep**
- Mitigation: Lock features per stream at start
- Defer enhancements to post-MVP

**Risk 4: Integration failures**
- Mitigation: Weekly integration checkpoints
- Fallback: Revert problematic streams, stabilize

---

## Success Metrics per Stream

**Stream 1:**
- [ ] 100+ hexes render smoothly
- [ ] Click any hex to view details
- [ ] Sector placement validates adjacency

**Stream 2:**
- [ ] All 50+ techs defined
- [ ] Tech pool refreshes each round
- [ ] Research action works end-to-end

**Stream 3:**
- [ ] Resources tracked accurately
- [ ] Income/upkeep calculated correctly
- [ ] UI displays real-time updates

**Stream 4:**
- [ ] All 6 actions functional
- [ ] Turn order enforced
- [ ] Action validation server-side

**Stream 5:**
- [ ] Combat triggers correctly
- [ ] Reputation tiles awarded
- [ ] Multi-player battles resolve

**Stream 6:**
- [ ] VP calculated from all sources
- [ ] Game ends correctly
- [ ] Winner declared accurately

---

**End of Work Streams Document**

*Version 1.0 - February 22, 2026*
