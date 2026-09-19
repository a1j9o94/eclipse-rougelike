# Automatic passing after the player has passed

## Outcome and acceptance

Players can persist an optional “auto-pass unless attacked” preference on their seat. Their first pass remains deliberate and receives the normal first-pass bonus. Subsequent reaction turns are skipped clockwise until an opponent enters their territory or fleet sector. Affected players retain all ordinary reaction choices, and the interface can explicitly resume automatic passing.

Acceptance: no extra resource cost, no hidden draw, no forced first pass, no resolved pending choice or interrupted partial action; authenticated changes survive reconnect and recovery on another device. Invading owned space or a fleet pauses automation, allied transit does not, and committed betrayal does. A new round keeps the preference and expires the pause. Same-player consecutive turns receive fresh turn clocks/search budgets through an authoritative turn serial.

## Implementation and decisions

- Optional `Seat.autoPassUnlessAttacked` and `Seat.autoPassPausedRound` preserve old saves without migration. `set-auto-pass` changes only the authenticated submitting seat, including off-turn and during a saved decision. An explicit enable clears the pause, so the player can resume within the round. Disabling never advances another player.
- `shared/eclipse/autoPass.ts` centralizes eligibility, bounded clockwise skipping, public log events and attack interruption. The pure engine uses the same behavior for human and AI seats. Settings are excluded from generated AI gameplay candidates.
- Automation only skips already-passed action turns without pending/queued decisions or an open action. It does not perform reactions, combat, upkeep, or the initial pass. Normal final-pass combat initialization remains authoritative.
- Hostile movement is inspected within the transactional clone after path validation; any invalid later batch member discards the entire command, including interruption flags. A legal entry followed by departure still counts. Allied transit is exempt until existing end-of-action betrayal rules break the ambassador relationship.
- Optional `GameState.actionTurnSerial` increments on completed actions, explicit passes, and skipped reaction turns. This distinguishes a fresh turn returning to the same actor from an off-turn settings revision. The independent adapter review consumes the serial for multiplayer clocks and AI budgets.
- Transport keeps identity, revision, unique command, reserved server-prefix and expired takeover protections. The new preference is allowed through pending/off-turn validation but cannot resolve a choice. A timed-out current owner must wait for takeover completion; other owners can still change preferences.
- Public views copy the optional seat status, with existing private reputation/deck/RNG filtering unchanged. Public history identifies changes and skipped turns.

## Verification

- Fail-first engine run: 10 failures / 3 existing-rule passes in `coding_agents/logs/auto_pass_red.log`.
- Explicit resume was added as a separate failing regression, `auto_pass_resume_red.log`, before clearing the pause in the handler.
- Engine tests cover first-pass economics, multiple skipped seats, default reaction behavior, own/off-turn settings, open actions and saved decisions, owned/unowned fleet sectors, illegal movement rollback, enter-and-leave batches, unrelated movement, allied transit/betrayal, next-round expiry, all-passed termination, standalone pass parity, protocol identity/stale/duplicates and explicit resume/re-attack.
- Adapter tests cover recovered cross-device credentials, ownership, duplicate/stale submissions, exact single journal entry, initial AI handoff and stale-worker safety (`auto_pass_convex.log`: 2 passed).
- Final bounded engine regressions: 83/83 across 7 files, including all 17 new engine cases (`auto_pass_engine_regressions.log`). `npm run typecheck:eclipse`, full `npm run lint`, and full `npm run build` pass (`auto_pass_typecheck.log`, `auto_pass_lint.log`, `auto_pass_build.log`). Build reports the existing browser-data age and chunk-size advisories. UI/scheduling integration results are recorded by the parent release pass. No subjective playtest claim is made by these automated tests.

## Risks and rollback

This is a convenience preference, not a rulebook change to reaction eligibility. Existing snapshots without the preference behave as before. Removing the checkbox and disabling the optional flag restores manual reaction turns without deleting match data. The main integration risk is same-actor turn-boundary scheduling; that receives dedicated timer and AI-budget tests before release.
