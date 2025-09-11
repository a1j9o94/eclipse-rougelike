# tests_agent

## Charter
Author failing tests for initial command set and selectors to drive implementation.

## Immediate TODOs
- [ ] Verify jest/vitest setup and test path conventions.
- [ ] Create skeleton failing tests:
  - `src/__tests__/engine_start_run.spec.ts`
  - `src/__tests__/engine_buy_item.spec.ts`
  - `src/__tests__/engine_reroll.spec.ts`
  - `src/__tests__/engine_upgrade.spec.ts`
  - `src/__tests__/engine_snapshot.spec.ts`
- [ ] Provide minimal helper fixtures for MP snapshot application.

## Acceptance
- Tests compile and fail with clear messages referencing the intended behavior.

## Status Log
## 2025-09-11 — MP/SP Reroll Unification (tests first)
- Added failing UI spec `src/__tests__/mp_outpost_reroll_unified.spec.tsx` capturing MP Industrialists showing authoritative reroll cost (3¢) and disabled state with credits < cost.
- Added engine spec `src/__tests__/engine_reroll_unified.spec.ts` verifying reroll increments respect economy mods (3 with 0.75; 4 with default).
- Ran subset to avoid OOM: only these two files.
- Result: UI spec failed initially (showed 0¢), engine spec passed; after fix, both pass.
## 2025-09-06 09:00 — Queued
- Context: Awaiting engine scaffolding paths and exported symbols.
- Next: Confirm test runner, then add the five failing specs.
- Questions: Are we standardizing on `jest` or `vitest` here?
