# Less Random mode — UI and persistence

## Outcome
Players can explicitly start a new solo game or room using Régis's Less Random rules and see the selected rules throughout that new game.

## Acceptance criteria
- Mode is optional and absent fields continue as standard for existing games.
- Solo and room setup explain the ten-round, open-tech, public-discovery/reputation, joker rules and lock warp portals off.
- Room and solo creation persist the selected mode into `createGame`.
- Round labels use the state mode instead of a fixed total.

## Risks & rollback
The mode is opt-in and only passed when a fresh match is created; removing the selector restores standard setup without touching stored snapshots.

## Test list
- [x] Room mode selector publishes a Less Random settings payload and disables warp portals.
- [x] Multiplayer settings validation accepts the mode and rejects incompatible warp portals.
- [x] Convex creation persists the mode into the snapshot.

## Decision Log
- `rulesMode` is optional for backwards compatibility; absence means `standard`.
- In Less Random setup, every Terran player chooses one distinct, unselected supported alien faction to ban; the lobby persists the choice before readiness.

## Follow-ups
- Integrated build and type checks passed; see less_random_validation.md for final release verification.
