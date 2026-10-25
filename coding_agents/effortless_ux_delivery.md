# Effortless choices and continuous play

User outcome: players can reconsider selections, inspect, and resume without losing their work, then commit the visible plan once.

Specification: the attached October 25 plan “Eclipse UX overhaul: effortless choices, continuous play” supersedes the earlier source audit. Existing game rules, RNG, saves, privacy and deployment targets remain authoritative.

Branch: `feature/effortless-ux`, baseline `c665303`.

Acceptance: selected targets and commits agree; compatible inputs survive edits; collection edits preserve siblings; close preserves and Reset deliberately clears; remote revisions revalidate locally; ordinary turns and full drafts require no readiness dialog; global navigation remains available; upkeep settles once; battle automation defaults to manual, authenticates owners and pauses at explicit strategic boundaries.

Tests first: shared-shell regressions failed 4/4 before implementation (navigation, turn modal, build readiness, upkeep chain). Selection/economy and fitting/combat agents own behavioral regressions for their surfaces. Run bounded suites to respect the repository memory guard, then lint, build and desktop/mobile browser checks.

Risks and rollback: stale selections must never substitute targets or payment; automation must not leak private state or run beyond its battle. Frontend changes revert normally. Additive automation schema defaults old saves to manual. No migration deleting saved state.

## Delivery ledger

- Shared-shell fail-first evidence: `/tmp/eclipse-shell-fail.log`; initial green: four tests in `second_dawn_effortless_shell.spec.tsx`.
- Selection/economy: implemented; see [selection evidence](effortless_selection.md).
- Fitting/rewards/supporting screens: implemented; see [fitting evidence](effortless_fitting.md).
- Persistent combat and server automation: implemented; see [combat evidence](effortless_combat.md).
- Final map/dock integration, repository lint and production build pass. Release target and verification procedure are recorded below.
- Human newcomer/expert playtests: pending; automated walkthroughs do not establish player comprehension or enjoyment.

## Decision log

- Keep the existing command processor and player-view privacy boundary.
- Reuse existing persisted drafts and command receipts; use per-activity purchase/frontier storage so switching activities does not clear choices.
- Queue commits are explicit on the planner button and save directly; queued-action replacement/cancellation remains visible.
- Keep global mobile destinations while showing the current activity separately.
- Present colony opportunities before income collection in the settlement; collecting does not open another readiness modal.

## Follow-ups

Human newcomer/expert sessions and physical-device ergonomics remain acceptance work. Automated tests establish command/state behavior and the browser checks below, not comprehension or enjoyment. No human playtest is claimed.


## Integrated behavior and evidence

- Navigation and draft storage: per-activity research/frontier drafts, close/resume, explicit local Reset and Undo, accepted/queued receipt matching, no unrelated-revision acknowledgment, one visible selected purchase target, and independent public inspection on the existing galaxy.
- Ordinary actions: editable research/funding, persistent inline fittings and aggregate class orders, Build order tray with explicit placement and payment correction, editable/reorderable movement routes, source-preserving Influence, and immediate fixed-resource colony drafts. Ghosts are local previews; the command processor remains authoritative.
- Turn flow: no ordinary turn/readiness dialogs, direct queue saving with explicit labels, completed purchase/fitting/movement results stay in their activity, one income settlement and one collection control. Auto-pass belongs to the turn controls.
- Encounter flow: stable battle scene through decisions/waiting/aftermath, manual allocation/retreat/initiative editing, opt-in owner-only background automation. Server work uses revision and control-generation checks, authenticated idempotent controls, existing rules processing, and explicit pause boundaries.
- Supporting surfaces: deduplicated ongoing games with private needs-input summary, expanded setup references on request, readiness-change notice, grouped history and deliberate history editing, selected-only recruitment/exchange previews, inspectable scores, separate preferences/game controls, and read-only spectator inspection.

### Decision-family coverage

