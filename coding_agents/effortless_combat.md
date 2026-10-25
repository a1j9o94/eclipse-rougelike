# Effortless choices — combat delivery, 2026-10-25

Player outcome: one optional Auto fight control resolves ordinary firing and allocation for the current battle in the background, while ship losses and strategic exceptions return control explicitly. Manual players can preview an automatic allocation and adjust it, reorder tied firing groups, and reconsider retreat destinations before declaring retreat.

Acceptance implemented:

- Old ownership records default to manual combat. Intent is owned by the authenticated seat, scoped to one battle, and projected only to that owner.
- Enable/resume uses the visible match revision and control generation. A pause invalidates future work even when an accepted command races it. Control receipts deduplicate delayed retries; an old enable cannot undo a later pause or restoration.
- Each server job resolves exactly one current ordinary firing/allocation decision through `commitCommand` and `processGameCommand`. Revision, battle, generation and scheduled-revision checks deduplicate jobs. Accepted commands have ordinary history/checkpoints and timer reconciliation.
- Allocation uses public blueprints and persisted dice only. It completes low-cost kills using a bounded damage-subset search, avoids avoidable excess, handles shield-specific legal hits, Antimatter Splitter, required miss assignments and Rift backfire-only dice. It never rolls or spends a consumable.
- Friendly losses, forced retreat, owned special decisions, completion, timeout and undo pause or finish automation. Continuing is explicit. Resignation and applied undo clear intent. A scheduled watchdog exposes lost dispatch as a paused error without spending a decision.
- Manual Auto assign only edits the volley preview. Dice remain directly reassignable. Hit arithmetic is inspectable. Initiative order uses accessible reorder controls and a specific commit. Retreat selection highlights legal map sectors, previews a destination, and submits only through Declare retreat / Retreat fleet.
- Root integration provides the stable battle workspace and wires the authenticated control from the game container.

Test-first evidence: new policy and UI tests failed on missing modules; backend tests failed on absent control/worker endpoints; updated initiative/retreat tests failed on old immediate/toggle interactions; watchdog regression failed on absent expiry handler before implementation.

Verification:

- `npx vitest run --maxWorkers=1 src/__tests__/second_dawn_combat_automation_convex.spec.ts src/__tests__/second_dawn_combat_automation.spec.ts src/__tests__/second_dawn_combat_automation_ui.spec.tsx src/__tests__/second_dawn_battle_engine.spec.ts src/__tests__/second_dawn_rift_combat.spec.ts src/__tests__/second_dawn_rollback_convex.spec.ts`: 69 tests / 6 files passed.
- `second_dawn_combat_direct.spec.tsx` and `second_dawn_decisions.spec.tsx`: 18 tests passed.
- `second_dawn_combat_volley_ux.spec.tsx` and new automation UI: 7 tests passed.
- Changed combat/backend TypeScript files passed ESLint; shared Eclipse typecheck passed. Root owns final full lint/build and integrated browser evidence.
- React best-practices review: state is event-driven; automatic preview is pure; props are typed; no client timer drives game state; buttons have readable names, 44px targets, and disabled states; inspection arithmetic uses focus/tap-accessible details.

Risks and rollback: additive optional ownership fields and a private receipt table do not alter GameState, RNG, saved rules pins or public spectator projection. Reverting the UI leaves old matches playable. A backend rollback should pause outstanding automation first; outstanding worker references must remain deployable until drained. Human newcomer/expert playtests and visual judgment are not established by these tests.

## Independent integration review and reconsideration follow-up

Fail-first review found five concrete regressions: legacy battle views without an ID disappeared while waiting; spatial occupation lost its galaxy after combat; empty route edits could submit the original hidden route; a full order prevented selecting replacement ships; switching between routes discarded the previous edit. Root corrected the two encounter-shell issues; this delivery corrected the three movement issues. Invalid route edits now appear in the visible order and prevent commitment. Editing uses the capacity before that route, preserves changes when switching/reordering/removing other routes, and ignores an out-of-range saved edit index. `second_dawn_effortless_review.spec.tsx`, movement planner and movement continuity suites pass: 26 tests.

Exploration now retains orientation when switching drawn tiles. An orientation that cannot connect remains visible with its blocker rather than silently rotating. Repeated instructions and the connection catalog are optional details; rotation/placement/discard remain together. Discovery options share one stable commitment area. Public-tile replacement updates the preview and actual target, a removed supply choice remains explicitly blocked, and a sole legal side is filled without submitting. Details remain available by tap/keyboard. Discovery and exploration suites pass: 27 tests / 6 files, including new reconsideration tests. All changed files in these follow-ups pass ESLint.

## Final backend regression and race review

The final bounded backend gate passed 88 tests across 12 suites: automation policy/backend, authoritative matches, multiplayer review, rooms, multiplayer timer contracts, rollback, resignation, queued actions, spectator projection, protocol review, and concurrent upkeep. Log: `/tmp/eclipse-final-backend.log`.

Independent follow-up reviewed control receipt ordering, revision/generation guards, opponent waiting states, every accepted-command scheduling path, timer reconciliation, transaction boundaries, resignation, applied undo, and watchdog expiry. Storage and scheduling remain outside the policy-error catch so a failed persistence operation cannot leave a partially accepted command. Old ownership records still omit automation and remain manual. No further implementation change was required.

The automation suite now explicitly checks that a pause from the pre-volley revision stops future work after that volley commits; manual firing that wins the ordering leaves only its own journal entry when the old worker/watchdog arrive; and an older enable generation cannot expire or execute a resumed generation. The expanded automation suite passed 15 tests, bringing the verified total to 90 distinct backend tests across the same 12 files. Log: `/tmp/eclipse-automation-races.log`. Changed backend and automation test files passed ESLint. Root retains the final repository build/lint, frontend gate and production release.

The upkeep integration follow-up updated the two existing concurrent-upkeep/research suites to the always-visible settlement. They preserve independent upkeep participation, completed-player waiting during another player's private bankruptcy, mobile accepted-payment receipts, and research/map navigation without changing balances. Single-commit assertions exposed duplicate mobile Collect income controls on Back to upkeep; root corrected that navigation path and owns the final 19-test rerun.
