## Portrait-first mobile release — 2026-09-08

Live and preview now adapt to phones with touch pan/pinch, compact navigation, full-width action/decision screens, resumable local drafts and cross-device public catch-up. AI activity resumes after accepted human turns, respects manual inspection and opens at its action title. The existing desktop game and saved matches are preserved. Final Vercel deployment `dpl_CnmZLVfkwiBF3sy1vjUCuJYAv7j3` is Ready on the usual alias and uses development Convex `ideal-nightingale-55`.

497 tests passed in the bounded full-game batch; the final scroll adjustment passed 14 targeted tests, scoped lint and another production build. Live mobile creation/draft reload/exploration/AI expansion and cross-device login/acknowledgment passed; Chromium and WebKit rendered/workflow checks and desktop regressions passed. Full-repo lint retains 88 pre-existing errors/12 warnings. Physical Android/iPhone testing remains awaiting user feedback. [Release evidence](second_dawn_mobile_release.md).

## Fleet cards, AI action following and multi-activation movement — 2026-09-08

Live and preview use separate fleet class/count cards and shared civilization emblems. AI choices are spaced 1.2 seconds and Follow AI opens read-only public technology/loadout/sector interfaces; Watch AI fits the map. Speed-one ships can travel two sectors with two activations in one confirmation, with explicit cost and route. 463 bounded tests, changed lint and production build pass. Reviewed desktop screenshots and browser workflows: [release evidence](second_dawn_fleet_ai_release.md).

## Recoverable players and solo rooms — 2026-09-08

Solo now uses room saves and waits indefinitely for its human. Persistent usernames with optional PIN and private recovery codes restore existing games and seats across devices. Connection status explains stalled/offline sessions and supports retry without deleting identity. 427 tests pass; changed lint, TypeScript and build pass; inherited lint debt remains 88 errors/12 warnings. See [release and validation](second_dawn_player_identity_release.md).

## Latest stage/fleet/installation release — 2026-09-07

Public preview now has opening/midgame/late/combat/Ancient shortcuts and direct links. Sector fleets use ship images/counts; discovered parts install through the actual blueprint with a replacement preview. 301 tests, 17 final focused tests, changed lint, build and deployed browser workflows pass. All 21 game screens reviewed; explicit v3 baseline. Live save/resume and AI progression verified against the development backend. Details: [deployment](second_dawn_deployment.md) and [player feedback](second_dawn_player_feedback_revision.md).

## Latest visual choice update — 2026-09-07

Public deployment now includes visual exploration rotation/connection checks, population cubes/open slots and advanced stars, and discovery reward names/effects beside the 2 VP choice. Same live and preview components. 290 game tests pass; changed-code lint and build pass; inherited repository lint debt unchanged. Reviewed at all three desktop sizes, including a corrected below-fold exploration confirmation defect. Details: [feedback revision](second_dawn_player_feedback_revision.md) and [deployment](second_dawn_deployment.md).

> **2026-09-07 player-feedback revision and cloud release:** now live at
> https://eclipse-rougelike.vercel.app/ with the current interactive preview at
> /#second-dawn-preview. Uses development backend ideal-nightingale-55 as requested.
> See [revision evidence](second_dawn_player_feedback_revision.md) and
> [deployment verification](second_dawn_deployment.md). The historical validation
> below describes the prior release; its cloud-login limitation is now resolved.

# Second Dawn delivery and validation — 2026-09-07

Implemented on `feature/second-dawn-full-game`, inherited from `feature/local-playtest`. Pre-existing work, original deployment configuration, and legacy saves were preserved. Changes are left in the working tree for review.

## Play

The local game is running at **http://127.0.0.1:5175/**. To start it after a restart:

```sh
npm ci
npm run second-dawn:local
```

The launcher runs an authoritative anonymous Convex backend and the desktop client without a cloud login. It uses an ignored `.second-dawn/` workspace and preserves the original `.env.local` and `convex.json`, including permissions. Stop with Ctrl+C when launching from your own terminal. Local Convex data and browser guest credentials persist across restarts; cross-device recovery is available through a saved player profile when both devices can reach this backend.

