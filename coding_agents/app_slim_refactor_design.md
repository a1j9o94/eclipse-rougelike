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
  - `effects.ts`: Side-effect interpreter (sounds, analytics, toasts). Pluggable; engine emits only declarative `Effect` objects.
  - `controllers/`
    - `controller.ts`: Unified controller that wires the engine to capabilities (transport, persistence, rng, effects). Configure for SP (local/no-op transport + Convex persistence) or MP (Convex transport + persistence).
  - `adapters/`
    - `convex.ts`: Thin adapter to read/write the server GameState, ready flags, snapshots.
    - `blueprints.ts`: Existing mapping utilities (ids ↔ parts) consolidated.
  - `selectors.ts`: Derived/calculated view data (tonnage, costs, labels, guards).
  - `economy.ts`, `hangar.ts`, `research.ts`, `shop.ts`: Keep/merge existing pure functions; expose via engine.
  - `logging.ts`: Centralized debug logging toggled by env.

- `src/ui/`
  - `GameShell.tsx`: The tiny replacement for `App.tsx`. Wires a controller (SP/MP) + renders pages.
  - Existing pages/components consume selectors/actions provided by controller context.

### Persistence & Identity (updated)
- Local storage becomes thin: store only an anonymous `playerId` (e.g., `eclipse-player-id`) and ephemeral UI bits. No full run state locally.
- Convex acts as the source of truth for both SP and MP:
  - Tables: `spRuns` (latest SP run per player), `progress` (unlocks, wins); reuse existing MP tables for rooms/gameState.
  - Controller persistence capability always targets Convex (with an in-memory fallback for offline dev/tests).
  - Migration: on first load, if legacy local saves exist, upload to Convex once, then clear local.

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

### Capability Interfaces (initial draft)
```ts
// Transport for server comms (Convex). SP uses Noop; MP uses Convex implementation.
export interface Transport {
  submitSnapshot?(payload: unknown): Promise<void>;
  setReady?(ready: boolean): Promise<void>;
  fetchServerState?(): Promise<unknown>; // for initial hydrate
  onServerEvent?(cb: (evt: { type: string; data: unknown }) => void): void;
}

// Remote persistence (Convex) for SP runs + progress
export interface Persistence {
  loadRun(playerId: string): Promise<null | { state: unknown; version?: string }>;
  saveRun(playerId: string, state: unknown): Promise<void>;
  updateProgress?(playerId: string, patch: unknown): Promise<void>;
}

export interface Sound { play(name: string): Promise<void> | void }
export interface Logger { debug(...a: unknown[]): void; warn(...a: unknown[]): void }
export interface RNG { next(): number; seed?(s: string | number): void }
```

### Commands (initial set)
- `BuildInterceptor`, `UpgradeShip {idx}`, `ExpandDock`, `Reroll`, `Research {track}`
- `StartCombat`, `ResolveCombat`, `NextRound`
- `ApplyServerSnapshot`, `SubmitClientSnapshot` (MP only; engine treats them as state transforms; controller performs network side effects)

Command shape example
```ts
type Command =
  | { type: 'InitializeMatch'; config: { faction: FactionId; difficulty: DifficultyId; startingShips: number } }
  | { type: 'Reroll' }
  | { type: 'BuildInterceptor' }
  | { type: 'UpgradeShip'; idx: number }
  | { type: 'ExpandDock' }
  | { type: 'Research'; track: 'Military'|'Grid'|'Nano' }
  | { type: 'StartCombat' }
  | { type: 'ResolveCombat' }
  | { type: 'NextRound' }
  | { type: 'ApplyServerSnapshot'; snapshot: ServerSnapshot }
  | { type: 'SubmitClientSnapshot' }
```

Engine contract
```ts
function apply(state: GameState, cmd: Command, ctx: { parts: Catalog; rng: RNG }):
  { state: GameState; effects: Effect[] }
```

