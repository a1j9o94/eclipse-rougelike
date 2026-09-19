# Shared history undo — backend implementation

## Outcome

A room host can recover from a mistaken action by choosing its history entry and returning to the position immediately before it. Every other active human must agree; AI seats agree implicitly, so solo recovery is immediate.

## Acceptance criteria

- Identity and current host authority checked server-side; strangers cannot inspect consent or vote.
- Every newly accepted human, ordinary AI, and timeout-AI command saves its full pre-command snapshot privately.
- Old history without checkpoints shows an unavailable reason. Resignations are authority boundaries and cannot be undone.
- Vote state survives refresh. Commands, AI leases, and room timeout/retry paths pause while consent is pending.
- Restore preserves RNG, deck order, pending decisions, and full rules state; revision alone advances monotonically.
- Refusal/cancellation resumes the current position and preserves remaining timer allowance, excluding time spent voting.
- Journal entries remain immutable; a lightweight applied-rollback range marks superseded actions in public history.
- History contains proposal/resolution and resignation control transitions, so pagination has no missing revision gaps.
- A departing room host transfers hosting to a remaining human.

## Decision log

- Added `eclipseRollbacksV1`, optional match `rollbackPendingId`, optional journal `preSnapshotJson` and `supersededAtRevision`. Existing saves require no destructive migration.
- Public API: `getRollbackStatus`, `requestRollback`, `respondRollback`, `cancelRollback`. Explicit shared DTOs live in `shared/eclipse/rollback.ts`. Public responses contain consent metadata only, never snapshots, RNG, deck contents, credentials, or guest IDs.
- A request advances revision without altering game rules state. Applying the rewind advances revision again. This invalidates disconnected drafts and already-dispatched AI work, including when a request is later refused.
- Requests are idempotent on requesting seat + expected revision + target revision. Votes/cancellation are idempotent on proposal ID. Existing command IDs keep their original receipt even after their action is superseded; they cannot replay the old action.
- Required voters are all other non-eliminated human seats at request time. AI never blocks agreement. Resignation is blocked during a vote, avoiding changing the electorate while consent is pending.
- Restoring across a player resignation is unavailable because game-state snapshots cannot safely restore identity authority. Subsequent game actions can still be undone by the new host.
- Applied ranges mark superseded history on projection instead of loading and rewriting every snapshot in a potentially long game. Rollback reads one target snapshot, keeping transaction size independent of the number of removed commands.
- Refusal/cancellation regenerates timer tokens and retains the pre-vote remaining allowance and timeout status. Applied rollback gives the restored decision a fresh turn timer.
- Finished scoring can be reopened by consent. An abandoned game cannot be reopened through rollback.
- Consent cannot erase information that players already saw. The UI must disclose that later actions will be superseded and previously seen hidden results cannot be unseen; the engine restores the original RNG/decks rather than rerolling them.

## Tests and verification

TDD: first six behavioral tests failed before the API/table existed. Two later regression tests failed for missing host transfer and the room-retry pause message, then passed with implementation.

`src/__tests__/second_dawn_rollback_convex.spec.ts`: 11 passing scenarios cover:

1. Exact interrupted exploration checkpoint and private deck restoration; contiguous audit history.
2. Three-human unanimous consent, repeated approval, and actual AI-command checkpointing.
3. Reopening scoring; rejecting superseded targets and resignation-crossing requests.
4. Timeout-command checkpointing and old lease rejection while voting.
5. Host resignation transfer and successor recovery authority.
6. Solo restore, monotonic revisions, superseded audit, duplicate receipt, stale command rejection.
7. Host-only requests, human vote requirement, paused commands and stale jobs.
8. Unauthorized reads/votes and private projection filtering.
9. Refusal without rewind; timer allowance preserved across 100 seconds of voting.
10. Request/cancel retry idempotency and host-only cancellation.
11. Honest unavailability of legacy rows without checkpoints.

`second_dawn_rollback_convex` + `second_dawn_resign_match`: 17 passing tests after host transfer. Earlier combined transport/room/solo regression batch passed 28 tests before the final three rollback scenarios were added. Convex TypeScript and targeted ESLint passed; root integration owns final full lint/build and browser UX checks.

## Risks & rollback

Full private snapshots increase journal storage, intentionally trading storage for reliable recovery. Never expose raw journal rows through public queries. No existing checkpoint is synthesized from incomplete public history. Reverting the feature should retain optional schema fields and old audit rows, then disable proposal creation; deleting checkpoints is unnecessary.

## Follow-ups

Root integrates host history buttons, persistent consent dialog, settings entry, and browser verification. Newcomer criterion: identify the mistaken action and recover without understanding internal revisions. Expert criterion: inspect the chosen historical action and obtain explicit agreement before shared state changes. Human playtest evidence is separate from the backend tests above.

## Independent integration review

`second_dawn_game_recovery_integration.spec.tsx` adds six real-hook/component tests with Convex transport mocks: save-home performs no mutation; solo quit waits for its server result; host request forwards exact target/current revisions only after confirmation; pending vote can be hidden and reopened; both approval and rejection call the correct endpoint; server errors keep recovery available and offline controls disable submission. The final scenario exposed a real stale-operation bug: changing games while resignation was outstanding kept the new game busy and allowed the old completion to navigate it home. Root fixed callbacks and request state to the credential/match scope; all six now pass.

`second_dawn_history_rollback_cache.spec.tsx` adds two passing regression cases: previously loaded older history is discarded when rollback changes the epoch, and an outstanding pre-rollback page cannot reintroduce obsolete availability metadata.

`tools/second-dawn-recovery-review.mjs` renders the actual HistoryPanel, GameMenuPanel and RollbackDialog in a standalone React harness, with global game CSS and the production sibling relationship between board and dialogs. It checks desktop (1440×900) and mobile (390×844) in Chromium and WebKit: save-home, cancelled quit, exact history target, host request, waiting state, reopened voter decision, rejection, keyboard focus containment, no horizontal page overflow, and no browser errors. Callbacks in this harness are local fixtures; it is visual/component evidence, not live Convex integration.

Visual review caught a second integration defect: dialogs mounted beside the board did not inherit its visual root, so controls fell back to browser styling. Root added the shared root and explicit backdrop/banner styles. Reviewed corrected desktop request, mobile vote, and mobile quit screenshots: text wraps within the panel, the close action is visible, confirmation buttons fit without clipping, and the dialog has the established dark/brass treatment. Final captures and results are under `coding_agents/second_dawn_recovery_review/`. The root agent owns live two-human consent testing against the development deployment and final release gates.
