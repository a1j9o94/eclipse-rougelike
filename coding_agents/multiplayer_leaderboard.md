# Multiplayer leaderboard

## Outcome and public contract

The home page can show public multiplayer rating, games, wins, win percentage, and faction records. `eclipseLeaderboard.getLeaderboard({sort: 'rating' | 'wins' | 'win-rate'})` returns `{rows: LeaderboardRow[]}` from `shared/eclipse/ratings.ts`. The server ranks all statistics before selecting the top 100. `winRate` is a fraction from zero to one. Display names come from the player's current profile, with “Guest player” used until registration. No credentials, profile recovery data, snapshots, or reputation values are returned.

## Eligibility and scoring

- A game must be finished and have at least two distinct original guest owners in `eclipseOwnershipV1`. A solo game against computers is excluded, even if it used a room.
- Original ownership survives AI takeover and resignation; current controller type is not used to infer eligibility. Computer-only seats never receive ratings or statistics.
- Wins use the game's complete final ranking, including computer opponents. Existing VP and resource tie-break rules are reused; exact first-place ties count as shared wins. A computer winner does not grant the best human a win.
- Resigned players receive a loss. They rank below non-resigned humans in rating comparisons regardless of their AI successor's score; two resigned participants draw in their mutual comparison.
- Ratings start at 1000. For every human opponent, expected result is `1 / (1 + 10^((opponentRating - rating) / 400))`; actual result is 1, 0.5 or 0. The change is `round(32 × mean(actual - expected))`, using all pre-game rating values from the same atomic mutation. Averaging keeps six-player results from multiplying the adjustment size.

## Persistence and undo

`eclipsePlayerStatsV1` stores aggregate totals and indexed ordering. `eclipseRatingResultsV1` stores one immutable contribution per finished match: participant, faction, awarded rating delta, and win count. Ordinary human/AI command saves and timeout command saves record results in the same transaction as final scoring. A repeated save or backfill sees the existing ledger and does nothing.

An approved rollback subtracts that match's exact previously awarded contribution and removes its ledger. Other completed games' awards remain unchanged: **this deliberately does not rebuild later Elo history**. Finishing the restored match creates a new award using the then-current ratings. Pending or rejected rollback proposals leave results intact. Empty player/faction records are removed after reversal. Gameplay scoring is unchanged.

## Backfill and release

After deploying the Convex functions/schema, run the internal operator endpoint `eclipseLeaderboard:backfillPage` with `{}`. It returns `{nextCursor,isDone,examined,awarded}`. Repeat with `{cursor: nextCursor}` until `isDone` is true. Each mutation examines at most 25 finished matches (default 10), using the `by_phase_updated` index in ascending order. Legacy completion order is approximated by the persisted `updatedAt` timestamp; no historical rating promises predate this feature. Backfill is idempotent, safe to resume, and excludes abandoned/solo matches. It does not change snapshots.

## Validation and limits

New tests were introduced before the ratings and storage modules existed, and initially failed to resolve those missing implementations. The new suite covers Elo, ties/upsets, multiplayer eligibility after takeover, resignation, AI winners, profile lookup/privacy, idempotence, selective reversal after later results, server top-100 sorting, actual final upkeep submission, consented undo/re-finish, and a timeout worker's final payment.

The bounded ratings/leaderboard/rollback/resignation/room batch passed **35 tests across six files** (12 new tests). Changed-file ESLint, `tsc -b`, shared engine TypeScript and `git diff --check` passed. Root coordinates final full-repository lint/build and deployed verification. No new dependency or authentication flow. This is a simple public leaderboard, not a ranked matchmaking or anti-abuse system. Exact tie handling and no minimum-games filter are deliberate initial behavior.

## Release validation

Deployed schema/functions to development `ideal-nightingale-55` on 2026-09-19. Bounded backfill examined 14 completed matches in two pages and awarded 5 eligible multiplayer results; other matches remained excluded. No game snapshots were modified. Root also completed full-repository lint/build, leaderboard UI loading/empty/faction tests, and desktop/mobile visual review.
