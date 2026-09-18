# Direct combat and visible casualties — 2026-09-18

## Player outcome
Combat opens with Roll dice and Retreat above the fleet details and remains visible while opponents resolve their firing decisions. Rolling submits immediately. Retreat opens legal destination cards; choosing a card declares the route without another confirmation. Forced retreats show routes directly and never offer firing. Offline/busy guards prevent submission; manual hit allocation and firing-order choices remain intact.

Destroyed ships receive persistent visual cards with silhouettes, faction, HP loss, a destruction mark, and a restrained impact animation. Loss results appear before the next decision, including reputation after the last enemy dies. Dismissal is optional. Motion skipping and reduced-motion preferences are honored. Independent review caught a final-loss edge at automatic round cleanup; a regression test now preserves the last battle into the next round. The latest resolved volley is retained through journal entries that do not contain a volley; historical events are matched to the active battle ID, with a conservative fallback for older views.

The authoritative public event now stores optional casualty shipType/owner and the public battle view exposes optional id. Existing saves/history remain compatible, using known public ship identities when available or honest generic fallback otherwise. No combat rules, probabilities, costs, or private information change.

## Validation
- Tests first: direct firing/retreat, disconnected/busy/forced-retreat guards, retained history and final casualty, player and Ancient target identity in projected history.
- Full bounded suite:581 tests across116 files passed.
- Final focused combat tests and release-configuration tests passed.
- npm run build passed on this Mac, including TypeScript and Vite; changed-code ESLint clean. Full-repo lint remains88 errors/12 warnings inherited from existing code.
- Real browser fixture walkthroughs at1366×768,1440×900,390×844: one-click roll accepted exactly one command; destination click accepted exactly one retreat; final Interceptor destruction visible without scrolling; no page errors.
- Reviewed rendered desktop/mobile images. Initial result placement below reputation hid the casualty on phones; revised to display losses above the next decision. Confirmed readable silhouette/name/faction/destruction mark in final captures.
- Screenshots/results: second_dawn_combat_flow_review/. Repeatable runner: tools/second-dawn-combat-flow-review.mjs. These are agent reviews, not new human playtest claims.

## Release
- Additive backend published successfully to existing development deployment ideal-nightingale-55 using explicit --deployment-name; read-only invalid-guest smoke returned[]. No game data recreated.
- Frontend release uses Git push to main only. Inspect raw GitHub commit statuses after this push to determine whether the reinstalled Vercel app still triggers the former employer's duplicate workspace.
- Also includes the previously validated local Mac import-collision repair (fleetInspectionModel.ts) and stale UI test selector updates from the diagnostic task.
- Rollback: revert frontend change or promote previous Ready deployment; additive optional backend metadata need not be rolled back.

## Main push and renewed Git connection
- Combat commit e74fecc was merged/pushed to main after validation. Final focused combat batch:16 passed after the581-test full batch, and final build/scoped lint passed.
- The first push after the user reinstalled Vercel's GitHub App produced no deployment or commit status in either workspace during the initial observation window. Existing current-project link still reported connected.
- Refreshed only the intended obleton-adrian/eclipse-rougelike project's Git connection via disconnect/connect to the same GitHub repository; both operations succeeded. Project/domain/environment settings were preserved. This documentation commit provides a fresh Git push to test the renewed connection. No direct CLI frontend deployment was used.
