# Independent AI worker and difficulty review — September 18, 2026

Scope: `convex/eclipseMatches.ts`, `convex/eclipseRooms.ts`, schema, difficulty setup and AI activity presentation. Review by the strategy agent; runtime changes belong to the runtime agent. Independent reproductions live in `src/__tests__/second_dawn_ai_concurrency.spec.ts`.

## Findings reproduced before fixes
1. **Stalled takeover after an off-turn trade.** While a timed-out human seat's worker was thinking, a different human could legally trade. The accepted revision invalidated the old worker; normal scheduling then saw a human controller, cleared the timeout token and scheduled nothing. The old watchdog ignored the waiting job. Fixed by scheduling the still-current takeover after the revision change; a stale worker cannot commit.
2. **Ordinary retry failed to resume timeout work.** Both visible recovery controls could appear, but the generic AI retry cleared timeout state and scheduled nothing for a human controller. Fixed by sharing timeout recovery, preserving the expired deadline/token and spent budget. The expired player remains locked out.
3. **Journal key collision.** A human could submit the predictable future command ID `ai:seat-2:1`; the worker inserted another row with that same indexed key because it passed an empty journal. Reproduced two rows with one unique key. Fixed by reserving server prefixes for new human submissions and checking existing worker keys. Existing matching receipts retain idempotency.
4. **Failed takeover regained a fresh human clock.** After a takeover failure, a different player's legal trade caused same-owner failed-clock reconciliation to create a new active deadline/token. Reproduced deadline 31,000 becoming 61,001. The timer and failed job must remain paused and visible until explicit retry.

Initial first three regressions failed before fixes, then passed. Two additional guards pass: an expired but still-current lease cannot commit before its watchdog runs, and replacing a room timer token blocks takeover work even when the game revision is unchanged. The sixth regression covers finding 4; final status recorded below.

## Checks with no issue found
- Transactional claim status prevents duplicate searches for the same scheduled job.
- Worker queries receive filtered `PlayerView` data; player queries do not expose leases, seeds, deck order or work snapshots.
- Commit checks current revision, lease token, lease deadline, controller/timeout ownership and authoritative command legality.
- Budget remains with the originating action across another seat's temporary decision. Completion resets the action budget. Interrupted work conservatively exhausts its old budget instead of repeatedly starting expensive searches.
- Timeout takeover always uses Normal policy; solo human rooms do not get a takeover timer.
- Difficulty selection is validated by the server and copied from the room to the saved match; faction/controller identity remains separate.

## Presentation note
The existing presentation selector only calls an actual AI-controlled seat an AI actor. During a human seat's timeout work, the activity bar can still say “Your turn” alongside “Comparing plans”; the turn clock correctly announces AI takeover. This is a presentation follow-up, not a command-ownership hole.

Final independent result: **all six concurrency tests pass** against the runtime fixes, including preservation of failed clocks and failed-job visibility after off-turn activity. Test log: `coding_agents/logs/ai_concurrency_final.out`. The independent test file is lint-clean.
