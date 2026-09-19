# Visible turn order — September 19, 2026

## Outcome
Players can see who acts next and no longer receive an automatic first-turn advantage from being the host/human.

## Acceptance criteria
- Live solo and room creation fairly choose the initial starting seat with persisted seeded randomness; existing matches retain saved state and fixtures can retain explicit deterministic setup.
- Preserve clockwise base-game seat order, first-pass +2 money and next-round starter, and passed-player reaction turns.
- Desktop/mobile roster lists current action player first, followed by clockwise turns; eliminated seats remain inspectable at the end. Outside the action phase use the start-player tile holder as the anchor. Sorting must not mutate seat data or faction colors.
- A compact visible turn-order label and first-pass/next-round starter marker explain the strip without adding a large panel.
- Relevant bounded tests, full lint/build, rendered desktop/mobile checks, and main-only Git deployment.

## Tests first
- New roster tests must initially fail for non-seat-one active player, next-turn rerender, passed reactions, eliminated seats and first-passer marker.
- Setup/live creation regressions must initially fail for randomized non-host starts; verify deterministic seeds and round transitions.

## Risks and rollback
AI may own the first action, so scheduling must begin immediately after creation. Avoid changing existing seat ownership, physical locations, or ongoing saved turns. Keep deterministic fixtures reproducible. Roll back the feature commit without modifying saved rows.

## Decision log
Roster rotates from current action player rather than reordering physical seats or sorting by pass sequence; the base game retains clockwise order. The start tile transfers when a player passes first, so it is labeled for the next round rather than implying the current round restarts.

## Additional request: ambassador identity
User's exchange screenshot showed that the offering faction was difficult to recognize. Display its existing faction emblem at a prominent size with faction color/name beside the offered cube description. Preserve all acceptance, population selection and minimization behavior; upgrade/UI agent owns this independent slice.

## Roster verification
Three new UI cases failed on the old physical-seat list, then passed after rotation: active/next-turn display and inspection, passed reactions/eliminated ordering, and non-action anchoring. Related roster/quick-turn/handoff/AI-follow/mobile batch: 29 tests passed. Actual six-seat Chromium and WebKit browser review at1440×900 and390×844: correct order, next-turn update, preserved inspection, visible next-round marker, no document overflow or page errors. Reviewed desktop and mobile images under `second_dawn_turn_order_review/`; no physical-device/user playtest claimed.

## Additional request: map controls in the toolbar
Move Show/Hide sector details and Inspect fleet beside Follow AI and Animations, so controls no longer float over empty map space. Keep their existing visibility, selection and focus behavior, and move the contextual Back to empire control with them. New placement/navigation regression failed before implementation. The activity bar accepts composed board controls; no new action or rule behavior.

## Passed-player reaction economy

The compact economy status now reads **Reactions only** after passing during the action phase. Its tooltip and disclosure specify Upgrade, Build or Move, one activation without an influence disc; resource costs, available pieces and blueprint slots still apply. Outside the action phase it retains **Passed**, and elimination/finished labels keep precedence.

ActionEconomy now recognizes these reactions before a draft is selected: no action disc is forecast and upkeep stays unchanged. Ordinary faction multi-activation benefit badges are omitted from reaction previews so they do not contradict the one-activation limit. Ordinary action and actual resource-change forecasts remain unchanged. Parent owns action-button restrictions; strategy agent owns authoritative turn progression.