Effect examples
```ts
type Effect =
  | { type: 'PlaySound'; sound: 'equip'|'dock'|'research'|'startCombat' }
  | { type: 'PersistRun' }
  | { type: 'SubmitSnapshot' }
  | { type: 'SetReady'; value: boolean }
  | { type: 'Analytics'; event: string; props?: Record<string, unknown> }
```

### Selectors
- `selectTonnage`, `selectCapacity`, `selectEconomyMods`, `selectFleetValid`, `selectOutpostLabels`, `selectRerollCost`

## Migration Plan (Incremental)

Phase 0 — Baseline + Contracts (parallelizable)
- Add types/interfaces (`state.ts`, `commands.ts`, `selectors.ts`).
- Wrap existing hangar/shop/research/economy functions into the engine function signatures (no behavior change).
- Add prelim controller skeleton (`controllers/controller.ts`) returning the old data by delegating to current modules.
- Add capability shims: NoopTransport, ConvexTransport (thin), ConvexPersistence, MemoryPersistence (tests).

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

Specific existing tests to reference/update
- src/__tests__/hangar.spec.ts: validate upgrade seeding/blueprint behavior → port into engine unit tests; keep file green by re-exporting behavior via selectors.
- src/__tests__/mp_upgrade.spec.ts, mp_economy_hangar_isolation.spec.ts: ensure WithMods and costs remain correct via engine + selectors.
- src/__tests__/outpost_warmongers_view.spec.tsx: warmongers capacity baseline + cruiser blueprint mapping → selectors must output same labels/capacity.
- src/__tests__/mp_blueprint_first_render.spec.tsx, mp_fallback_then_snapshot.spec.tsx: server blueprintIds mapping and snapshot adoption (frames differ) → command ApplyServerSnapshot must preserve semantics.
- src/__tests__/ready_validity_guards.spec.tsx: start button guards based on localValid/serverValid/snapshots → implement selectGuards.
- src/__tests__/mp_reroll_spillover.spec.tsx: reroll base per round and faction isolation → engine NextRound + InitializeMatch effects.
- src/__tests__/outpost_economy_labels.spec.tsx, outpost_economy_labels_isolated.spec.tsx: discounted labels for industrialists → selectors produce identical strings.
- src/__tests__/startpage.spec.tsx: now read progress from Convex; for tests, stub Persistence (MemoryPersistence) with expected unlocks.
- New: engine/effects/controller tests
  - tests/engine.capacity.spec.ts: capacity baseline rules (warmongers vs others on round 1)
  - tests/engine.reroll.spec.ts: reroll base sets/corrections per setup round
  - tests/controller.transport.spec.ts: SubmitClientSnapshot + SetReady effects call Transport

## Parallel Work Streams
1) Contracts + Engine Skeleton
   - Files: `state.ts`, `commands.ts`, `engine.ts`, `selectors.ts`
2) SP Controller + GameShell
   - Files: `controllers/controller.ts`, `ui/GameShell.tsx`, shim in `App.tsx`
3) MP Controller + Convex Adapter
   - Files: `adapters/convex.ts` (Transport), `adapters/persistence.ts` (Convex spRuns/progress)
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

## Appendix: File-by-file initial scaffolding (Phase 0)
- src/game/state.ts: export GameState, types, minimal helpers.
- src/game/commands.ts: union + constructors for commands (tiny helpers for tests).
- src/game/engine.ts: implement InitializeMatch + Reroll + ApplyServerSnapshot minimal; pass-through for others (TODOs + tests first).
- src/game/selectors.ts: implement selectTonnage, selectCapacity, selectEconomyMods, selectRerollCost, selectGuards to match current strings.
- src/game/effects.ts: type definitions only; interpreter stub receiving capabilities.
- src/game/controllers/controller.ts: store + dispatch loop; wires engine and interpreter; accepts capabilities.
- src/game/adapters/convex.ts: define Transport + Persistence interfaces; leave methods throwing “not implemented” with TODO markers.
