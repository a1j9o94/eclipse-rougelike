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

## 2026-09-18 — Map context and endgame validation
Failing-first UI tests cover ambassador draft preservation, trackpad events, finished-game navigation, score privacy/ties, and exploration contents/faction fleets. Bounded full suite: 605 tests /123 files passed before the final camera sizing refinement, with focused camera/exploration checks afterward. See `second_dawn_map_endgame_release.md` for browser and gate evidence; no physical-device or human playtest pass is implied.

## September 18 — Advanced research preview
Eight new tests cover controlled/empty/advanced filtering, resource-specific and gray eligibility, duplicate prevention, existing technology overlap, ship/cube limits including minus-one tracks, immutable inspection, market/owned cards, and refreshed population. Initial missing-helper failure recorded in logs/advanced_population_red.out. Relevant research and colonization regressions pass. Four actual browser screenshots reviewed, no horizontal overflow. No human playtest claimed.

## September 18 — Combined release gate
621 tests across 125 Second Dawn files passed with one worker. Seven new no-acknowledgement regressions plus updated draft tests cover unchanged persistence, receipt cleanup, and actual current affordability. Final production build and all changed-file lint passed. Repository lint debt unchanged (88 errors, 12 warnings). Four-view browser review and screenshots captured using tools/second-dawn-advanced-research-review.mjs.

## September 18 — Empire/dice/ships/connections final gate
661 tests/134 Second Dawn files pass in memory-bounded one-worker batch. Four old label expectations updated to replacement UI; their behavioral assertions remain. Production build passes. 43 changed TS/TSX/MJS files lint-clean; existing full-repo lint remains88 errors / 12 warnings. Reviewed all24ship silhouettes, five-size overview/map/settings screens, actual Chromium/WebKit combat throws. Artifacts/tools documented in second_dawn_empire_dice_release.md. Physical-device human experience not claimed.

### 2026-09-18 — Combat estimator fidelity

Tests first: eight new outcome/phase/splitter/input tests failed against the old estimator (`coding_agents/logs/ai_simulation_red.out`), then passed. Added exact comparison against `battleEngine` for 24 seeded one-volley Antimatter Splitter fights; a separate test reproduces every one of 128 single-die samples through authoritative `dieHits`, covering computers/shields and natural faces. Destination-based forced-retreat survivor test failed before its fix (`ai_retreat_red.out`). Final estimator suite: 12 tests passing, independent RNG and input immutability retained. Changed estimator/tests lint clean. Overall parent typecheck temporarily reported an in-progress `aiWorld.ts` tuple type error, unrelated to estimator; reported to parent.

## September 18, 2026 — strategic runtime verification
Worker tests failed first on absent schema, then pass for exclusive lease, filtered state, stale/duplicate safety, budget continuation, interrupted retry and room persistence/solo wait. Updated existing scheduler tests to execute the newly separated action stage; full timeout match completes with contiguous journal and scoring. Difficulty controls tested and actual 1440/390 Chromium screenshots reviewed. See `coding_agents/logs/ai_runtime_final.out` and `coding_agents/second_dawn_ai_runtime.md`.

## 2026-09-18 — Independent AI worker concurrency review
Strategy agent independently reproduced four worker integration defects before runtime fixes: off-turn trade strands timeout work; generic retry clears takeover; human/server command-ID collision creates duplicate journal keys; off-turn activity restarts a failed expired clock. Added six tests in `second_dawn_ai_concurrency.spec.ts` including still-current expired lease and replaced timer-token guards. All six now pass; scoped ESLint passes. Findings and fixes tracked in `coding_agents/second_dawn_ai_worker_independent_review.md`. Runtime agent owns implementation changes; parent owns final broader gates.

### 2026-09-18 — Strategic search tournament and runtime evidence

Added `tools/second-dawn-strategic-ai-benchmark.mjs` with pinned source hashes, deterministic node budgets, externally measured latency, current-fast/frozen-legacy opponents, counted legacy legality fallback, incremental reports and explicit failed-game records. The initial run found the funded-action continuation upkeep crash (zero remaining influence): sent exact seed/step/stack to strategy agent, who added a regression and fixed it. An initial six-seat harness faction-color collision was corrected; all 2–6 setup counts validated.

Final stable-policy evidence: five search-controlled games at 2–6 seats all complete and reach depth four; four paired held-out seed-1069 games against the improved fast policy all complete and reach Hard depth four / Expert depth five; one fast-versus-fast control completes. Source hashes unchanged for final coverage/held-out/control runs. Hard wins 1/2 paired games; Expert wins 2/2, explicitly not broad strength certification. Final held-out searched-command p95/max: Hard 0.544s/0.567s, Expert 2.538s/2.620s locally. Six-seat coverage p95/max: 2.916s/2.976s. Constant clocks test work budgets, not deployed deadlines. Raw JSON, failures and complete caveats in `coding_agents/second_dawn_strategic_ai_benchmark*.json` and `.md`. Harness lint and diff checks pass. No commit/push.

