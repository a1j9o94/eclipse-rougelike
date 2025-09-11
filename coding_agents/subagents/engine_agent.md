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
## 2025-09-11 — MP/SP Reroll Unification
- Files touched: `src/hooks/useOutpostPageProps.ts`, `src/engine/commands.ts`.
- Change: Removed MP-only UI override of reroll label to `economy.rerollBase`; UI now uses authoritative `rerollCost` for both SP/MP. Unified engine to always use parameterized `*WithMods` paths with `economyMods || getDefaultEconomyModifiers()`.
- Effects: Reroll button label/disable in MP reflect server-synced cost; increments consistent across modes.