TDD: four new reaction cases failed first (header and each eligible reaction's disc/upkeep forecast), while non-action Passed remained correct. Final summary/reaction/affordability batch: **16 tests passed**, changed files ESLint-clean. Logs `coding_agents/logs/reaction_economy_red.out`, `reaction_economy_green.out`, `reaction_economy_lint.out`. No backend or Board edits in this slice.

## Fleet inspection placement correction

Inspect fleet belongs within the selected sector's inspector, once above its fleet cards. SectorFleet now renders one shared callback button for any nonempty fleet when inspection is available, and no per-owner/class Inspect capabilities buttons. Own, enemy and neutral fleet cards and individual damage disclosures are unchanged; empty fleets and usages without an inspection callback have no inspection button. Parent removes the separate Board toolbar control and verifies the existing modal integration.

TDD: the mixed-fleet single-button assertion failed first, then all three SectorFleet tests pass, including damage display, neutral grouping and no-button guards. Changed files lint clean. Logs `sector_fleet_single_inspect_red.out`, `sector_fleet_single_inspect_green.out`, `sector_fleet_single_inspect_lint.out` under `coding_agents/logs/`.

## User correction: consolidate fleet inspection
The user clarified that Inspect fleet should not be a separate toolbar control. Keep only Show/Hide sector details beside AI controls. Replace all repeated Inspect capabilities buttons within SectorFleet with a single Inspect fleet button for the selected sector. This supersedes the earlier plan to put both controls in the toolbar; ship glyphs retain their existing direct inspection behavior.

## Reactions and automatic passing
User requests clear passed/reaction-only state and an optional cross-device multiplayer auto-pass mode. Disable ordinary Explore/Influence/Research action entry after passing; retain Upgrade/Build/Move with one activation and no influence disc. The existing Explore shortcut during an ambassador decision remains a map-inspection operation, not an action.

Add seat preference `autoPassUnlessAttacked`, changed by authenticated/revision-checked `set-auto-pass`. It applies after a real pass and persists between devices and rounds. An attack pauses it for the current round, with an explicit Resume option; preference changes never resolve saved decisions. Skip eligible passed reaction turns authoritatively, including when the next real turn returns to the same player. Refresh timers and AI budgets for that new turn, while ordinary off-turn preference changes preserve deadlines. Test rejected moves, interrupted decisions, all-passed termination, attack interruption, ownership and scheduler behavior before completion.

## Latest requests: transient battle results and automatic reputation
Battle casualty results now expire after six seconds and disappear immediately when the authoritative revision or workspace changes. Returning to a screen does not resurrect old results. Existing manual dismissal remains optional.

Reputation awards automatically retain the highest-value legal holding, with at most one newly drawn tile. A private Drew/Selected notice shows for ten seconds without confirmation; the latest result remains accessible from the owning player's Empire overview. Public History continues to exclude private events. Persisted private journal data is not exposed by that public feed. Old pending reputation saves automatically submit the same authenticated resolve command once per revision, with reconnect handling and an explicit retry fallback after a failed request.

Parent integration checks: 26 targeted result/choice tests passed; four fixed-owner Chromium/WebKit desktop/mobile browser cases confirmed automatic legacy-save settlement, no reputation confirmation, readable private results, and battle-feedback removal on advance. The first combined pre-reputation suite passed833/834; its only failure used the removed floating fleet button. That spatial-plan test now uses the retained clickable fleet glyph and passes, confirming the build draft survives inspection.

## UI interaction decisions
The auto-pass checkbox appears on the idle galaxy, including before the initial pass and while another player acts. It is absent during an open local action plan or saved decision so preference-only revisions do not reset uncommitted fitting/movement drafts. Attack interruption displays an explicit Resume control. Changes use authoritative saves and do not create a gameplay draft.

## Final regression corrections
The combined 877-test run exposed one outdated UI assertion that required casualty notices to persist into later decisions, contrary to the current request. That assertion now verifies the old notice stays closed; combat history retention remains separately covered. The combat-flow/notice batch passes all 12 tests. A room-start scheduling test also timed out during the combined run but passed all three cases in isolation (183 ms); the complete memory-bounded suite is being repeated before release.

## Final acceptance gate
The repeated complete memory-bounded suite passes **877/877 tests across 159 files** (139.59 seconds). The startup case passes in both isolation and the combined rerun; investigation confirmed the worker helper already executes only one dispatched action and does not advance future timers. No timer-drain or production defect was established, and no timeout increase/test workaround was added.

Full repository lint, TypeScript checks and production build pass. Vite retains its existing large-chunk advisory and outdated Browserslist-data notice. `git diff --check` passes. Browser evidence covers Chromium and WebKit at desktop/mobile sizes for turn order, toolbar/inspector placement, ambassador identity, saved auto-pass, automatic private reputation and transient casualty feedback; no page errors or horizontal overflow. This is engineering review with emulated mobile viewports, not a user playtest or physical-device claim.

Release uses the authorized Convex development deployment `ideal-nightingale-55`, followed by a Git push to `main` for Vercel. No feature-branch or manual Vercel deployment. Final deployment IDs, live checks and git SHA are recorded under ignored runtime logs to avoid a self-referential documentation commit.

## Hosted release verification
Commit `5c03f77` reached Vercel Ready through the `main` Git integration, with the canonical alias serving the same `index-WUpliIuq.js` bundle as the verified local build. Convex dev deployment completed schema validation and function deployment. Normal/Hard live games advanced successfully; the Normal auto-pass preference survived reload.

The hosted browser harness initially used Playwright `check()`, which assumes an immediate DOM checkbox change. This is an authoritative controlled preference: its checked state changes only after the server save. The harness now clicks once and polls the already-existing server assertion before reload; no application behavior changed. Changed-tool lint and diff checks pass. Complete three-difficulty live results are recorded in `.second-dawn/turn-reactions-live/results.json` and `coding_agents/logs/turn_reactions_release_result.json`.