## September 19, 2026 — upgrade picker verification
Ten focused picker tests plus existing editor/draft/fitting/class tests pass (30 total). Real browser picker review passes nine viewport/engine combinations, plus doubled-text checks; fixed observed Close clipping. Parent owns broad suite and combined production build. Evidence: `coding_agents/second_dawn_upgrade_picker_review/` and local log `coding_agents/logs/upgrade_picker_final_tests.out`.

### September 19 — Inline Research validation
13 research/funding cases pass (initial local-containment/no-scroll failures recorded), including rare tracks and owned market duplicates. Six Chromium/WebKit desktop/phone isolated purchases succeed with zero selection scroll shift; doubled-text phone cards do not overflow. Actual rendered images reviewed; no human playtest claimed. Parent runs integrated final gates.

## 2026-09-20 — Independent settings AI and privacy

Result: added `second_dawn_custom_rules_privacy.spec.ts`; initial four cases failed before implementation (settings propagation, hidden inventory redaction, frozen Ancient Might points, game-length AI horizon). All now pass; added catalog/sampling isolation coverage. Relevant verification: 39 protocol/review/search/privacy tests, then 31 strategy/minor-species/full Less Random AI match/privacy tests passed (overlapping privacy cases). AI matches completed for two through six base seats and expanded civilizations. Targeted ESLint and `npm run typecheck:eclipse` passed.

Next steps: parent runs final combined focused gate plus lint/build after all agents integrate; deploy via authorized existing Git-triggered pipeline.

Follow-up public score slice: two new running-score cases failed first, then passed after separating public bonus categories from private reputation and making frozen Ancient Might redaction idempotent. Running score + public inspection + Less Random score + custom privacy: 19 tests passed; targeted ESLint passed.

Final review follow-up: two faction description tests failed first. Full configuration now separates Eridani public reputation, Draco exploration, and changed faction trade/bans. Faction picker + expanded faction UI: 11 tests passed; targeted ESLint passed. Minor-species population purchase horizon regression also failed first and now passes (12 privacy/species tests).

## September 20 — Action confirmation notices
Observed missing-notice failures before implementation. Added 14 readiness/explicit-confirmation/dismissal/visibility/overlay/funding/betrayal tests across three suites; 110 tests across 15 relevant suites pass. Existing turn/upkeep attention, action draft recovery, movement, build, upgrade plan, and auto-advance regression suites remain green. Browser checked desktop and mobile (390×844): final upgrade selection opens prompt, focus lands on Apply, no command until explicit click, no horizontal overflow. Runtime artifacts are in coding_agents/logs/action-confirmation-*.

## September 20 — Shared-map decisions
Failing-first tests demonstrated duplicate maps and absent inspector controls. Added 12 shared-map regression cases across exploration, economy, and board integration. Updated upkeep command-center scroll regression to assert retained hidden controls rather than a retained duplicate map. Final 95 tests across 17 targeted suites pass; lint/build pass. Browser artifacts main-map-* cover desktop, 390×844 portrait, 844×390 landscape, rotation/legal placement gating, upkeep selection, scrollable controls, and no overflow/errors.
- Final review added failing-first regressions for real fleet inspection during upkeep choices and an AI-follow handoff hiding the decision inspector. Both fixed; 13 focused shared-map/AI-follow tests pass. The 95-test total counts unique tests across the bounded runs.

## 2026-09-24 — Spectator board TDD and shared presentation regression

- Red first: `second_dawn_spectator_board.spec.tsx` initially failed because SpectatorBoard did not exist. Added timer/current-actor/keyboard case failed on missing failed-timer status before implementation. Added abandoned-room case failed on missing archive status. Added enabled-public-reputation inspection case failed because the modal incorrectly called public reputation hidden; corrected the conditional.
- Green: 7 spectator cases cover no command controls, no private reputation, public sector/empire/science/blueprint inspection, following both human and AI results, persistent manual focus during live updates, pause/resume/camera navigation, disconnected read-only browsing, market/history, final standings, current-player focus over stale history, keyboard sector selection, read-only failed timer, abandoned archive, configured public reputation labels.
- Regression: 42 tests passed across 9 suites (spectator board, mobile galaxy, running score, sector planets, public inspection, turn clock, discovery reference, galaxy, AI action panel); 11 empire overview tests passed separately. Subsequent public-reputation change: 13 tests passed across spectator/public inspection/turn clock. Targeted ESLint clean.
- Result & Next Steps: supervisor performs complete relevant integration batch and browser newcomer/expert acceptance; no unbounded full-suite run.

## 2026-09-25 — Enlightened of Lyra base verification
- Failing first: Lyra setup/Shrine tests failed while the faction was absent.
- Added `second_dawn_lyra.spec.ts`: setup, legal/cost/one-per-action placement, post-technology placement, controlled-sector scoring, science row reward, one-die colony reroll, saved action recovery, seeded AI completion.
- Result & Next Steps: focused Lyra tests pass; expanded-v2 integration must preserve the existing expanded-v1 roster test and rerun adjacent combat, catalog, protocol, lint/build gates.
