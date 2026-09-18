# Second Dawn implementation

## Outcome
Deliver the complete authoritative Second Dawn base game for one human and one to five fair AI seats, preserving legacy play and saves.

## Acceptance criteria
The supplied four delivery milestones and completion gates remain the definition of done. A prototype or partial rule engine does not satisfy game completion. Verify base rules against the publisher and Dized; never label illustrative fixtures as official setup.

## Work sequence
1. Audit rules/catalog and expose unresolved component data explicitly.
2. Build an isolated typed domain, deterministic random stream, immutable command validation, seat views, and resumable decisions.
3. Establish interactive desktop fixtures and inspect browser renders early.
4. Integrate versioned Convex guest credentials, snapshots and idempotent command journal.
5. Complete all rules, AI, UI workflows, and acceptance evidence.

## Tests (must fail before implementation)
- Seeded random replay, unbiased bounded sampling, invalid seeds/ranges.
- Rotated wormhole adjacency and pinning, including faction exceptions.
- Command ownership, stale revisions, duplicate IDs, atomic rejection, hidden-state filtering.
- Interactive fixture selection, readable upkeep, editable blueprint/combat drafts.
- Official setup/component conservation and faction fixtures as catalog verification permits.

## Risks and rollback
- Existing uncommitted local-playtest edits are user work. Preserve them; isolate new code. Branch: `feature/second-dawn-full-game`, inherited from `feature/local-playtest` at b39a57c.
- `git fetch -p` succeeded. Rebase skipped because the worktree is dirty and the fresh feature branch has no upstream.
- No production schema replacement or deployment-data migration. New storage must use isolated versioned tables.
- Existing lint/build debt must be distinguished from new failures. Run focused tests with one worker, never the full suite in one process.

## Decision log
- 2026-09-07: Existing rules are not an authoritative catalog. New domain lives in `shared/eclipse`.
- 2026-09-07: Parallel bounded rules audit and visual prototype follow the repository's Supervisor/Planning/Engine/Tests workflow. Root owns integration and shared engine boundaries.

## Follow-ups
All unverified rules and all unsatisfied completion gates remain open until backed by implementation and recorded evidence.

## Current result
The complete engine, guest match adapter, scheduled AI, and live desktop client are implemented. Current validation counts, live-server results, source caveats, reviewed screenshots, and startup instructions are maintained in [second_dawn_status.md](second_dawn_status.md). Early prototype evidence remains separately labeled. Cloud deployment is not claimed; real persistence validation uses isolated local Convex.
