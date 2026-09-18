# Local playtest baseline

Outcome: play the existing solo spaceship roguelike locally and inspect the current Eclipse board demos.

Acceptance: homepage uses the configured Convex connection; solo launch, combat and saved-run continuation work; demo URLs render with navigation; local server remains available. Isolated tests without a provider should also render safely.

Decision log:
- Work on `feature/local-playtest`, inherited from current main (b39a57c).
- Existing `.env.local` identifies a Convex deployment; do not deploy or seed it.
- User direction: retain the existing Convex connection. No opt-in flag or global backend disable. Detect actual provider availability in hooks. Roguelike backend modules remain archived as `.old_roguelike`; full legacy multiplayer restoration is outside this local demo repair.
- Eclipse pages currently render sample boards, not complete playable matches.
- Baseline lint: 89 errors, 12 warnings before edits. Do not conflate these with new regressions.
- Installed dependencies were incomplete; reinstall from lockfile.

Tests (must fail first): startup without a provider even with a configured URL; main entry rendering; preserve multiplayer availability with a provider; demo entry compilation and navigation.

Verification: focused single-worker tests, lint, local build without backend deployment, browser walkthrough including refresh/continue.

Risks and rollback: retain game rules and save keys; keep fixes isolated on branch. Roll back individual changes without deleting user saves. Remote backend stays unchanged.

Follow-ups: inspect full Eclipse integration gaps after user playtest; restore legacy multiplayer separately.

## 2026-09-07 — Verification after restart
- Branch: `feature/local-playtest`; all prior edits retained.
- Fixed demo JSX entry compilation and replaced browser-incompatible `require` in galaxy setup with an ESM import.
- Main app keeps Convex enabled using the existing URL; no extra environment flag. Removed environment debug dumps; hooks check provider presence.
- `npm run build`: passed, including Convex codegen and TypeScript.
- Focused tests: 18 passed across local startup, demo navigation, public rooms hook, and start page.
- Lint: 88 existing errors and 12 warnings (baseline 89 errors and 12 warnings); no all-suite test run due to memory constraints.
- Read-only configured Convex check: `queries/gameData:getFactionByName` succeeded and returned Terran Directorate. No deployment or seeding.
- Browser: homepage, tutorial launch, reload and saved-run continuation, combat completion and return to outpost, two-player board, six-player resizing, four guardians, and generic galaxy page passed without page errors.
- Local server: `npm run dev -- --host 127.0.0.1` at http://127.0.0.1:5173/.
- Board demos still use sample data; full match integration and existing lint debt remain follow-ups.

## 2026-09-06 — Session recovery
- Recovered existing uncommitted work on `main`; the planned feature branch has not been created.
- Restored dependencies with `npm ci`.
- Ran both focused test files: 3 tests passed, 2 failed.
- Remaining startup failure: a configured backend URL activates multiplayer queries without a Convex provider despite the explicit multiplayer opt-out.
- Remaining variable demo test failure: missing ResizeObserver in the test environment and react-hexgrid module resolution.
- The browser entry also still requires a Convex URL; offline entry rendering remains unfinished.
- No application code changed during recovery. Full lint/build and browser acceptance remain unverified in this resumed session.
