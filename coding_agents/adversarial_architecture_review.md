# Adversarial architecture and verification review

Reviewed November 11, 2026 against baseline `cb6c932cc11ad30487a23862256f3aef5c2d650f` and the changing, uncommitted `feature/maintainability-preserve-play` working tree. Updated after the formatter, Python inventory, actor lifetime, receipt-recovery and build-flow fixes. This is a bounded independent review, not approval of a final commit or production release.

## Current disposition

No new architecture-specific blocker to a review preview was identified after the fixes below. Preview readiness remains conditional on the in-progress final test run and independent short-landscape visual retest. This does not certify whole-game, cross-browser or physical-device parity, and it does not authorize production deployment.

### Remaining production validation gate

Paths: `tools/maintainability-browser-check.mjs`, `tools/maintainability-fixture.mjs`.

The browser harness now submits and confirms a build and compares the resulting command/state proof; this closes the earlier empty-trace problem for that journey. Most other scenarios still open workspaces without completing their actions. The fixture does not yet provide queue submission, delayed acknowledgement, busy/disconnected states, or reconnect controls. Consequently the broader command, queue, persistence, acknowledgement and full-game invariants remain outside this browser harness's demonstrated scope.

The fixture now pins its actor using initial state. Static inspection confirms it no longer follows the active seat automatically after turn completion.

Keep the remaining gameplay and cross-engine/device gates explicitly incomplete while using this harness only for the scenarios it exercises. A review preview can expose the candidate for further testing; it is not proof that the full maintenance plan's production gates passed.

## Findings resolved during follow-up

### Scoped formatting covers the extraction

`tools/format-maintainability.mjs` now targets `SecondDawnBoard.tsx`, `src/second-dawn-game/board/*`, `mobileBoard.css`, and the maintenance browser scripts in addition to dialog/tooling files. The reported scope omission is resolved by inspection; the final format gate still applies after last edits.

### Python test is inventoried and executed

`discoverTests` now includes a `python` inventory. `test:tools` runs `python3 tools/archive-eclipse-sources.test.py` after the Node tool tests. Independently reran that Python file: 4 tests passed. The existing omission is resolved.

The current `test:tools` entry invokes a top-level `tools/*.test.mjs` glob and the specific Python file. If nested Node tests or more Python tests are later added, execution must be expanded alongside inventory; discovery alone does not execute them.

### Receipt recovery preserves the original acknowledgement contract

`boardReceiptAcknowledges` now compares the fresh receipt against the receipt observed when submission began and waits for the authoritative view to reach that receipt's revision. It no longer requires a recovered receipt to be newer than the retry's already-advanced view. This restores the baseline behavior identified by the independent gameplay review. I inspected the predicate and its updated tests; the gameplay reviewer owns the executed recovery reproducer and its pass evidence.

### Actual build command proof matches

Independently read and compared `/workspace/shared/eclipse-baseline/build-accepted-proof.json` and `/workspace/shared/eclipse-candidate/build-accepted-proof.json`. The parsed objects are exactly equal, including the full trace state and next legal commands. Both contain one successful command: build one interceptor in sector `222`, actor `p0`, revision `1`, with `1` material remaining. The browser runner now performs this branch and includes its accepted-state screenshot in strict comparison. The browser interactions were executed by the root agent; this reviewer independently verified the stored proof rather than claiming to have operated that browser.

### Short-landscape chooser is an explicitly requested behavior change

Inspected the final `mobileBoard.css` rule scoped to landscape height at most 550px and an expanded sheet containing action groups. It temporarily hides turn order/footer and the underlying workspace, and lets the chooser occupy the available area. This is outside pure visual parity and is justified by the user's explicit request to fix the tiny chooser. Approval of actual visibility, dismiss/return behavior and adjacent layouts belongs to the independent visual retest, still in progress at this update.

## Findings addressed during review

- The initial board extraction referenced `submittedTurnHandoff` in eager effect dependency arrays before the hook declared it, and removed optional chaining from nullable AI actor/action dependencies. The later working tree moved the command hook before those arrays and restored optional access. This requires the board integration tests and final type/build gate; static inspection alone is not a final runtime pass.
- The initial browser comparator silently continued on missing/invalid PNGs and skipped baseline cases containing errors. The updated harness requires passing baseline result flags and uses `compareReviewedScreenshots`, which fails on missing expected images and reports missing actual images. It also rejects identical baseline/output directories before writing. These concrete false-green paths are closed by inspection.

## Checks performed

Ran only the focused tool tests, avoiding a concurrent full-suite run:

`node --test tools/build-vercel.test.mjs tools/run-tests-batched.test.mjs tools/second-dawn-check-visual.test.mjs`

Result, independently rerun after follow-up changes: 8 passed, 0 failed, 0 skipped. Also ran `python3 tools/archive-eclipse-sources.test.py`: 4 tests passed. Coverage includes preview versus production build routing, test discovery/report validation, invalid batch parameters, decoded-pixel comparison, one-pixel detection, dimension mismatch, missing render, missing baseline, invalid PNG, empty selection, unsafe file names, and source archive integrity.

Static inspection found:

- Persisted screen/action/camera/selection still use the existing draft provider; no second persisted store was introduced in the reviewed modules.
- Map and navigation are joined by a separate inspection coordinator rather than importing one another.
- Shared rules and backend schemas were not changed in the inspected implementation diff.
- The actual app keys the board by match, viewer, and rollback revision, which is important for resetting transient hook state. Keep that identity contract and exercise it in integration tests.
- Native dialog close notification is guarded, latest callbacks are retained, listeners are removed before cleanup close, and stale StrictMode close events are ignored while the element is reopened. Actual browser focus/inertness/top-layer behavior still requires browser evidence; the jsdom shim is not such evidence.
- Preview Vercel builds route to `build:frontend`; production retains the existing publishing release path. Local full verification uses a non-publishing frontend build. The routing test passed with a stubbed npm executable; no deployment was performed by this review.

## Final evidence still required

Review the exact integrated commit after all agents finish. The root's final full-suite run was still in progress during this update; this review does not infer its result. Require the final test inventory and type/build gates and the visual review of the latest short-landscape change before describing the preview as ready. The documented broader command/queue/recovery, engine and physical-device matrix remains required before production-wide parity claims. Browser runtime work was not executed by this reviewer. Missing runtime evidence must remain incomplete rather than be represented as a pass.

Backend and test typecheck scripts exist separately from `check:full`; the final ledger must state exactly which were run and their results. Preserve production-mode asset validation separately from Vite fixture verification. Check that generated benchmark/evidence files are intentional before committing them.