The default entry is **New Game / Continue Game**, initially one human against two Normal AI opponents. Select one to five opponents and any base faction side. `/#legacy` retains the roguelike and its separate saves. `/#second-dawn-review` is explicitly labeled, isolated deterministic gameplay review; it never writes guest matches.

## Delivered behavior

- Source-audited base catalog: 60 sector faces, all faction blueprints, 39 ship parts, standard/advanced neutral blueprint definitions, 39 technologies, and 36 physical discoveries. Standard neutral setup is used for matches. Audits distinguish publisher rules, physical component scans, supplemental inventory evidence, and documented edge-rule interpretations.
- Pure strictly typed engine: deterministic 2–6 seat setup, physical faction pairing, finite supplies, six actions and activation limits, passing/reactions, colonization, trade, upkeep, bankruptcy, influence, rotated connections, movement/pinning, research, structures, blueprint installation order, discoveries and ancient parts.
- Persisted tactical choices: Draco's optional second draw, discovery rewards, immediate ancient-part installation/storage, resource/population returns, diplomacy during turns and at combat end, initiative order, dice allocation, retreat, reputation, bombardment, control and bankruptcy. Failed commands leave the input unchanged.
- Complete combat/round flow: missiles, initiative, neutral allocation, stalemates, delayed retreats, antimatter splitting, faction reputation capacities, bombardment/aftermath, betrayal, elimination, cleanup and final scoring after round eight.
- Isolated versioned Convex guest/match/ownership/journal/AI-job tables. Credentials are server-issued and stored only as hashes server-side. Commands validate seat ownership, revision, unique ID, legality and decision ownership atomically; duplicate requests recover their original receipt. Views exclude opponent private tiles, deck order and game RNG.
- Normal AI uses the same PlayerView and commands as humans, bounded public candidates, predicted public outcomes and independently seeded Monte Carlo combat estimates. Scheduled jobs execute one command at a time with revision checks, durable failure status and explicit retry; errors never silently turn into passes.
- Desktop board: readable resources and projected upkeep, draft cost/shortfall previews, zoom/pan, wormholes, numbered ownership/fleet markers, one sector inspector, exact research explanations, enemy blueprint comparison, editable blueprint drafts, manual tactical decisions, animation skipping, offline submission guards, autosave and resume.

## Final automated gates

| Gate | Result / evidence |
| --- | --- |
| Memory-bounded game suite | `npm run test:second-dawn`: **246 tests passed in 37 files**, one worker |
| Local launcher preservation | `npm run test:second-dawn:local`: **2 passed** |
| Screenshot checker protection | `npm run test:second-dawn:visual-checker`: **2 passed**, verifies changed/missing renders cannot overwrite baselines |
| Legacy regressions | **8 passed** in `local_startup.spec.tsx` and `eclipse_demo_navigation.spec.tsx`; tests target the retained legacy route |
| Production build | Passed: Convex codegen, application TypeScript, strict domain TypeScript, Vite |
| Changed-code lint | Passed, including new domain, server adapters, client, tests and tools |
| Repository-wide lint | Existing **88 errors / 12 warnings** remain; unrelated debt was not rewritten |
| Deterministic screenshots | `npm run test:second-dawn:visual`: **21 / 21** match reviewed baseline copies; all document overflow checks false |

Logs are under `coding_agents/logs/second_dawn_verified*`, plus `second_dawn_reviewed_baseline_check.out`. The full legacy repository test suite was not run, consistent with the memory constraint.

## Full-match correctness and AI evidence

- Five seeded matches complete at every supported player count.
- Twelve further matches cover every alien and Terran faction side, counts 2–6, and base warp portals on/off. Every command checks exact population, influence, reputation, sector, technology, discovery and ship conservation. Full replay reproduces each state; illegal command probes leave input unchanged.
- Independent targeted review caught and corrected influence-disc transfers, ancient-part relocation, activation limits, full population tracks, advanced gray-square restrictions, reputation capacities and per-engagement initiative choices.
- Normal AI won **8 of 8** paired matches against the documented simple random legal-action baseline, with faction/controller seat swaps. See `second_dawn_ai_benchmark.json`. This small fixed benchmark is not a general strength guarantee.
- Actual local Convex matches finished with **3 seats (337 accepted revisions)** and **6 seats (787 revisions)**, using a human seat driven by an agent test controller and scheduled server AI. The journal covers all six actions, tactical decisions and scoring; duplicate receipts were verified. See `second_dawn_live/results.json`. These are not claimed as human playtests.

