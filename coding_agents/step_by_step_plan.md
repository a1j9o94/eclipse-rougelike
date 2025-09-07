# Step-by-Step Plan — Refactor Phase 0 Kickoff

Date: 2025-09-06

## Goal
Establish a pure game engine + thin controller scaffold, align tests to TDD, and set up file-based collaboration for headless sub-agents. No behavior changes yet beyond scaffolding and failing tests.

## Principles
- TDD first: write failing tests before implementation.
- MP/SP parity: selectors and commands must not depend on opponent faction.
- Convex as source of truth; local storage limited to anonymous player key.
- Keep App.tsx minimal until integration phase; avoid unrelated refactors.

## Milestones
- M0: Plan + sub-agent protocol in place (this doc).
- M1: Engine/controller/selectors skeleton compiles.
- M2: Failing tests compile and run for initial commands.
- M3: Implementation phase begins (separate plan).

2025-09-07 — Phase 0B Updates
- Created engine scaffolding under `src/engine/` (state, commands, effects) and `src/adapters/outpostAdapter.ts`.
- Wrote TDD spec `src/__tests__/outpost_command_mapping.spec.ts` covering buy/sell/build mappings; implemented apply logic delegating to existing controllers. No UI behavior changed.
- Next: extend command coverage (upgrade_ship, upgrade_dock), then wire App.tsx through adapters without logic changes.

## Detailed Steps

### 1) Setup & Verification
- [ ] Confirm branch `feature/app-slim-refactor` exists; create if missing.
- [ ] Identify test runner (e.g., `pnpm test` / `npm test`) and config.
- [ ] Run current tests to baseline; capture failures in `coding_agents/progress.md`.
- [ ] Verify strict TypeScript settings; note any needed tsconfig tweaks.

### 2) Engine Scaffolding (no business logic yet)
- [ ] Create `src/game/state.ts`: define `GameState` interfaces (stubs only) referencing existing shared types where possible; include TODO imports.
- [ ] Create `src/game/commands.ts`: define typed commands: `StartRun`, `BuyItem`, `RerollShop`, `UpgradeShip`, `ExpandDock`, `ApplyServerSnapshot`, `EndSetupRound`.
- [ ] Create `src/game/effects.ts`: define `Capabilities` interface (`persist`, `emit`, `random`, `now`), plus `NoopCapabilities` and `ConvexCapabilities` stubs.
- [ ] Create `src/game/engine.ts`: export `apply(state, command): [state, Effect[]]` returning identity for now; log unhandled commands behind a dev flag.
- [ ] Create `src/controllers/controller.ts`: thin `Controller` that holds state, `Capabilities`, and delegates to `engine.apply`.
- [ ] Create `src/selectors/index.ts`: pure selectors for `shopPrice`, `capacity`, `rerollCost`, `defeatStatus`.

### 3) Tests (failing-first)
- [ ] `src/__tests__/engine_start_run.spec.ts`: `StartRun` seeds state (lives, capacity, shop).
- [ ] `src/__tests__/engine_buy_item.spec.ts`: `BuyItem` respects economy modifiers and capacity checks.
- [ ] `src/__tests__/engine_reroll.spec.ts`: MP reroll base resets each setup round.
- [ ] `src/__tests__/engine_upgrade.spec.ts`: upgrade carry-over uses blueprint fallback rules.
- [ ] `src/__tests__/engine_snapshot.spec.ts`: first MP snapshot resets capacity unless `capacityCap` modifier.

### 4) Integration Prep (do not implement yet)
- [ ] Draft interface in `src/controllers/appAdapter.ts` that maps App.tsx intents to commands.
- [ ] Inventory App.tsx touch points (buy, reroll, upgrade, expand, restart); map to commands in this adapter.

### 5) Docs & Tracking
- [ ] Link to `coding_agents/app_slim_refactor_design.md` (RFC / PR).
- [ ] Update `coding_agents/progress.md` after each milestone.
- [ ] Keep exactly one in-progress step via the CLI plan tool.

## Risks / Dependencies
- Jest/RT config drift; strict TS errors on new files.
- Hidden coupling inside App.tsx to legacy state; mitigated by adapter.

## Success Criteria
- New files type-check; tests compile and fail as expected.
- Sub-agents update their files with status, decisions, and questions.
