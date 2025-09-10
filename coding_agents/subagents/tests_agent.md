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
## 2025-09-06 09:00 — Queued
- Context: Awaiting engine scaffolding paths and exported symbols.
- Next: Confirm test runner, then add the five failing specs.
- Questions: Are we standardizing on `jest` or `vitest` here?
