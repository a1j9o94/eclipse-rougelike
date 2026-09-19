# Minor Species setup and persistence

## Outcome
Players can choose the optional Minor Species module when creating a solo game or multiplayer room; all participants see the agreed option, and saved games keep their exact rules version.

## Acceptance and decisions
- Minor Species defaults off. Legacy room rows and direct solo requests omit the flag safely.
- Solo creation sends the selected option into its room before starting.
- Room host changes clear every Ready state; another player cannot change settings.
- An old client that omits the field while updating other room settings preserves the chosen module.
- Enabled setup uses the engine's seeded four-tile market. The snapshot is authoritative; no duplicate match-table flag.
- Human submissions and scheduled AI commits derive their version pin from the saved Minor Species market object, including when its market is empty.
- Purchase validator enumerates the catalog's nine IDs and accepts optional resource and private reputation returns. Ownership, atomic persistence, duplicate IDs and stale revisions retain the ordinary command protocol.

## Tests and review
Fail-first: new room option, default-off behavior, and purchase command were rejected/missing before plumbing changes; then passed.

Passed memory-bounded batches: Minor Species Convex setup/purchase/AI retry, room lobby, existing expansion rooms, solo rooms, finished navigation/solo setup, multiplayer contracts. Assertions cover old defaults, host authority, renewed readiness, version pins, hidden-state filtering, purchases once only, stale submissions, and stale scheduled retries.

Browser review at localhost5173 via agent-browser, no live match created:
- 1440×900 solo setup shows the option alongside the other rules toggles; off initially.
- 390×844 solo setup toggle changes to checked, readable explanatory copy, no horizontal overflow.
- 390×844 room creation independently defaults off and clearly explains ambassador space use.
- No browser errors. Screenshots: `minor_species_setup_desktop.png`, `minor_species_setup_mobile.png`, `minor_species_room_mobile.png`.

React review: controlled boolean inputs, native keyboard/label behavior, disabled during submission, no derived state effects or public private-rack data. Parent runs final repository lint/build after concurrent engine and market UI changes settle.

## Risks and rollback
The Convex schema change is optional and additive. Disabling the module for new games does not change existing enabled matches. Deploy backend before frontend so the new option is accepted by validators. The parent integrates the branch; this subtask performs no commit, push or deployment.
