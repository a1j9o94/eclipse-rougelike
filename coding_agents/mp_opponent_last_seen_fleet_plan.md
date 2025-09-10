## Plan — Opponent Fleet Intel (Last-Faced)

Outcome: Rename the modal to “Enemy Intel” for both modes. In single-player it retains the sector/boss plan content; in multiplayer it shows only the opponent’s fleet as you last faced it in combat (or defaults before first combat). It never updates live with the opponent’s shop actions; it only updates after each completed combat.

Acceptance Criteria
- Outpost displays an “Enemy Intel” modal (renamed from `CombatPlanModal`).
- Single-player: sector list content remains unchanged.
- Multiplayer: hide the sector list entirely; show only opponent intel.
- Before first combat: panel shows opponent’s default starting frame(s) and starting ship count.
- After combat N completes: panel shows the exact fleet snapshot the player faced in combat N (ship frames, alive flags, parts as surfaced in snapshot rules; synthetic MP parts are acceptable for display).
- During the next shop phase, changes on the opponent’s side do not alter the panel until the next combat completes.
- If the opponent changes between rounds (player swap), the panel resets to that new opponent’s default.
- Works with real transport and `mp/fakeTransport`.
- Lint, tests, build are green.

Non-Goals
- Real-time spectating of the opponent’s shop.
- Revealing hidden information not present in the combat snapshot (e.g., undisclosed parts outside snapshot rules).

User Experience
- Location: right column of Outpost, under or near “Match Info”.
- Modal reuse: enhance `CombatPlanModal` to render different content by mode.
- Title in multiplayer: “Enemy Intel” (single-player remains “Combat Plan”).
- Multiplayer content: only the opponent intel section (no sector list).
- Subheader: “Round X” or “Pre-Combat” for the first shop.
- Content: ship grid with frame icons and small part tags/summary; fallback text if unknown: “No data yet — defaults shown”.

Data Model / State
- Add `LastSeenOpponent` cache to multiplayer client state:
  - Shape: `{ byPlayerId: Record<PlayerId, { round: number; fleet: Ship[]; at: number /*ts*/ }> }`.
  - Persisted only client-side (not authoritative), derived from server events.
  - Reset on room change or opponent change.
- Source of truth for display:
  - Pre-combat (round 0): `seedFleetFromBlueprints(frame, bpIds, startingShips)` to build default.
  - Post-combat: snapshot captured at combat lock-in or combat start event, stored per opponent.

Selectors
- `selectOpponentIntel(game, multi): { stage: 'pre'|'post'; round: number; fleet: Ship[]; source: 'default'|'last_combat' }`
  - If `lastSeen.byPlayerId[opponentId]` exists and is for the latest completed combat, return it.
  - Else construct default via faction/frame + startingShips.
- `selectOpponentLabel(...)` for compact UI label and round string.

Events / Flow
1) Both players ready → transport/room transitions to `combat`.
2) On `combat_start` or lock-in, receive opponent’s finalized snapshot (already exists in `playerStates[pid].snapshot` at that moment).
3) Store snapshot into `lastSeen.byPlayerId[opponentId] = { round: currentRound, fleet, at: now }`.
4) After combat returns to Outpost, UI reads selector; no further updates until next `combat_start`.

Guardrails
- Do not bind UI to `playerStates[opponentId].snapshot` during shop; read only from `lastSeen` cache or defaults.
- If transport doesn’t emit an explicit `combat_start`, fall back to capturing at the state transition when `room.phase` becomes `combat`.

Tests (Fail First)
1) Selector: pre-combat returns default fleet with correct count and frame(s).
2) Selector: after storing a last-combat snapshot, returns that snapshot while `playerStates.snapshot` mutates.
3) Integration: simulate `combat_start` → store snapshot → back to shop → UI renders the stored fleet; changing `playerStates.snapshot` does not alter UI.
4) Swap opponent: cache resets to new opponent’s default.
5) Fake transport: hook into `mp/fakeTransport` events to assert cache population.

Implementation Notes
- Use existing `src/multiplayer/snapshot.ts` to synthesize displayable parts.
- Prefer minimal new types in `src/multiplayer/types.ts` (or colocate near snapshot) for `LastSeenOpponent`.
- Add selectors under `src/selectors/` (e.g., `opponentIntel.ts`).
- UI: augment `CombatPlanModal` (no new modal). Extract a small presentational subcomponent (e.g., `OpponentIntelSection`) for the fleet grid if helpful; only rendered in MP.

Risks & Rollback
- Risk: Out-of-sync round indexing. Mitigation: derive completed round from room/game phase transitions; add unit tests for off-by-one.
- Risk: Stale cache across room changes. Mitigation: clear cache on `roomId` change.
- Rollback: Hide `OpponentIntelPanel`, keep selectors dormant behind feature flag.

Work Breakdown
1) Types/state: add `LastSeenOpponent` store and wiring.
2) Selector: `selectOpponentIntel` + tests.
3) Transport hook: capture snapshot on `combat_start`.
4) UI: extend `CombatPlanModal` with MP-only Opponent section.
5) Edge-case tests: opponent swap, no data.
6) Docs: decision log and acceptance.
