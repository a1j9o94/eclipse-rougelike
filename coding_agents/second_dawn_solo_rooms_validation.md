# Solo rooms: wait for me

Outcome: a player can create a shareable room for one human and 1–5 AI, resume through the same ownership mechanism as multiplayer, and leave human turns or choices waiting indefinitely.

Acceptance criteria:
- One ready human can start with any supported AI count; total remains 2–6 seats.
- Normal AI seats execute their own turns and stop at human decisions.
- Solo rooms never schedule human deadlines or timeout takeover.
- Old timeout jobs and timer rows cannot take over or reject a returning solo human.
- Existing multiplayer readiness, ownership and 30-second–48-hour deadlines remain intact.

Tests first: `second_dawn_solo_rooms.spec.ts` initially failed all four setup/clock tests because room validation required two humans. The obsolete timer test separately failed because lobby projections exposed the old deadline. Logs are under `coding_agents/logs/second_dawn_solo*`.

Decision log:
- Kept the persisted room settings shape compatible. `humanSeatCount === 1` implies “Wait for me”; `timerMs` is retained but unused in solo rooms.
- Kept `MIN_MULTIPLAYER_HUMAN_SEATS` at 2 for multiplayer UI semantics; added `MIN_ROOM_HUMAN_SEATS` at 1 for shared room validation.
- Applied solo handling in both room synchronization and atomic match-command timer reconciliation. Ordinary AI scheduling continues unchanged.
- Removed obsolete timer rows when reconciling solo state, hid them from public views, and bypassed them in command timeout guards. Scheduled timeout jobs also explicitly reject solo rooms.
- Identity recovery and frontend room presentation are companion work owned by the supervisor/identity agent. Lobby seats now expose the optional saved public username through that agent's shared resolver; a regression verifies credentials, recovery codes and PINs remain private.

Risk and rollback: limits and timer checks affect existing room functions; multiplayer regression tests cover unchanged behavior. Frontend deployment must accompany backend support before exposing the one-human option. Reverting this slice restores the old two-human minimum but existing solo rooms must not be given a multiplayer clock.

Result: focused six solo/name tests plus seven existing multiplayer tests pass. Fake-clock scenarios cover a week away before a command and a month away at the next human choice after bounded ordinary AI execution. Scoped lint passes; TypeScript results are recorded in the adjacent logs. The supervisor owns the aggregate build and repository lint gate to avoid concurrent build/codegen runs.

Follow-ups: supervisor handles cross-device account recovery, live room connectivity, UI, browser verification and deployment.
