# Fair initial starter for live matches

Outcome: new solo and room games can begin with any occupied seat, including an AI, rather than always giving the human/host the opening action.

## Audit and source

The root cause was direct: both live creation paths place their human/host at seat index zero, and `createGame` assigned both `activeSeatId` and `startSeatId` to that seat. Ongoing clockwise turns and next-round first-pass handling already work.

The [publisher-verified Dized Sector Setup](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/kiQflaZoQaehrBIVgWap0Q/2-sector-setup) awards the starting marker by time spent on Terra (the youngest-player convention). Equal random selection is an intentional digital adaptation for human/AI games without collecting ages, not a claim that the printed setup requires randomization. [Passing](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/dKyuHOf_Th2ZLtAE4GZNGg/passing) awards the first passer two Money and the starting marker for the following round. No initial random-starter money bonus is added.

## Implementation decision

`GameSetup.randomizeStartingPlayer?: boolean` defaults to false for compatibility with existing deterministic fixtures. Both live Convex creation paths explicitly pass true. At the end of setup, one unbiased `randomInt` selection from the persisted seeded stream updates the starting/active seat and RNG cursor. Physical seat order, home placement, faction assignments, initial supplies, and initial resources are unchanged. No read/resume/ongoing-game path rerolls the starter.

Existing live scheduling already handles an initial AI: direct matches call `scheduleAi`, and room timer synchronization schedules ordinary AI before its wait-for-me human branch. New integration tests verify these paths. First-pass handling and cleanup retain their established next-round behavior.

Acceptance/tests first: selected starter equals the unbiased stream result at all2–6 counts; each seat reachable over fixed seeds; deterministic replay; unchanged fixtures/components/resources; clockwise progression; first passer starts next round; initial AI worker scheduled in direct solo and solo/multiplayer rooms; resume does not reroll. Initial run **8 failed, 2 passed** before implementation (`random_starter_red.log`).

Risk: older adapter tests assumed that host commands could execute at revision0 regardless of setup seed. Their fixtures need explicit deterministic setup seeds; production must stay random. Rollback affects new-match setup only and leaves every existing saved game intact.

## Verification and fixture compatibility

- Domain/setup/round/turn batch: **35/35 passed** (`coding_agents/logs/random_starter_green.log`). Seven new domain cases cover five player counts, setup/replay compatibility, clockwise turns, first-pass money and next-round starter without a fresh RNG draw.
- Direct-solo and room integration tests prove AI can start, the AI job is immediately scheduled, human ownership remains seat1, repeated reads do not mutate/reroll the persisted snapshot, and no human timeout appears for an initial ordinary AI. Both solo wait-for-me and multiplayer room scenarios also run an actual initial AI worker command and confirm the authoritative revision advances (`random_starter_live_ai.log`, **3/3 passed**).
- The initial legacy adapter run exposed **13 host-first fixture failures**. Existing adapter suites now explicitly import `src/__tests__/hostStartingSeed.ts`, pinning only `createGame`'s seed to32 while retaining the actual randomized starting-player implementation. Seed32 starts seat1 for all supported player counts with portals enabled. Room-token/lease randomness is unaffected, and the new randomized integration suite does not import the fixture helper.
- Final adapter batch: **62/62 passed across14 files**, including multiplayer completion, identity/recovery, command history, worker ownership/concurrency, and solo waiting (`random_starter_adapter_final.log`). Batches overlap; totals are not additive.
- Scoped ESLint and `tsc -b --pretty false` pass (`random_starter_types.log`). Parent owns final repository gates and release.

No snapshot migration, client-supplied starter override, extra initial resource bonus, shuffled faction/seat positions, or new round-order state was introduced. This changes newly created live matches only. Source and behavior audit confirms that later rounds continue to start with the first passer; roster presentation remains a separate parent-owned UI change.
