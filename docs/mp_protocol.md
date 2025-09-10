# Multiplayer Protocol (Current → Target)

Scope
- Documents the client/server phases and events to support a transport abstraction. This is source material for `src/mp/transport.ts`.

Phases
- `menu` → `lobby` → `setup` → `combat` → `finished` → `setup` (repeat)

Key Entities
- RoomState: `{ roomId, players, phase }`
- GameState: `{ phase, round, playerStates: { [playerId]: { isReady, fleetValid, snapshot? } }, modifiers? }`
- Snapshot: minimal client payload (blueprints/fleet ids) to reconstruct fleets server‑side.

Client Intents
- setReady(boolean)
- updateFleetValidity(boolean)
- submitFleetSnapshot(snapshot)
- updateGameState(partial) — server-authoritative fields must remain immutable on clients.

Server Responsibilities
- Authoritative transitions (setup↔combat↔finished), round increment.
- Persist and broadcast research/resources modifiers in MP.
- Validate snapshots and compute combat outcome.

Idempotence + Ordering
- All updates must be idempotent; clients may retry.
- Server ignores stale updates (round mismatch); clients reconcile on broadcast.

Target Transport
- `MultiTransport` exposes subscribe/getters and methods above; client hooks build UI logic on top.

Notes
- Deterministic core (seeded RNG) ensures clients can predict shops/enemies locally where needed but server remains source of truth.
