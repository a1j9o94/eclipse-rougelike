# AI pacing backend — 2026-09-08

Outcome: players have time to see each computer command and its board effect before the next computer command arrives.

Acceptance criteria:

- Ordinary AI decisions, including the first after a human turn and failure retries, are scheduled at least 1,200 milliseconds later.
- Chained timeout-takeover decisions use the same delay while the expired human seat remains locked.
- Human deadlines remain unchanged; the first timeout decision still occurs at the existing deadline.
- Revision checks, durable failure status, and authorized retries preserve existing behavior.

## Implementation

`shared/eclipse/pacing.ts` exports the typed `AI_DECISION_DELAY_MS` constant. `convex/eclipseMatches.ts` uses it in the common `scheduleAi` path. `convex/eclipseRooms.ts` uses it for chained takeover decisions and takeover retries. No schema, identity, settings, AI evaluation, command, or turn-deadline changes.

Scheduling is authoritative and persists in Convex. The delay is a minimum; normal server scheduling or network delivery can take longer. Reconnecting still loads the authoritative current state. Presentation does not drive command legality or scheduling.

## Verification

Three new behavioral tests in `second_dawn_ai_pacing_convex.spec.ts` first failed against immediate scheduling. They inspect persisted scheduled timestamps and advance the fake clock through 1,199 milliseconds and then 1,200 milliseconds, verifying actual state revisions before and after delivery. Coverage includes first/subsequent normal decisions, failed-job recovery, stale schedules, chained timeout decisions, and rejection of human submissions during the timeout pause. Floating-point timestamp round trips are compared at sub-millisecond precision.

The bounded pacing, match adapter, room adapter, solo-room, and multiplayer-completion batch passes 19 tests. Scoped lint and production build pass. Evidence logs: `coding_agents/logs/second_dawn_ai_pacing_red.out`, `second_dawn_ai_pacing_green.out`, `second_dawn_ai_pacing_lint.out`, and `second_dawn_ai_pacing_build.out`.

## Script timing and rollback

Existing tests that invoke internal jobs explicitly remain fast and retain revision/error guards. They do not assert production elapsed time. The multiplayer browser script's 100-second timeout budget covers a 30-second deadline plus up to 32 paced takeover commands (38.4 seconds). The live full-match integration script currently caps each match at 240 seconds; full six-seat games may now exceed that cap and need a longer observation budget, approximately 1.2 seconds per ordinary AI command plus processing/network time. No script deadlines were modified in this backend slice.

Rollback is changing the single shared delay constant; no persisted-data migration is needed. Supervisor owns frontend narration/animations and deployment.
