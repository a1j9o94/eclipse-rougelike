# App Slim Refactor — Design and Work Plan

Date: 2025-09-06
Branch: feature/app-slim-refactor
Owners: coding_agents

## Goals
- Reduce `src/App.tsx` to ~50 LOC by moving gameplay state + logic into `src/game/`.
- Unify single-player and multiplayer behavior behind the same game-facing API.
- Establish clear module boundaries so multiple agents can implement in parallel without conflicts.
- Preserve behavior (no regressions) by relying on the existing test suite and adding focused new tests where needed.

## Non‑Goals
- Visual redesign of Outpost/Combat UI.
- Server/Convex schema changes beyond API surface adapters.

## Current Pain Points
- `App.tsx` owns orchestration, state, effects, multiplayer sync, logging, and view switching.
- Hard to parallelize changes (any tweak touches `App.tsx`).
- Logic duplication between SP/MP (economy, reroll, upgrades).

## Target Architecture

### High‑Level Layout
- `src/game/`
  - `state.ts`: Canonical GameState (SP) + accessors/selectors. Pure TypeScript types and helpers.
  - `commands.ts`: Command definitions (Build, Upgrade, ExpandDock, Reroll, Research, StartCombat, EndRound, etc.).
  - `engine.ts`: Pure reducers — `apply(state, command) -> { state', effects[] }`.
  - `effects.ts`: Side-effect interpreter (sounds, analytics, toasts). Pluggable.
  - `controllers/`
    - `single.ts`: Single-player controller: wraps engine with local storage, start/new-run, persistence.
    - `multiplayer.ts`: MP controller: wraps engine with Convex sync, snapshot mapping, round transitions.
  - `adapters/`
    - `convex.ts`: Thin adapter to read/write the server GameState, ready flags, snapshots.
    - `blueprints.ts`: Existing mapping utilities (ids ↔ parts) consolidated.
  - `selectors.ts`: Derived/calculated view data (tonnage, costs, labels, guards).
  - `economy.ts`, `hangar.ts`, `research.ts`, `shop.ts`: Keep/merge existing pure functions; expose via engine.
  - `logging.ts`: Centralized debug logging toggled by env.

- `src/ui/`
  - `GameShell.tsx`: The tiny replacement for `App.tsx`. Wires a controller (SP/MP) + renders pages.
  - Existing pages/components consume selectors/actions provided by controller context.

### State Model
- Core `GameState` (SP) contains: resources, research, capacity, reroll, blueprints, fleet, enemyFleet, sector, mode, logs, queue, etc.
- Controller-specific state (e.g., MP: playerStates, roundNum, readiness) lives outside core and is bridged via adapters.

### Controller API (stable surface)
```ts
export type GameController = {
  // read
  getState(): Readonly<GameState>
  select<T>(sel: (s: GameState) => T): T
  // write (pure commands)
  dispatch(cmd: Command): void
  // lifecycle
  startNewRun(opts: { difficulty: DifficultyId; faction: FactionId }): void
  startCombat(): void
  endCombatAck?(): Promise<void> // MP only
  // mp helpers (no-ops in SP)
  getPlayerId?(): string | null
  setReady?(ready: boolean): Promise<void>
}
```

Controllers implement this API. UI depends on this interface only.

### Commands (initial set)
- `BuildInterceptor`, `UpgradeShip {idx}`, `ExpandDock`, `Reroll`, `Research {track}`
- `StartCombat`, `ResolveCombat`, `NextRound`
- `ApplyServerSnapshot`, `SubmitClientSnapshot` (MP only; engine treats them as state transforms; controller performs network side effects)

### Selectors
- `selectTonnage`, `selectCapacity`, `selectEconomyMods`, `selectFleetValid`, `selectOutpostLabels`, `selectRerollCost`

## Migration Plan (Incremental)

Phase 0 — Baseline + Contracts (parallelizable)
- Add types/interfaces (`state.ts`, `commands.ts`, `selectors.ts`).
- Wrap existing hangar/shop/research/economy functions into the engine function signatures (no behavior change).
- Add prelim controller skeletons (`controllers/single.ts`, `controllers/multiplayer.ts`) returning the old data by delegating to current modules.

Phase 1 — App shell reduction
- Introduce `ui/GameShell.tsx` that uses controller provider/context and renders Outpost/Combat.
- Replace `src/App.tsx` content with `GameShell` usage and minimal routing.
- Keep compatibility props for Outpost/Combat initially by having selectors mirror the old prop shapes.

Phase 2 — MP adapter isolation
- Move Convex calls into `adapters/convex.ts` and `controllers/multiplayer.ts`.
- Convert snapshot mapping / blueprint ids application to selectors/utilities.

Phase 3 — Purify effects
- Move sounds/logging/reroll label building into `effects.ts`/`selectors.ts`.
- UI triggers `dispatch` only; controller handles `effects`.

Phase 4 — Cleanup + Deletion
- Remove dead code paths from `App.tsx` and modules superseded by engine.
- Ensure `App.tsx` ≈ 50 lines.

## Test Strategy
- Keep existing tests running at each phase.
- Add controller/engine unit tests:
  - Commands produce expected deltas (build/upgrade/dock/reroll cost changes, blueprint propagation, capacity checks).
  - MP snapshot → engine state mapping parity tests (using existing snapshot fixtures).
- Snapshot tests for key selectors (labels/guards) to prevent regressions.

## Parallel Work Streams
1) Contracts + Engine Skeleton
   - Files: `state.ts`, `commands.ts`, `engine.ts`, `selectors.ts`
2) SP Controller + GameShell
   - Files: `controllers/single.ts`, `ui/GameShell.tsx`, shim in `App.tsx`
3) MP Controller + Convex Adapter
   - Files: `controllers/multiplayer.ts`, `adapters/convex.ts`
4) Selectorization of Outpost/Combat props
   - Replace ad‑hoc computations with selectors step by step
5) Tests & Fixtures
   - New engine/controller tests; migrate existing where helpful

## Risk & Mitigation
- Risk: Large diff causing regressions → Phase-by-phase with green tests.
- Risk: MP races during refactor → keep adapter behavior stable, feature‑flag transitions behind controller wiring.
- Risk: Type churn → define stable types in `state.ts` first; controllers adapt.

## Success Criteria
- `src/App.tsx` ≤ ~50 LOC.
- No user‑visible regressions; MP/SP parity retained.
- New modules with clear boundaries enable independent work without merge conflicts.

## Next Steps
- Land this design doc on a branch via PR for review.
- On approval, begin Phase 0 (Contracts + Engine Skeleton) and wire tests.

