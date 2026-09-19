# Auto-pass scheduling review and correction — 2026-09-19

## Player outcome

When every opponent automatically skips a passed reaction, the next real turn receives a fresh timer even if it belongs to the same player. Timeout AI returns control for that new human turn. AI search receives a fresh budget for a new strategic action, while changing an off-turn preference preserves the current turn's deadline and remaining budget.

## Findings and implementation

The prior timer reconciler identified turns by seat ownership. An A → skipped B → A transition therefore kept A's old deadline and could keep timeout takeover running into A's next turn. Initial regression tests reproduced both ordinary deadline reuse and timeout takeover continuation.

The engine now supplies optional `GameState.actionTurnSerial`, advancing at completed action/pass/skipped-reaction boundaries. Scheduler adapters persist the corresponding optional `actionTurnSerial` on room timer rows and `budgetActionTurnSerial` on AI job rows. Missing values mean zero for existing records; no data migration or table removal is required.

Both atomic command reconciliation and recovery timer synchronization compare this counter before reusing a timer. Timeout dispatch and precommit validation reject obsolete serials. Timeout completion only chains within the same action turn; a new same-owner turn retires the old timeout lease and receives a new human deadline.

AI scheduling preserves the existing budget only within the same action turn. It also handles an action whose final required choice is resolved by a human. The old blanket refill after any AI command leaving no open action was removed; actual serial boundaries determine renewal. Existing conservative handling of an interrupted in-flight search remains: it cannot reclaim potentially spent budget through a concurrent command.

## Validation

Fail-first evidence:

- `auto_pass_scheduling_red.out`: two timer regressions failed, one pre-existing AI completion path passed.
- `auto_pass_timeout_red.out`: timeout continuation into the next same-owner turn failed before correction.

Five new Convex tests cover:

1. Same-human turn wrap refreshes the timer; an off-turn preference retains it; old timeout tokens do nothing.
2. Recovery synchronization detects a changed serial while subsequent same-turn synchronization preserves the deadline.
3. Same-AI turn wrap renews the search budget; an off-turn preference keeps remaining budget.
4. Timeout takeover ends when skipped seats return a fresh turn to the same human.
5. A human resolving the AI's final required choice renews that AI's next-action budget.

The scheduling/AI-worker/concurrency/room batch passes 22 tests. A second bounded batch passes 26 tests across adversarial timeout workers, AI pacing and engine auto-pass behavior. Repository lint, `tsc -b`, and `npm run build:vercel` pass. Logs are in `coding_agents/logs/auto_pass_scheduling_*` and `auto_pass_timeout_red.out`.

## Independent engine review

Reviewed the frozen auto-pass engine/protocol changes separately from scheduler implementation. No remaining blocking issue found: first pass remains explicit; skipping is bounded and stops for open actions/required decisions; ordinary reaction capacity remains one; illegal move batches leave interruption flags unchanged; hostile traversed sectors can pause auto-pass; allied transit waits for committed end-action betrayal; round changes expire the pause without silently performing the initial pass; off-turn preferences retain identity/revision enforcement.

UI draft preservation and the policy for toggling preferences during timeout takeover were reported to the parent for its separate UI/command handling scope. No Board or draft-context changes were made in this scheduler slice.
