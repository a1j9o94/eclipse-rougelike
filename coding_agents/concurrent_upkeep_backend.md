# Concurrent upkeep — server orchestration

Outcome: each human can settle their own upkeep without waiting for another player; AI upkeep continues independently, and the round advances only when the rules engine marks all responsibilities complete.

Acceptance:
- Authentication selects the seat; queued choice IDs cannot authorize a different seat.
- Commands still use strict match revisions and unique command IDs. An independent concurrent write can make the next request stale, and the client refreshes before retrying.
- Every unfinished human in multiplayer shares the deadline established at upkeep entry. Finishing an earlier seat does not grant a later seat another full timer.
- Timeout AI handles one decision at a time, preserves the shared deadline, resets the command safety count per seat, and retains visible failure/retry behavior.
- Ordinary AI upkeep is scheduled while a human still has work or an outstanding choice.
- Solo humans continue to wait indefinitely. Existing action-turn timers keep their original behavior.
- A refused/cancelled undo restores the paused simultaneous timer membership and time remaining; an applied undo reconciles the restored responsibilities with a fresh timer.

Implementation: optional upkeepRound/upkeepSeatIds on the existing unique match timer row. Timer targetSeatId remains the sequential worker's owner; authenticated match views project it to the viewer when that viewer has unfinished upkeep. The public membership list lets the interface distinguish a shared upkeep timer from ordinary turns. No independent full-state writes or optimistic resource updates.

Fail-first tests: parallel human completion and strict revisions, AI progress behind humans, simultaneous expiration/serial takeover without clock reset, and per-seat queued-decision ownership. The first three failed against the old orchestration; the ownership case was added during implementation.

Risks: additive optional schema fields preserve stored action timers. Server-first release is required for the new engine and UI contracts. No commit or deployment performed by this sub-agent. Parent owns the combined lint/build and final rollout.

Validation result: 35 tests passed across concurrent-upkeep Convex (9), existing rooms (3), solo rooms (6), AI pacing (3), and rollback (14), all single-worker batches. Convex TypeScript and diff whitespace checks passed. Parent runs combined full lint/build.

Additional regressions: a deployed singleton upkeep clock missing the new fields retains its deadline on migration when prior persisted phase is upkeep, turn serial matches, and its owner still owes upkeep. A fresh last-pass transition instead starts a new shared clock; the test distinguishes these cases. Paid human population-return obligations remain timed. Failed takeover retries retain the original common deadline. A rejected undo restores both human timer membership and remaining time, including the vote pause duration.
