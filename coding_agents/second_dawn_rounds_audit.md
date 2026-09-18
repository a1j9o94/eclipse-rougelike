# Second Dawn round continuation audit

Outcome: complete combat aftermath, keep upkeep choices resumable, and reach final scoring after round eight without repeated rolls or production.

Primary source: [publisher rulebook pp21–25](https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=1), with p26 Planta exception and p30 discovery-owner fallback. Implementation: `shared/eclipse/rounds.ts`; fixtures: `second_dawn_rounds.spec.ts`.

- After all battles: process attacks on population, control offers, discoveries, then repairs. Sector processing uses descending tile IDs (p30 FAQ) and persisted per-stage processed IDs.
- Bombardment rolls each surviving ship's cannons once. Missiles do not fire at population. Shields are zero, computers apply, blank misses and burst hits. Damage chooses population squares, including orbitals. Destroyed cubes go to graveyards, not tracks before upkeep. Planta population destruction happens **at the end of combat**, not on enemy movement.
- Neutral-occupied discoveries remain inaccessible, including Draco/Ancient coexistence. Surviving player ships claim ahead of a surviving enemy sector controller; control is fallback only if no player ship remains (p30). Discovery flag/private assignment are consumed when the persisted choice is queued.
- Upkeep waits for each living seat's explicit `finish-upkeep` command, allowing colony ships and trades beforehand. Income and upkeep are netted once, then science/materials produced. Bankruptcy persists; abandonment changes population tracks/income and is re-evaluated after cube-return decisions. Root permits trading while a bankruptcy choice is open.
- Elimination saves that seat's score before removing its board presence, including the no-ships/no-sectors case after combat. Remaining seats continue the eight-round game.
- Cleanup replenishes five through nine regular technologies by original player count; rare draws enter the market without consuming quota. Action discs return, graveyard cubes return (with full-track choice), colony ships refresh and first passer starts the next round. Cleanup pauses/resumes without repeating replenishment.
- After eighth upkeep final scoring is computed without an unused technology refill or an extra ninth round. Eliminated scores remain frozen; final resources provide the publisher tiebreak.

Validation: the first six behavioral tests failed before the module existed, then passed after implementation. Four further regressions cover rare-tech refill, interrupted cleanup, discovery priority/consumption and invalid bombardment allocation. Ten focused tests pass; changed-file ESLint is clean. Repository-wide build/type gates are coordinated by root; concurrent unrelated type errors are reported separately.

Integration contract: caller clears the resolved pending decision, calls `resolveAftermathChoice`, then calls `advanceRound` after any newly queued population returns are resolved. `advanceRound` never consumes an outstanding choice. `finishUpkeep` validates seat ownership/phase; `upkeep-payment:<seat>` marks an already committed upkeep awaiting bankruptcy recovery. `engine.aftermathDone` also makes cleanup resumable. Main command processor supplies copy-on-command atomicity.

## End-of-combat diplomacy window

Publisher p15 explicitly permits proposing relations at any time during the player's turn or at the end of Combat. A persisted `diplomacy-window` now runs after combat aftermath and before any upkeep commitment in matches starting with four or more seats. Each living eligible player may offer repeatedly or finish; a pending standard response suspends the window. Completing all eligible windows permits upkeep. `diplomacyDone` and declined-pair metadata reset during cleanup.

`validateDiplomacy` and `eligibleDiplomacyPartners` share the existing physical ambassador limits, faction reputation-track capacities, population availability, complete wormhole/warp connections (never Wormhole Generator), traitor and enemy-presence restrictions. Window eligibility includes players who can make room by returning reputation. Offers may wait while either player returns reputation; acceptance revalidates actual space. Root's engine/protocol changes allow reputation returns during these decisions and out of turn. Declined partner IDs are exposed only to guide AI away from repeated rejected offers; human retry remains legal.

Seven focused regressions cover persisted offer/decline/resume, finishing all windows, enemy presence, potential reputation space, offeree reputation return and exact-once acceptance, retry without duplicate decisions, and diplomacy between action activations. These were implemented after the initial four failing tests demonstrated the missing phase and helper behavior. The full-match suite is rerun because a new mandatory phase can affect AI scheduling and termination.

Validation result: all seven diplomacy-window regressions, ten round tests and five seeded full-match tests (every supported player count2–6) pass after the AI declined-partner fix. Strict application TypeScript and changed-file ESLint pass. The first six-seat run exposed repeated declined offers; persisted decline metadata plus AI avoidance resolved that termination failure without removing the human's legal retry choice.
