# Second Dawn — deployed on Vercel, 2026-09-07

## Live destinations
- Public site: https://eclipse-rougelike.vercel.app/
- Current interactive preview: https://eclipse-rougelike.vercel.app/#second-dawn-preview
- Backend: https://ideal-nightingale-55.convex.cloud (development, explicitly requested by user).
- Convex project: adrian-obleton/eclipse-rougelike.
- Vercel project: obleton-adrian/eclipse-rougelike.
- Ready deployment: eclipse-rougelike-mseo1svt9-obleton-adrian.vercel.app,
  ID dpl_3c5VYFDbJ31rBrnPeCDSdLyswe73.
- The shorter public alias is accessible without Vercel authentication. The
  team-scoped alias retains its existing Vercel login protection.

## Release configuration
`vercel.json` uses Vite, `npm ci`, `npm run build:vercel`, and `dist`.
`build:vercel` runs application/domain TypeScript and Vite against generated Convex
bindings. Backend publishing is separate, explicitly targeting development; this
avoids the old Vercel production deploy key redirecting a build to production.
Vercel Production environment selectors are now:

```
VITE_CONVEX_URL=https://ideal-nightingale-55.convex.cloud
CONVEX_DEPLOYMENT=dev:ideal-nightingale-55
```

The existing production key remains in Vercel's secret store for rollback; this
frontend build does not read it or invoke Convex CLI. No secret was committed or
included in upload. `.env*`, `.second-dawn`, `.git`, generated validation artifacts
and dependencies are excluded by `.vercelignore`.

Backend was published with the authenticated CLI's supported `run --push` flow:

```
npx convex run --push --deployment-name ideal-nightingale-55 eclipseMatches:listMyMatches '{"credential":"deployment-smoke-check-invalid-guest"}'
vercel deploy --prod --yes --scope obleton-adrian
```

The post-push function is a read-only guest query with an invalid credential,
returning an empty list; it does not create matches or expose private state.
`convex dev --once` failed its login preflight despite valid account login/read
access; the authenticated explicit-deployment `run --push` succeeded. No access
control was disabled. Logs: `logs/second_dawn_cloud_development_deploy.out`,
`logs/second_dawn_vercel_deploy.out`,
`logs/second_dawn_vercel_preview_unification_deploy.out`.

## Verification
- Vercel reports Ready and the public alias serves the current release.
- Real browser created a three-seat game, reloaded/resumed it, rejected offline
  submission, reconnected, committed exploration, and restored the exact pending
  exploration decision after reload.
- A second real browser game passed the human turn; scheduled AI advanced the
  match to revision 18 without failure.
- No page errors. Report: `second_dawn_deployment_live/smoke.json`.
- Public preview route verified to render the current board with Gluon Computer
  +3 computer / −2 energy symbols. Screenshot: `second_dawn_deployment_live/preview-research.png`.
- 271 game tests passed; the subsequent preview-route red/green test batch (3)
  and build passed. 21 reviewed v2 screenshots match on a fresh capture.
- Changed code lint-clean; repository-wide inherited lint debt remains separate.

## Persistence and rollback
Production backend `greedy-mongoose-499` was not changed. Existing cloud tables
were preserved; versioned full-game tables/indexes were added on development.
Local guest saves are not automatically migrated to this origin/backend.
Previous Ready production deployment:
`https://eclipse-rougelike-ev2da3mq1-obleton-adrian.vercel.app`.
Frontend rollback is separate from a compatible backend function rollback; do not
remove match tables. Work is deployed from the feature-branch working tree, not
committed/merged to GitHub during this release.

`vercel link` automatically overwrote `.env.local` with downloaded development
variables. The original known Convex selectors were restored immediately; its URL
was then deliberately aligned to the user's selected development backend. Local
configuration is ignored by Git. The anonymous launcher still uses its isolated
configuration and can be started with `npm run second-dawn:local`.

## Sources
- https://docs.convex.dev/cli/overview
- https://docs.convex.dev/production/hosting/vercel
- https://vercel.com/docs/cli/deploy


## Visual decision release — 2026-09-07

Deployed visual exploration placement, population cubes/advanced stars, and fully revealed discovery rewards to the existing public aliases. Backend remains the requested Convex development environment; this release changes no backend functions or schemas. Preview has real engine positions named `exploration` and `discovery`, rendered with the same components as saved matches.

Vercel Ready verified in `logs/second_dawn_choices_vercel_inspect.out`; build log `logs/second_dawn_choices_vercel_deploy.out`. Local verification: 290 tests across 49 files, production build and changed-code lint pass; inherited root lint remains 88 errors/12 warnings. Independent exploration review covers 36 rotation/fixture/viewport combinations. Three planet-inspector baseline changes were explicitly reviewed; the other 18 images remain identical.

Public preview discovery browser workflow passes at all three desktop sizes: visible item stats, native keyboard radio selection, unclipped confirmation, use opens the ancient part placement decision, keep adds exactly 2 public VP. Report: `second_dawn_discovery_workflow_review/results.json`. The live save/resume script initially matched both exploration headings after the UI rename; scoped it to the actual decision component and reran. Previous Ready frontend for rollback: `eclipse-rougelike-o5quvwf6d-obleton-adrian.vercel.app`.

