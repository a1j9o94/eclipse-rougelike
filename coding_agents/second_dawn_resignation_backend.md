# Quit/resign: persistent participation

## Outcome and acceptance

Players can permanently leave a run without being required to finish their current action or private decision. A solo run stops without fabricated scoring; an ongoing multiplayer game transfers the leaving player's seat to AI so the remaining players can continue. Returning to a departed game permits inspection but never commands.

Acceptance:
- One authenticated, revision-checked mutation with an idempotent receipt.
- Solo and last-human departures freeze AI jobs, timers, and pending state.
- Multiplayer AI inherits the existing position and pending choice; no extra resources, draws, or information are added.
- Existing saves retain their behavior when optional metadata is absent.
- Home summaries distinguish active participation, resignation, and abandonment.

## Decisions and API

`eclipseMatches.resignMatch({credential, matchId, commandId, expectedRevision})` returns either `{ok:true, revision, outcome:'resigned'|'abandoned', duplicate}` or a structured validation error.

Optional match `lifecycle:'abandoned'` freezes a run independently of the rules phase. Optional ownership `resignedAt` and `resignationOutcome` preserve departure across refresh and profile recovery. The player's ownership record remains solely for read access and archive listing. `MatchPlayerView` adds `participation`, `matchLifecycle`, `canResign`, and `resignOutcome`; `MatchSummary` adds `participation`. These TypeScript additions are optional for existing fixtures and older payloads.

When another human controller remains, the departing seat becomes an AI controller. When no other human remains, the run is abandoned. A closed room is retained; no source snapshot, history, reputation, or scoring data is deleted or manufactured. Multiplayer resignation does not extend another human's existing timer. AI inherits any pending private decision and proceeds through the existing bounded worker.

Lifecycle commands are stored in `eclipseMatchLifecycleV1`, an ordered journal with match, actor, command ID, expected revision, resulting revision, outcome, and timestamp. Its revisions share the game-command sequence. This avoids pretending resignation is a game-rules action and supports replay/control audits. Administrative rollback must not cross a resignation or regrant resigned ownership; the concurrent rollback implementation enforces this boundary. Ordinary and timeout game journal rows now retain an optional `preSnapshotJson` checkpoint for that separate feature.

Commands after abandonment return `GAME_FINISHED`; commands by a resigned owner return `NOT_A_SEAT`. Already-accepted resignation retries return their original result before stale revision checks. Cross-endpoint command-ID reuse is rejected. Resignation cannot proceed during an unresolved shared undo vote.

## Risks and rollback

The schema additions are optional or new tables. Existing deployments can read unchanged saves. Reverting frontend access is safe; do not revert server enforcement while any departed matches exist, since that would restore command access. In-flight AI work is invalidated by revision and lease reset; queued timer jobs see closed-room/lifecycle guards. The existing private view projector is retained, so former players can still see their own seat's private information but cannot inspect another player's private state.

## Validation

Six Convex behavioral tests failed first because no resignation endpoint existed, then passed after implementation:
- solo abandonment, identical retry, unchanged rules state except revision, persistent summary, command/retry lock;
- stolen, malformed, stale, and reused requests leave authoritative state unchanged;
- multiplayer private reputation choice transfers to AI and advances while other-player views remain filtered;
- resignation out of turn preserves the active human's timer;
- solo-room abandonment ignores stale AI work and timer synchronization;
- last multiplayer human departure freezes the run and stale lease failures cannot revive its job.

Tests: `src/__tests__/second_dawn_resign_match.spec.ts`.
Final combined lint/build and bounded regression batches are recorded by the supervisor after integration with the rollback work.

## Follow-ups

Frontend confirmation, archived listing, read-only board behavior, and newcomer desktop/mobile walkthrough are owned by the supervisor. Public history may later merge lifecycle journal entries into the scrolling game-action list; persisted lifecycle audit already exists independently.
