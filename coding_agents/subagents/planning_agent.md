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

