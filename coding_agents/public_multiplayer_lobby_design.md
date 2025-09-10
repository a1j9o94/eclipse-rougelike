## Public Multiplayer Lobby — Design

Goal: Make a multiplayer game option publicly available with a browsable lobby. Display host name, host lives, and starting ships. Joining navigates to the room and removes the room from the public list.

### User Experience
- From Multiplayer menu, click "Public Matchmaking" to see a list of joinable rooms.
- Each room shows: Room Name • Host Name • Lives • Starting Ships • Players 1/2.
- Enter your name (sticky in input) and click Join on a room. On success, you land in the room lobby; the room disappears from the list for others because it’s now full.

### Server (Convex)
- New query: `rooms.getPublicRoomsDetailed` → returns an array of:
  - `roomId`, `roomCode`, `roomName`, `currentPlayers`, `maxPlayers`, `createdAt`,
  - `startingShips`, `livesPerPlayer`,
  - `hostName`, `hostLives`.
- Implementation: query `rooms` with `by_public` index filtering `isPublic=true`, `status='waiting'`; filter where `currentPlayers < maxPlayers`; for each room fetch the host from `players` (single query using `by_room`, then pick `isHost`), and map fields. Keep payload small.
- Concurrency: join uses existing `rooms.joinRoom` with capacity guard; no schema change.

### Client
- Hook: `usePublicRooms()`
  - Uses `useQuery(api.rooms.getPublicRoomsDetailed, {})` to get the list.
  - Exposes `{ rooms, isLoading, refresh }`.
- UI: `MultiplayerStartPage` adds `mode === 'public'` screen.
  - Shows player-name input and a reactive list.
  - For each room: a Join button triggers `joinRoom(roomCode, playerName)` via `useMultiplayerGame(null)` and then calls `onRoomJoined(roomId)`.
  - Error handling: toast/banner for "Room is full" or network errors.
  - Polling/real-time: rely on Convex subscription behavior; optional manual refresh button.

### Types
- Reuse `MultiplayerGameConfig` for settings. New client-side type:
```ts
export type PublicRoomItem = {
  roomId: Id<'rooms'>;
  roomCode: string;
  roomName: string;
  startingShips: number;
  livesPerPlayer: number;
  hostName: string;
  hostLives: number;
  currentPlayers: number;
  maxPlayers: number;
  createdAt: number;
};
```

### Tests (TDD)
1) Server unit: `getPublicRoomsDetailed` filters and shapes data correctly.
2) Hook test: `usePublicRooms` returns mapped rooms and loading states (mock Convex client).
3) UI test: Public page renders fields and calls `joinRoom` with correct args when Join clicked.
4) Join race: simulate room capacity reached and display error.

### Acceptance Criteria
- See plan entry in `coding_agents/subagents/planning_agent.md`.

