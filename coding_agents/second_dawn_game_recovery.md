# Game recovery and clearer Influence

Outcome: players can safely leave or resign, claim a chosen sector without accidentally withdrawing, and agree to restore an earlier game state from History.

Acceptance: save/home preserves the run; quitting solo archives without false scoring; resigning multiplayer hands the seat permanently to AI. Influence starts from a map sector and distinguishes taking control from withdrawal with consequences. Host requests rollback before a chosen history action; all other active humans approve, AI agrees implicitly. Solo rollback is immediate. Pending votes survive refresh and pause commands/timers. Restore exact private state and randomness with monotonic revisions. Old actions without checkpoints are clearly unavailable.

Fail-first tests: menu confirmation/cancel/offline; saved-game archive; Influence selection and withdrawal; backend identity, stale/duplicate resignation; checkpoint privacy, rollback consent/rejection/cancellation and stale workers. Browser review covers desktop/mobile flows. Run bounded tests, lint and build.

Decisions: user selected room host as rollback requester and explicitly replaced direct value editing with consensual history rollback. No admin editor. Rollback cannot erase knowledge already revealed; include that fact in the request. Resignations are a rollback boundary to prevent restoring surrendered ownership.

Risks/rollback: snapshot storage grows per command. Retain old saves with unavailable historic checkpoints rather than inventing a past state. Keep immutable audit and monotonic revisions. Disable requests if necessary without removing existing match handlers.

## Integration results
- 110 targeted tests across 23 files pass in three bounded integration batches: 40 Convex/persistence, 31 UI/history/menu, 39 Influence/movement/combat. Additional agent batches and reviewed evidence are linked in the feature-specific audit documents.
- Real two-human Convex room walkthrough passed: desktop host request; mobile guest reload and approval; exact public resources/active turn restored at a higher revision; rejection keeps play; save/home preserves match; resignation hands seat to AI; last human quitting freezes without scoring. No page errors. Evidence: `second_dawn_game_recovery_live_review/`.
- Independent review found and fixed stale async resignation navigation and missing shared dialog styling. Browser-reviewed desktop/mobile recovery dialogs for focus, clipping and button hierarchy.
- User's additional playtest requests: preserved individual upgrade confirmation, added accepted-action summaries, persisted optional combat odds in setup/room/view, and added authoritative volley scenes while retaining manual human rolls. Estimator uses public data and bounded yielding work; it never changes legality or game randomness.
- Convex development backend updated with additive schema and validated types. No production backend or feature-branch frontend deployments.
