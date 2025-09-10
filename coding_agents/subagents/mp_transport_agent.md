# Multiplayer Transport Refactor Agent

Mission
- Introduce a transport abstraction to decouple multiplayer logic from Convex specifics. Provide a fake, in‑memory transport for tests and a thin Convex adapter. Do not rewire GameRoot yet; deliver a proven interface + tests so the swap can happen in a follow‑up.

Outcomes (Acceptance Criteria)
- `src/mp/transport.ts` exports a typed `MultiTransport` interface and small data types for room and game state events.
- `src/mp/fakeTransport.ts` implements `MultiTransport` for tests, supporting host/guest, readiness, validity, snapshot submission, and server phase transitions.
- `src/mp/convexTransport.ts` wraps current Convex plumbing to conform to `MultiTransport` (thin adapter; can be partially stubbed where not yet wired).
- Unit tests in `src/__tests__/mp_transport.spec.ts` simulate host and guest through setup → combat → finished → setup using the fake transport.
- Protocol doc `docs/mp_protocol.md` describing events, phases, and persistence rules.

Strict File Boundaries (No Overlap With Core Engine Agent)
- You MAY create/modify:
  - `src/mp/transport.ts` (new)
  - `src/mp/fakeTransport.ts` (new)
  - `src/mp/convexTransport.ts` (new)
  - Tests: `src/__tests__/mp_transport.spec.ts`
  - Docs: `docs/mp_protocol.md`
- You MUST NOT modify:
  - `src/GameRoot.tsx`, `src/controllers/*`, `src/hooks/useOutpost*`, `src/engine/*`, `src/game/shop.ts`, `src/hooks/useCombatLoop.ts` (owned by Core Engine Determinism Agent)
  - Any existing `src/hooks/useMp*` (we will swap to the transport later)

Interface Sketch
```ts
// src/mp/transport.ts
export type PlayerId = string
export type Phase = 'menu'|'lobby'|'setup'|'combat'|'finished'
export type Snapshot = { blueprints?: Record<string, string[]>; fleet?: unknown[] }
export type PlayerState = { isReady: boolean; fleetValid: boolean; snapshot?: Snapshot }
export type RoomState = { roomId: string; players: PlayerId[]; phase: Phase }
export type GameState = { phase: Phase; playerStates: Record<PlayerId, PlayerState>; round: number; modifiers?: Record<string, unknown> }

export interface MultiTransport {
  subscribe(cb: (room: RoomState, game: GameState) => void): () => void
  getRoom(): RoomState | null
  getGameState(): GameState | null
  setReady(ready: boolean): Promise<void>
  updateFleetValidity(valid: boolean): Promise<void>
  submitFleetSnapshot(snapshot: Snapshot): Promise<void>
  updateGameState(updates: Partial<GameState>): Promise<void>
  leaveRoom(): Promise<void>
  dispose(): void
}
```

Test Plan
- mp_transport.spec.ts:
  - Creates a room with fake transport, connects two players.
  - Both submit snapshots, toggle readiness to move to combat.
  - Server resolves to finished and increments round.
  - Both acknowledge and move to next setup.
  - Assertions on ordering, idempotence, and replay safety.

Implementation Steps
1) Define `MultiTransport` in `src/mp/transport.ts` with types. (DONE)
2) Implement `fakeTransport.ts` with in-memory state machine and `subscribe`. (DONE)
3) Implement `convexTransport.ts` mapping existing Convex calls (can be stubbed with TODOs where not wired yet). Export a factory `createConvexTransport(roomId: string)`.
4) Write `src/__tests__/mp_transport_convex_stub.spec.ts` that imports the adapter and asserts its shape (methods exist, no any at public boundary). Do not hit the network.
5) Update `docs/mp_protocol.md` if any naming diverges.
6) Keep UI unchanged; no edits to hooks/useMp* yet.

Command Hints
```bash
npm run lint && npm run typecheck && npm run test:run -t mp_transport
```

Anti‑Goals
- No edits to GameRoot or UI pages.
- No edits to engine or shop randomness.

Deliverables
- New transport interface + implementations, tests, and protocol doc.

Agent Prompt (paste into your agent)
```
You are the Multiplayer Transport Refactor Agent working in this repo.
Objective: define a clean MultiTransport interface, implement a fake transport with tests, and provide a thin Convex adapter. Do not change UI or engine.
Scope: ONLY touch files listed under “You MAY create/modify” in coding_agents/subagents/mp_transport_agent.md.
Constraints: no any at public boundaries; lint/type/tests must pass.
Steps: transport.ts → fakeTransport.ts → convexTransport.ts → tests → protocol doc.
Finish when acceptance criteria in the doc are met and all checks are green.
```
