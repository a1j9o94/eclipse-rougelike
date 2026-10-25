# Effortless fitting, relationships, and supporting screens

Outcome: compare and revise ship designs in place, commit all changed classes together, and find the next game or relationship without opening competing workflows.

## Fitting

- Blueprint and functional component tray stay together; a replacement updates the ship without closing the tray. No upgrade-readiness dialog remains.
- Persisted class drafts form one existing `upgrade.blueprints` command. Validation covers total installation allowance, legal per-class ordering, energy and drive requirements, and shared Ancient stock. A stored copy reserved by another class cannot be selected twice.
- Reset one slot, reset the current class, and undo the last local edit preserve other class drafts. The commit uses the shared queue wording when planning off turn.
- Ordinary fitting and discovered-part installation share `FittingHardpoints`. Reward choices retain per-class previews, use blueprint identity rather than candidate array indexes, and expose `Install free` / `Store`. Illegal placements explain blueprint validation issues. Ancient discovery values remain local to the decision.

## Relationships and recruitment

- Diplomacy begins with a compact relationship overview. Selecting another civilization replaces the single exchange preview; no offer is sent until its explicit commit.
- `DiplomacyExchangePreview` is reused by ordinary offers, opponent inspection, and decision responses (response integration by the selection/economy agent). It shows cube direction, income, rack use, and VP; sole legal resource choices need no picker.
- Select actual private reputation tiles before returning them. Returning a stale or changed tile is blocked. Opponent private reputation never enters the local drafts.
- Recruitment expands configuration only on the selected species. Public target/resource preferences survive navigation and reload. Reputation-return acknowledgments remain memory-only and are keyed to the actual consequence, not unrelated revisions.
- Storage validation accepts only known species and resource names. Successful offers/recruitment clear their selected target without clearing another activity or compatible resource preferences.

## Supporting screens

- Saved games show one entry per ongoing room/match. Authenticated match summaries expose only a `needsInput` boolean for the owned seat's pending decision, action turn, or unfinished concurrent upkeep. Those games lead the list. Completed/abandoned/resigned and other-player decision states do not request input.
- Faction selection stays in place on phones. Full setup/reference information expands on request. Lobby rules are collapsed; readiness loss is announced.
- Empire retains opportunities and current resources while folding detailed economy tracks, owned research tracks, and faction reference. Explicit track navigation opens the relevant disclosure.
- History groups round boundaries, expands combat detail on request, and shows rollback controls only in deliberate `Edit history` mode. Score and reputation explanations follow public-reputation rules. Preferences and game controls are separated.
- Spectators reuse action symbols, status styling, and the existing read-only Galaxy/Empire/History/Score components. Public inspection highlights the same galaxy surface; timeline DOM and scroll remain intact. Full planets/components expand on request; mutation controls and private values remain absent.

## Build refinement

- The embedded planner uses the map as the primary destination control; its sector catalog expands on request. The standalone fallback opens that catalog by default.
- The order tray sits outside the scrolling piece catalog. On phones, a bounded map/planner layout keeps the tray and aggregate Build control visible while the catalog and funding details scroll.
- An explicit payment mix survives item placement, addition, and removal. If it becomes invalid, the old conversion remains visible, commit stays disabled, and even a sole correction appears as an unselected choice. Invalid stored payment JSON is safely ignored for rendering.

## Verification

Fail-first behavioral checks covered persistent replacement tray, aggregate class orders/capacity, cross-class Ancient reservations, no readiness dialog, last-edit undo, ongoing-room de-duplication, mobile selection staying in place, explicit history editing, readiness loss, needs-input privacy/turn/upkeep states, and spectator shared-map return context. An initial relationship test fixture reused a faction color; that fixture was corrected before the final relationship regression passed.

Completed bounded batches (one worker; overlapping suites are not summed):

- Fitting-order, Ancient reward, diplomacy, lobby: 28 tests passed before the added last-edit regression.
- Ancient reward plus blueprint/rules suites: 20 passed.
- Supporting UI batch: 44 passed initially; the remaining readiness test used an ambiguous status query, corrected and then covered by the passing lobby batch.
- Relationship/recruitment persistence plus action-draft suites: 16 passed.
- Match-summary backend and saved-games UI: 11 passed.
- Spectator UI/history: 11 passed.
- Final fitting and blueprint rules batch: 51 passed across 8 suites, including last-edit undo.
- Build planning, Build/Move commit behavior, and funding UI/rules: 28 passed across 5 suites after fail-first destination disclosure, unavailable-payment correction, and payment-retention regressions.

Changed-source ESLint passed, including the final Build/refunding files. Final repository lint/build and integrated browser evidence are recorded by the supervisor. React best-practices skill reviewed: controlled shared previews, derived validation, accessible disclosure/selection semantics, no new global listeners, and privacy-safe versioned storage.

## Limits and rollback

No engine rule, RNG, balance, or saved-state migration was changed by this stream. Match-summary `needsInput` is additive. Reverting the frontend stream leaves existing saved matches readable; unknown draft-storage fields are ignored by older clients.

Newcomer/expert playtests and physical-device validation cannot be established by component tests. The supervisor owns release gates and desktop/mobile visual checks. This stream does not claim the whole user plan is complete by itself.
