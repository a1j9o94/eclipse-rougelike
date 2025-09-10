## Plan Entry — Public Multiplayer Lobby

- Outcome: Players can browse and join public multiplayer rooms; list shows host name, lives remaining, and starting ships; joining navigates to the room and removes it from the public list.

- Acceptance criteria:
  - The Multiplayer menu has an enabled "Public Matchmaking" option.
  - Public lobby view lists only rooms with `status = waiting` and `currentPlayers < maxPlayers` and `isPublic = true`.
  - Each list item displays: room name, host player name, host lives, starting ships, and player count (e.g., 1/2).
  - Clicking Join prompts for (or uses) player name, calls join mutation, navigates to the room lobby on success.
  - After join, the joined room is no longer returned by the public list API.
  - Polling/real-time updates reflect room disappearance when it fills.
  - Lint, tests, and build are green.

- Risks & rollback:
  - Risk: N+1 queries for host data. Mitigation: a single Convex query returns rooms with host info.
  - Risk: Race when two players join simultaneously. Mitigation: server maintains `currentPlayers` capacity check; UI shows error toast if full.
  - Rollback: Revert the UI page and the new Convex query; existing private-room flow remains unaffected.

- Test list (fail first):
  1. API: `getPublicRoomsDetailed` returns only waiting/public/not-full rooms and includes `hostName`, `hostLives`, `startingShips` (must fail first).
  2. Selector/UI: Renders host name, lives, starting ships for a mocked room list (must fail first).
  3. Join flow: Clicking Join calls `joinRoom(roomCode, name)` and invokes `onRoomJoined(roomId)` on success (must fail first).
  4. Integration (light): When a room reaches capacity, it no longer appears in the public list (mock Convex client).

---

### Implementation Steps
1) Add server query for public rooms + host
2) Create client hook for public lobby
3) Implement Public Lobby UI
4) Wire join flow + navigation
5) Add tests and docs

### Decision Log
- Chose a new Convex query `rooms.getPublicRoomsDetailed` to avoid client-side N+1 queries and to include host metadata in the payload.
- Kept data model unchanged (derive host fields from `players` where `isHost = true`).

### Follow-ups
- Add pagination or time-based pruning for stale rooms.
- Consider an optional Elo/MMR field for future matching.

## Plan Entry — Opponent Fleet Intel (Last-Faced)

- Outcome: Multiplayer-only. Reuse the existing `CombatPlanModal` to show the opponent’s fleet exactly as last faced in combat; for the very first shop, show their default starting configuration and starting ship count. Never update live during shop.

-- Acceptance criteria:
  - Outpost shows an “Enemy Intel” view in multiplayer using the same modal component (`CombatPlanModal`).
  - In multiplayer, the sector list is hidden; only opponent intel is shown.
  - Round 0/pre-combat shows defaults (frame(s) + starting ship count).
  - After each combat, the panel shows the fleet snapshot faced in that combat.
  - Opponent shop changes do not affect the panel until next combat starts.
  - Switching opponents resets to that opponent’s defaults.
  - Lint, tests, and build are green.

- Risks & rollback:
  - Risk: off-by-one round mapping. Mitigation: capture at `combat_start` and unit-test transitions.
  - Risk: stale cache after room switch. Mitigation: clear cache on roomId change.
  - Rollback: feature-flag the panel and selectors; hide the panel to revert.

- Test list (must fail first):
  1) Selector returns defaults pre-combat with correct count/frame.
  2) Selector returns stored last-combat snapshot even if `playerStates.snapshot` changes during shop.
  3) Integration: simulate `combat_start` → store snapshot → back to shop → panel renders stored fleet unchanged.
  4) Opponent swap resets to defaults for the new opponent.
  5) Fake transport path populates cache on `combat_start`.

---

### Implementation Steps
1) Add `LastSeenOpponent` client cache and types
2) Build `selectOpponentIntel` selector + tests
3) Hook snapshot capture on `combat_start`
4) Implement `OpponentIntelPanel` and wire to Outpost
5) Edge-case tests and docs update

### Decision Log
- Use client-side cache keyed by opponent playerId to avoid live updates during shop.
- Capture snapshot at `combat_start` rather than using shop-time snapshots.
- Seed pre-combat defaults via `seedFleetFromBlueprints(..., startingShips)`.

### Follow-ups
- Consider small-history view (last 3 rounds) with tabs.
- Optional toggle to show compact summary vs. ship grid.

## Plan Entry — Help Menu Rules/Tech Modals

- Outcome: Players can open the Rules and Tech List modals from the bottom-right help buttons on all screens; Rules modal layers above floating UI and allows text selection.

- Acceptance criteria:
  - Clicking the “❓ Rules” button opens the Rules modal (“How to Play”).
  - Clicking the “🔬 Tech” button opens the Tech List modal.
  - Both modals can be dismissed via their internal buttons and do not interfere with each other.
  - The Rules modal overlays above floating help buttons (no overlap or click-through issues).
  - Lint, targeted tests, and build remain green.

- Risks & rollback:
  - Risk: Prop API change on `GameShell` breaks call sites. Mitigation: update `GameRoot` at the same time; changes are localized.
  - Rollback: Revert the `GameShell`/`GameRoot` prop changes and the test file.

- Test list (must fail first):
  1) UI: Clicking “❓ Rules” opens the Rules modal (help_menu_modals.spec.tsx).
  2) UI: Clicking “🔬 Tech” opens the Tech List modal (same test file).

---

### Implementation Steps
- Add `onOpenRules` and `onOpenTechs` props to `GameShell`.
- Wire them in `GameRoot` to `setShowRules(true)` and `setShowTechs(true)`.
- Update help buttons to call the open handlers (not the close handlers).
- Bump `RulesModal` z-index from `z-40` to `z-50` to match other modals.
- Add focused test: `src/__tests__/help_menu_modals.spec.tsx`.

### Decision Log
- Standardized modal layering at `z-50` to prevent overlap with floating help UI.
- Kept existing close handlers for internal modal buttons; only the external help triggers were incorrect.

### Follow-ups
- Consider adding backdrop click-to-close behavior for consistency across modals.
