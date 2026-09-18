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
# 2026-09-07 — Local demo validation
- Reproduced startup failures before implementation (missing Convex provider and blocked no-backend entry); configured-provider behavior remains covered.
- Focused run: 18 passing tests across local_startup, eclipse_demo_navigation, usePublicRooms_hook and startpage.
- Browser checks: tutorial launch, reload/continue, combat launch, two-player board, six-player board, guardians and generic galaxy page. No uncaught page errors.
- Build passed. Lint remains at 88 existing errors/12 warnings versus 89/12 before this work.
- Result & Next Steps: local demos ready for playtest; full multiplayer match behavior was not verified.

## 2026-09-07 — Second Dawn validation result
115 new focused tests across 16 files pass with one worker; 8 legacy startup/demo regression tests pass. Changed files lint-clean; repository baseline remains 88 errors / 12 warnings. 22 desktop screenshots reviewed with six automated fixture walkthroughs; independent review defects fixed. No full-game, deployed persistence, or human playtest acceptance claimed. See coding_agents/second_dawn_status.md and second_dawn_screenshots/review-results.json.

## Full-game final verification

246 game tests/37files passed with1worker;2 local-launcher preservation tests and2 baseline-checker tests passed;8 targeted legacy regressions passed. Production build and changed-code lint passed. Repository lint retains88existingerrors/12warnings. Reviewed21actualscreens match protected baselines.19 browser workflows,17 deterministic/faction fullmatches,8pairedAIbenchmarkgames, and live3/6seatConvexmatches are recorded separately from human playtesting (none claimed).
### 2026-09-07 — final visual/multiplayer verification

398 focused tests / 79 files passed in a memory-bounded single worker run. Added independent room ownership/capacity/privacy tests and a deterministic 197-command timeout completion test. Production two-browser walkthrough passed invitation routing, guest separation, factions/readiness, start, shared/private views, wrong-seat denial, offline/reconnect, actual timeout AI, human return, and history labeling. Solo compatibility smoke also passed. Changed-code lint, TypeScript, and build pass; inherited repository lint remains 88 errors/12 warnings. Rendered desktop review and validation artifacts are linked from `coding_agents/second_dawn_multiplayer_release.md`.

## Mobile release gates — 2026-09-08
Final memory-bounded full-game batch: 496 tests across100 files passed. New failing-first coverage includes public read-marker identity/monotonicity, recap boundaries, foreground recovery, faction focus, preview receipts, touch gestures, draft isolation/stale/duplicate recovery, mobile navigation/manual AI inspection and mobile AI retry. Production build (including TypeScript) and changed-code lint passed. Full repository lint remains88 inherited errors/12 warnings. Browser artifacts and actual-image review are indexed in second_dawn_mobile_release.md; no physical phone or human search-time evidence is claimed.