All 23 decision dispatches retain their authoritative commands and privacy boundary. Existing specialized renderers remain the shared entry points; the work changes selection, previews and continuity rather than adding a second decision engine.

| Families | Shared presentation and behavioral evidence |
| --- | --- |
| Exploration, control, discovery, colonization, portal placement | Existing galaxy, retained tile orientation, selected reward preview, single forced side, actual planet selection; exploration/discovery/main-map/spatial suites |
| Ancient part, free technology | Shared fitting hardpoints/tray and Research reward mode; Ancient/fitting/reward suites |
| Resource reward, population return, bankruptcy | Direct quantities and remaining pool, visible exact blockers, upkeep shortfall continuity; visual economy/decisions/upkeep suites |
| Diplomacy, diplomacy window, reputation | Shared exchange preview and selectable actual tiles, invalid resource/rack checks; relationships/diplomacy/decisions suites |
| Discovery draft, technology reservation, reverse engineering | Replaceable shared tile trays and preserved compatible selection; Scifi/exception suites |
| Combat turn, allocation, retreat, initiative order, bombardment, Super Joker, less-random reputation | Persistent encounter, editable assignments/order/retreat, explicit special choices; combat/direct/volley/decisions/rules suites |

### Final bounded verification

The repository prohibits a single full-suite run because of memory usage. Relevant suites ran in bounded groups with one worker. Counts below describe separate gates and are not summed across overlapping follow-up runs.

- Shell/draft/inspection/queue/upkeep-entry gate: 59 tests across 9 files passed (`/tmp/eclipse-final-shell.log`).
- Turn handoff, movement continuity, reaction inspection and concurrent upkeep/research: 31 tests across 5 files passed (`/tmp/eclipse-final-root.log`).
- Backend privacy/auth/commands/timers/undo/resign/queue/automation gate: 90 distinct tests across 12 files passed; expanded race evidence in the combat note.
- Final fitting: 51 tests across 8 files; Build/funding: 28 across 5 files. Selection/reward/faction batches and fail-first evidence are recorded in their delivery notes.
- Full `npm run lint` and `npm run build` passed, with final release reruns in `/tmp/eclipse-release-lint.log` and `/tmp/eclipse-release-build.log`. Build retains the existing large-bundle warning; this is not a build failure.
- Chromium walkthroughs at 1440×900 and 390×900 cover research replacement/blockers, build placement and funding, persistent component tray, and the encounter shell. No browser exceptions or horizontal page overflow; Build and Upgrade create no readiness dialog. Local harness stays ignored under `.second-dawn/ux/` and does not add a public preview endpoint.
- Real local Convex/Vite flow: create game → research Gauss Shield → accepted result → reload same match. Resources remained money 3, science 1, materials 4; zero browser exceptions (`/tmp/eclipse-live-local-result4.log`). The local backend was launched with the configured proxy; no existing hosted save was modified for this test.

- Final map/faction/dock/spatial regression gate: 53 tests across 6 files passed (`/tmp/map-regressions-final.log`). Covers private ghost previews, exact colony squares, eligible sector/fleet abilities, four unsupported queued faction abilities, and distinct supporting draft resume/reset. Final 13-case map suite also passes after keeping a removed faction object visibly blocked and suppressing an inactive ordinary commit during explicit faction inspection.
- Final compatibility checks: 19 draft/revalidation tests pass, including fail-first migration of older research/frontier storage without reviving explicitly cleared activity drafts. A further 24-test shell/handoff/storage gate passes after preventing an inactive completion draft from appearing as another activity’s commit. Mobile shell: 12 tests pass after moving auto-pass to the stable turn controls.

### Release

Target remains the existing `main` Git integration, public alias `https://eclipse-rougelike.vercel.app/`, and configured Convex `dev:ideal-nightingale-55`. The Vercel connector lacks the team's access grant in this session; use the existing GitHub Vercel commit status plus a public-site smoke check to verify the Git-triggered deployment. No alternate project, branch deployment, backend selector, or release pipeline is introduced.
