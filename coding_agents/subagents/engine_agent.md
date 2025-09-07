# engine_agent

## Charter
Scaffold pure engine + controller + selectors with strong typing and zero business logic.

## Immediate TODOs
- [ ] Add `src/game/state.ts` with `GameState` and related stubs.
- [ ] Add `src/game/commands.ts` defining initial command union.
- [ ] Add `src/game/effects.ts` with `Capabilities` and no-op/convex stubs.
- [ ] Add `src/game/engine.ts` exporting `apply(state, command)` (identity for now).
- [ ] Add `src/controllers/controller.ts` and `src/selectors/index.ts` skeletons.

## Acceptance
- New files compile under strict TS.
- No external behavior changes; only scaffolding.

## Status Log
## 2025-09-06 09:00 — Ready
- Context: Waiting on test runner verification and branch confirmation.
- Next: Create files and run typecheck locally.
- Decisions: Keep engine pure; return `[state, Effect[]]` from `apply`.
