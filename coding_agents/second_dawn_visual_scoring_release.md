# Visual scoring and a clear finish — 2026-09-18

## Outcome and decisions

A completed game opens final standings with Play again, Return home, and View final galaxy. Play again opens the existing faction/AI setup, with game creation only after Start game; Home clears both the room route and selected match. Completed saves remain available under collapsed Completed games history instead of filling the active list. See [launcher validation](second_dawn_finished_game_navigation.md).

Public and final scores use faction emblems, rank badges, large VP medallions, category contribution strips and clickable illustrated tiles. Each category retains public contributor inspection; reputation is face down and omitted from live totals, then revealed at final scoring. Authoritative frozen scores remain unchanged. Existing rankScores supplies resource tiebreaks and exact shared ranks/winners.

Final scoring now opens once on entering the finished phase rather than forcing players back after every navigation. A pending mobile activity recap cannot override that landing screen. Read-only final galaxy inspection shows sector/fleet/planet details without exposing build or movement controls.

## Validation and fixes

- Three visual-score behavioral tests failed before implementation: explicit exit callbacks/final map, public visual cards/private reputation, final totals/shared victory. They pass after implementation.
- Added failing regression for a completed mobile match with unread recap; fixed phase-aware recap navigation. Updated revealed-reputation inspector copy.
- Added failing final-sector inspection regression; read-only final map now exposes planet details and suppresses action controls.
- Full memory-bounded suite before final review fixes: 602 tests / 122 files passed. Final integrated gates are recorded in the combined release record.
- Browser review at 1366×768, 1440×900, 1920×1080 and 390×844 covers final controls, public/private reputation, contribution inspection and final-map navigation. Screenshots and results: [score review](second_dawn_score_review/results.json).
- Browser testing found the mobile header covered the old score/history dialog Close button. The modal now uses a backdrop above mobile chrome and a readable responsive width; the same browser workflow passes.
- Screenshots reviewed for readable category tiles, distinctive faction ownership, final VP/winner emphasis, visible exits and scrolling on narrow screens. The sidebar now explains score inspection instead of showing an unrelated action preview.
- Automated/browser evidence is separate from physical-device or human playtest evidence; neither is claimed here.

## Risks and rollback

No rule, RNG, Convex schema, scores or saved-game records change. UI changes can be reverted without data migration. Main-only Git-triggered Vercel release remains required. Follow up with user playtesting of whether the symbols and point sources are easy to read during and after a full match.
