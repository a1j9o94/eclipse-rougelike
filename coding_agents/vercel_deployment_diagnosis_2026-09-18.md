# Vercel deployment diagnosis — September 18, 2026

## Outcome and acceptance
Update this machine to remote main and distinguish missing Git triggers, queued builds, build failures, and misleading GitHub statuses. Preserve the working production site, main-only deployment policy, and development Convex backend. No gameplay changes or speculative deployment changes; repair any cross-platform import collision found by the local verification.

## Local update
Fast-forwarded main from ca764d4 to c4a4c860; fetched all remote branches and ran npm ci. No local changes needed stashing. Vercel project prj_XksTjEscLwx59bUY29CUuQEQVAhA in obleton-adrian is linked to the expected GitHub repo and main.

## Confirmed finding 1: two projects overwrite the same GitHub status
GitHub's raw commit statuses (not just its combined status) show two distinct Vercel workspaces posting `Vercel – eclipse-rougelike`:

- Intended site: https://vercel.com/obleton-adrian/eclipse-rougelike
- Second copy: https://vercel.com/adrianobleton-7222s-projects/eclipse-rougelike

For dd39f12 the intended project reported success at 21:15:02 UTC, then the second copy reported failure at 21:51:34 UTC. For 793da74 success at 21:47:08 was overwritten by the other project's failure at 21:51:43. Thus a red combined status did not mean the live site had failed.

Latest c4a4c86: second project failed at 21:52:29, intended project succeeded at 22:00:02. Production deployment dpl_HnjDPoypjz9jMmBEsRPmEezdWLzg is Ready, source git, ref main, exact latest SHA, with the public alias attached.

The current authenticated Vercel account can access obleton-adrian but gets HTTP403 for the other workspace. Its project cannot be inspected/disconnected through this login. If obsolete, disconnect its repository under Project Settings > Git; do not delete the intended project or globally uninstall Vercel's GitHub integration. If intentional, give that project a distinct name so statuses are distinguishable, and review its failures separately. Ownership/use clarification requested from user.

## Confirmed finding 2: substantial time before build execution
Measured using deployment createdAt, buildingAt, ready and timestamped build logs. UTC throughout:

| Commit | Deployment created | Build started | Ready | Pre-build wait | Build to Ready |
|---|---|---|---|---|---|
| fd59535 | 19:37:19 | 19:37:20 | 19:38:12 | 1s | 52s |
| 47aee89 | 19:40:31 | 19:40:32 | 19:41:50 | 1s | 78s |
| dd39f12 | 21:08:49 | 21:14:10 | 21:14:55 | 5m20s | 46s |
| ca9cec1 | 21:28:03 | 21:43:35 | 21:45:17 | 15m32s | 103s |
| 793da74 | 21:34:17 | 21:45:23 | 21:47:07 | 11m06s | 104s |
| c4a4c86 | 21:39:10 | 21:57:53 | 22:00:01 | 18m43s | 128s |

The latest build spent about 27s cloning, 27s installing, 45s checking TypeScript and 13s in Vite. This cannot account for its 18m43s pre-build wait. GitHub status updates were also delayed at times (e.g. ca9cec1 was ready21:45:17 but status success arrived21:56:29). Commit creation timestamps alone are not proof of push delivery time.

The team is Hobby (one concurrent build per official documentation). Some builds executed sequentially, but no other project deployments were found in the queried team interval. Completed deployment metadata no longer records the historical queue reason. A fresh direct fetch of the official incident feed (the initially returned search snapshot was stale) confirms two overlapping Vercel incidents: Elevated Errors Triggering Deployments, 20:32–21:22 UTC (https://www.vercel-status.com/incidents/bwkmw4hmrgmk), and Deployment stuck in initializing state, 21:36–22:31 UTC (https://www.vercel-status.com/incidents/5c1lswm68bkg). Both are resolved. These match the trigger delays and pre-build initialization waits; the latter directly overlaps the latest deployment. This is strong evidence of a provider-side delay, although per-deployment internal tracing is unavailable. No paid upgrade or Git reconnection is warranted by this evidence.

The earlier document ux_deployment_recovery.md inferred Convex caused the pending release. Actual dd39f12 logs show Convex publishing completed in about6s, after the pre-build delay. Frontend-only builds still waited11–19min. Keeping frontend builds independent is reasonable, but the logs do not support Convex as the principal cause of these delays.

## Configuration verified
- Git deploymentEnabled: ** false, main true.
- Project ignored build command exits1 for main (build), exits0 otherwise (skip); correct semantics.
- Dashboard and repository build command: npm run build:vercel (frontend only).
- No GitHub Actions workflows blocking Vercel.
- Latest actual logs confirm frontend-only build and successful deployment.
- Browser smoke: HTTP200, New game visible, no page errors, frontend points to ideal-nightingale-55.convex.cloud.

## Follow-up without speculative changes
1. Resolve the second project integration once ownership/use is confirmed and accessible.
2. For a future long pending deployment, inspect the intended project's current queue reason while it is still queued, plus the team's concurrent builds; completed metadata is insufficient.
3. If lengthy initialization repeats with no active competing build, provide Vercel support the deployment IDs and UTC timing table above. No support message was sent.
4. Do not trigger repeated redeployments or reconnect a functioning integration merely because GitHub shows the second project's failure.

References: https://vercel.com/docs/builds/build-queues ; https://www.vercel-status.com/ . Evidence fetched through authenticated Vercel deployment APIs/CLI and GitHub raw commit statuses; local logs in coding_agents/logs/deploy_debug_*.out are ignored.

## Local verification and repairs
- npm ci succeeded; release guard/configuration tests:10 passed.
- Fresh bounded game suite initially:558 passed /6 failed. Two failures and local TS1261 build failure came from case-insensitive resolution of FleetInspection.tsx versus fleetInspection.ts. Renamed the pure helper to fleetInspectionModel.ts and updated its imports; no rule/UI behavior changed. Both previously failing fleet/spatial tests now pass.
- Remaining four failures were stale navigation selectors after the other-device action-first UI change. Updated only test selectors (Done moving, Pass for this round, Upgrade), preserving submission/confirmation/offline/draft assertions;4 targeted tests pass.
- Full npm run build now passes on this Mac. Changed-file lint passes; repo-wide lint retains88 errors/12 warnings.
- These repairs and this report were left local during the diagnostic task, then included in the subsequently authorized combat-flow release.
- Final full bounded game rerun:564 tests /113 files passed in69.78s (deploy_debug_tests_fixed.out).
