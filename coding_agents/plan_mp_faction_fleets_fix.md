Title: Multiplayer Faction Fleets & Class Blueprints — TDD Implementation Plan

Overview
- Problem: In multiplayer, first Outpost render shows default class blueprints (and sometimes interceptor fleets), not the faction-specific starting fleets/parts (e.g., Warmongers cruisers, Raiders Antimatter, Timekeepers Disruptor). This creates a confusing player experience and mismatches between clients.
- Goal: Make server authoritative for starting class blueprints and frames, and ensure the client applies these before the first Outpost render and seeds fleets deterministically when snapshots are absent.

Player Experience Outcomes
- Warmongers: First Outpost shows Cruiser class blueprint; seeded fleet are Cruisers.
- Raiders: Interceptor class blueprint includes Antimatter; seeded fleet shows Antimatter visually.
- Timekeepers: Interceptor blueprint includes Disruptor; seeded fleet shows init-loss weapon.
- Collective: Interceptor blueprint includes Auto-Repair; seeded fleet has regen and extra hull.
- Scientists: Higher initial research and increased rare chance reflected immediately.
- Industrialists: Reroll cost 0 and better economy reflected immediately.

Current State (key findings)
- Client applies `modifiers.blueprintHints` via `applyBlueprintHints`, but sets `mode='OUTPOST'` before applying, causing initial render with defaults.
- One-time seed effect uses `INITIAL_BLUEPRINTS` and hardcoded `'interceptor'` for round 1 if snapshot missing, ignoring faction and hints.
- Server sets `modifiers.blueprintHints` for some factions and `startingFrame` for Warmongers, but does not provide authoritative `blueprintIds` per frame.

Desired End State
- Server provides authoritative `playerStates[playerId].blueprintIds: Record<FrameId, string[]>` and (if applicable) `startingFrame`.
- Client maps IDs → parts, sets blueprints, resources, research, economy, rare chance, capacity, then switches to `OUTPOST`.
- If server snapshot is missing, client seeds fleet deterministically from mapped blueprints and `startingFrame`, then submits snapshot.
- No subsequent effect overwrites blueprints to defaults; late-arriving data safely re-applies mapping without flicker.

Out of Scope
- Mid-run blueprint changes beyond setup
- Additional faction perks beyond those listed
- UI redesigns to Outpost/Combat

Implementation Phases (TDD)

Phase 1: Tests for mapping and deterministic seeding
- Add unit tests:
  - `mapBlueprintIdsToParts.spec.ts`: maps `Record<frameId,string[]>` to real parts; unknown IDs ignored; preserves other classes.
  - `seedFleetFromBlueprints.spec.ts`: given `startingFrame` and mapped `blueprints`, builds N ships using class blueprint.
- Add integration-style test (pure function level) to assert warmongers → cruiser frame, raiders/timekeepers/collective include special parts.

Phase 2: Server authoritative blueprint IDs
- In `convex/gameState.initializeGameState`:
  - Add `blueprintIds: Record<'interceptor'|'cruiser'|'dread', string[]>` per player.
  - Populate per faction:
    - warmongers.cruiser: [tachyon_source, tachyon_drive, plasma_array, positron, gauss, composite]
    - raiders.interceptor: [tachyon_source, tachyon_drive, antimatter, positron]
    - timekeepers.interceptor: [fusion_source, tachyon_drive, disruptor, positron]
    - collective.interceptor: [fusion_source, fusion_drive, plasma, auto_repair]
    - scientists/industrialists: leave empty (defaults) or as design requires.
- Keep snapshots seeding as today but ensure consistency with given blueprintIds and startingFrame.

Phase 3: Client mapping & render order
- Add `mapBlueprintIdsToParts(ids)` in `src/multiplayer/blueprintHints.ts` (or extend existing util) to return a complete `Record<FrameId, Part[]>`.
- In `src/App.tsx` setup branch:
  - BEFORE `setMode('OUTPOST')`, apply resources/research/economy/rareChance/capacity and set blueprints via `blueprintIds` or fallback to `modifiers.blueprintHints`.
  - After state is applied, then `setMode('OUTPOST')`.
- Remove or adjust the “One-time seed submit” effect to use `startingFrame` and mapped blueprints; never default to interceptor/INITIAL_BLUEPRINTS in MP.
- Add safe re-apply on late `playerStates` arrival; guard against overwrites to defaults.

Phase 4: Diagnostics and polish
- Add debug logs before Outpost render: `[MP] applied class blueprints from ids | {frame, count}`.
- Confirm no extra effects call `setBlueprints` with defaults after setup begins.

Success Criteria
- Automated
  - vitest: new tests pass for mapping and seeding.
  - typecheck: no `any`/`unknown` in new code; strict types for ids and frames.
  - eslint/prettier: clean.
  - vite build succeeds.
- Manual
  - Warmongers first render: Cruiser blueprint + cruiser fleet.
  - Raiders/Timekeepers/Collective: special parts visible on class blueprint and seeded fleet.
  - No flicker from defaults to faction parts on initial Outpost.

Code Pointers
- Server: `convex/gameState.ts` (initializeGameState)
- Client: `src/App.tsx` (setup nav effect + seed effects), `src/multiplayer/blueprintHints.ts`
- Tests: `src/__tests__/`

Notes & Constraints
- Convex server cannot import client `ALL_PARTS`; send IDs only, map on client.
- Order-of-operations must ensure blueprints are in place before Outpost mounts in MP.