The visual-choice release live save/resume rerun passed creation, reload, offline guard, reconnect, exact exploration recovery and AI progression to revision 9; no page errors. See `logs/second_dawn_choices_live_smoke.out` and the timestamped `second_dawn_deployment_live/smoke.json`. This completed the prior release before the subsequent stage-preview, visual fleet and blueprint-installation requests.


## Stage, fleet, and blueprint installation release — 2026-09-07

Latest Ready deployment: `eclipse-rougelike-mseo1svt9-obleton-adrian.vercel.app`, ID `dpl_3c5VYFDbJ31rBrnPeCDSdLyswe73`; same public aliases and Convex development backend. Prior compatible frontend: `eclipse-rougelike-mje7c85cd-obleton-adrian.vercel.app`.

Published visible game-stage shortcuts and direct `?position=...#second-dawn-preview` links, real Ancient encounter fixtures, visual battle fleet groups, sector fleet images/counts, and discovered-part installation with actual blueprint/replacement preview. Fixed combat and installation confirmation clipping at 1366, retained all four interceptor slots and six planet spaces, and removed misleading missile-stage Round 0 wording.

Verification: 301 tests across 53 files; 17 focused final integration tests; changed-code lint and production build pass. Repository lint still has inherited 88 errors/12 warnings. All 21 actual gameplay images independently reviewed; explicit v3 baseline preserves v2. Pixel comparison confirms 15 main areas unchanged below the 30px shortcut header; midgame inspector and combat are the six intended main-area changes.

Published browser checks pass: seven direct stage/Ancient links; all four installation ship classes with correct slot counts and illegal energy replacement disabled; actual installation and storage; visible four-slot loadout and confirmation across all three desktop sizes. Live guest creation, reload resume, offline guard, reconnect and exact pending exploration recovery pass, with scheduled AI reaching revision 18 and waiting normally. No page errors. Logs: `second_dawn_stages_live_review.out`, `second_dawn_stages_live_install.out`, `second_dawn_stages_live_smoke.out`, `second_dawn_stages_vercel_inspect.out` under `logs/`. Reports/images: `second_dawn_stage_live_review/`, `second_dawn_revision_screenshots/ancient-part-review.json`, `second_dawn_board_revision/review.md`.

## Economy and visual board actions release — 2026-09-07

Ready frontend: `https://eclipse-rougelike-mipngg11k-obleton-adrian.vercel.app`, deployment `dpl_4tDfpFgDE7rgszuvAYwcGCnWAN8w`, public alias `https://eclipse-rougelike.vercel.app`. Convex remains the requested development deployment `ideal-nightingale-55`; public history and atomic conversion/purchase functions were deployed first. No existing saves were deleted, and the frontend was deployed from the feature branch working tree. Previous compatible frontend remains the prior stage/fleet release above.

Changes: owned research tracks and single science-icon pricing; persistent public action history including AI and paged/reconnected entries; current/next-action upkeep and purchase balance forecasts; visual standalone resource exchange; warned atomic conversions for research and build; one-click ordinary End action/Pass/Finish upkeep with one explicit diplomacy-break warning; quiet sector IDs with stronger faction ownership fills; sector-based visual build popup with batch quantities; fleet selection followed by highlighted legal destinations and route confirmation.

Verification: 353 tests / 69 files pass in one-worker batches; changed-code ESLint and production build pass. Full repository lint retains 88 errors and 12 warnings outside the changed Second Dawn code. All 21 desktop gameplay renders were independently reviewed, with intentional v4 baseline and passing comparison. Additional Trade/History/Research/Build/Move browser images reviewed at 1366×768, 1440×900 and 1920×1080; root-font enlargement/focus checks recorded separately with their limitations. Fixed modal centering, stepper glyph alignment, and movement confirmation clipping. Eleven actual-engine action walkthroughs pass. Evidence is agent-operated, not a human usability study.

Live alias checks pass: creation, reload, offline submission guard, reconnect, exact pending exploration recovery, human/AI public history, and scheduled AI reaching revision 18. At all three sizes the public preview also passes warned money conversion, atomic research, the new owned tile, and public log. See `logs/second_dawn_feedback_*`, `second_dawn_deployment_live/smoke.json`, and `second_dawn_revision_screenshots/funding-review.json`. Live saved-game converted-build verification is recorded in the following result entry.

Live saved-game Build result: PASS. A new Eridani game built a Dreadnought using the displayed 12 money → 4 materials conversion, with materials 4 → 0 and money 26 → 14 in exactly revision 1. The ship was added, public history details identify it, reload preserved the revision, and End action submitted in one click. No page errors. See `second_dawn_deployment_live/funded-build.json` and `logs/second_dawn_feedback_live_build.out`. The smoke harness was corrected to explicitly select the sufficiently funded faction and expand the history Details disclosure; its first default-faction attempt correctly encountered the affordability guard.