## Persistence and browser evidence

`second_dawn_live/browser-resume.json` records real guest creation, reload/resume, disabled offline submission, a reconnected accepted command, unchanged outstanding exploration after reload, and zero page errors.

`second_dawn_live/local-restart.json` records stopping and restarting both backend and Vite, then restoring the same saved match and exact outstanding exploration choice. Original configuration hashes/modes remained unchanged. Credentials are retained only in ignored local verification data with restrictive permissions.

The independent browser records cover **19 task workflows** through the actual isolated command processor: exploration, upkeep prediction, enemy comparison, upgrade, hit allocation, retreat, pinning explanation, scoring, research, build, move, paired influence, colonization, trade, pass, end action, upkeep confirmation, diplomacy finish, and offer/accept. See `second_dawn_gameplay_screenshots/independent-walkthrough.json` and `action-workflows.json`. Search durations are automation execution times, with source-informed selectors and script corrections documented separately—not human search-time measurements.

## Visual review and baselines

Actual engine fixtures were rendered at **1366×768, 1440×900, and 1920×1080** for opening, midgame, late game, research, blueprint editing, combat and scoring. Two independent agents inspected rendered images and requested corrections. Resolved findings include galaxy scale, roster clipping, contextual action panels, editor confirmation visibility, exact research affordability/effects, combat target defenses and hit/miss explanations, internal identifiers and final standings.

Additional enlarged-text and keyboard-focus checks verified 150% HTML text, visible focus and non-color ownership identifiers. Evidence and limitations are in `second_dawn_independent_render_review.md` and `second_dawn_independent_visual_review.md`.

After review, immutable baseline copies were established in `second_dawn_visual_baseline/` with a source/review/hash manifest. The visual test writes actual renders separately and fails on differences; it never replaces reviewed copies automatically. No human playtest or claim of subjective attractiveness certification is made.

## Scope and deployment

Expansions, phone layouts and a scripted tutorial remain deferred. Named player profiles now support cross-device recovery using an optional PIN or private recovery code; existing guest saves remain valid. Solo rooms wait indefinitely for their human. The subsequent multiplayer request is implemented: shareable rooms, visual faction choices, ready states, host start, and 30-second to 48-hour timers with temporary Normal AI takeover. Controller identity remains separate from faction and seat ownership.

The current site is deployed on Vercel at https://eclipse-rougelike.vercel.app/ using Convex development `ideal-nightingale-55`, as requested. Legacy deployment data and solo guest saves are preserved. Deployment and verification records are under `coding_agents/`.

### 2026-09-07 — player feedback release published
Owned research and visual science pricing; persistent public action history; current and next-action upkeep; visual trade; atomic conversion+research/build; direct ordinary turn buttons; quieter sector numbers/stronger territory colors; build-order popup; ship-first movement with highlighted legal routes are live at the usual Vercel alias, using Convex development `ideal-nightingale-55`. 353 tests/69 files pass, changed lint/build pass, reviewed21-image v4 baseline matches, and eleven action browser walkthroughs pass. Live creation/resume/reconnect, AI history, warned research preview, saved converted Dreadnought build and one-click End action pass. Release ID `dpl_4tDfpFgDE7rgszuvAYwcGCnWAN8w`. Validation details and inherited whole-repo lint debt (88 errors/12 warnings) in deployment/review docs.
### 2026-09-07 — multiplayer and faction setup published

Shareable room URLs, visual faction boards/effects, ready/host start, optional AI, and 30-second–48-hour turn clocks are deployed. Temporary timeout AI retains human ownership, resolves chained decisions, and records visible takeover history. Production two-browser and solo compatibility walkthroughs pass. The focused suite passes 398 tests/79 files; a reproducible two-human timeout match completes in 197 commands. Deployment `dpl_3YnyGXqvAzCUAcEK4rLfwAVNwejx` uses development Convex `ideal-nightingale-55`. Full evidence and remaining scope: `second_dawn_multiplayer_release.md`.
