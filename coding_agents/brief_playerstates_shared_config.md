Title: Unify multiplayer playerStates types and document Shared Config & MP State

Context
- We migrated configuration to `shared/` and integrated multiplayer. Lint now enforces “no any”. Some MP code still uses loosely-typed objects for `playerStates` and server-client payloads.
- Recent changes introduced typed snapshot mapping (`ShipSnapshot`) and cleaned most `any`, but we haven’t centralized server-side types for `playerStates` nor documented the shared configuration + MP game state contract.

Goals
- Define and export precise TypeScript interfaces for multiplayer `playerStates`, room game config, and round lifecycle so both Convex (server) and the React client share one source of truth.
- Document shared config modules and how they feed single player and MP flows.

Scope
- Server: Add stable types for `playerStates` and export them to client code (no runtime coupling, types only).
- Client: Replace remaining `unknown`-based access for `playerStates` with shared types.
- Docs: Author a concise architecture doc covering shared config and MP state flow.

Deliverables
1) Shared Types
   - File: `shared/mpTypes.ts` (new)
     - `export type FrameId = 'interceptor'|'cruiser'|'dread'` (re-export from `shared/frames` to avoid duplication).
     - `export type Resources = { credits:number; materials:number; science:number }` (aligns with `shared/defaults`).
     - `export type Research = { Military:number; Grid:number; Nano:number }` (aligns with `shared/defaults`).
     - `export type PlayerModifiers = { rareChance?: number; capacityCap?: number; startingFrame?: FrameId; blueprintHints?: Record<string,string[]> }`.
     - `export type PlayerState = { resources?: Resources; research?: Research; economy?: { rerollBase?: number; creditMultiplier?: number; materialMultiplier?: number }; modifiers?: PlayerModifiers; blueprintIds?: Record<FrameId,string[]>; fleet?: ShipSnapshot[]; fleetValid?: boolean; sector?: number; lives?: number }`.
     - `export type GamePhase = 'setup'|'combat'|'finished'`.
     - `export type GameState = { currentTurn: string; gamePhase: GamePhase; playerStates: Record<string, PlayerState>; combatQueue?: unknown; roundNum: number; roundLog?: string[]; acks?: Record<string, boolean>; pendingFinish?: boolean; matchResult?: { winnerPlayerId: string } }`.
     - `export type RoomGameConfig = { startingShips:number; livesPerPlayer:number; multiplayerLossPct?: number }`.
     - Import/define `ShipSnapshot` from `convex/engine/combat` types or add a lightweight duplicate here if we want to keep `shared/` independent (see Tasks/Decision).

2) Server Alignment (Convex)
   - Update `convex/gameState.ts`, `convex/helpers/resolve.ts`, `convex/rooms.ts` to use `PlayerState`, `GameState`, and `RoomGameConfig` where appropriate.
   - Ensure `schema.ts` still allows `playerStates` as unstructured storage (`v.any()`), but all handler code uses typed objects internally.
   - Ensure functions that patch `playerStates` don’t drop fields accidentally (shallow merge by playerId, not wholesale replace).

3) Client Alignment
   - In `src/hooks/useMultiplayerGame.ts` and `src/App.tsx`, replace remaining `Record<string, unknown>` / `unknown[]` patterns with shared `PlayerState` and `GameState` types.
   - Keep `ShipSnapshot`→`Ship` mapping strict (done) and ensure array maps are typed as `ShipSnapshot[]`.

4) Documentation
   - File: `coding_agents/architecture_shared_config_and_mp_state.md` (new)
     - Shared Config modules and roles:
       - `shared/defaults.ts`: INITIAL_* values.
       - `shared/frames.ts`, `shared/parts.ts`: statics for frames and parts.
       - `shared/game.ts`: `BASE_CONFIG`, `buildFactionConfig`.
       - `shared/factions.ts`: `SHARED_FACTIONS` (ids) → `FACTIONS` (real parts), bosses.
       - `shared/pacing.ts`, `shared/difficulty.ts`, `shared/economy.ts`.
     - Single Player flow: StartPage → initNewRun → Outpost → Combat → Rewards → next sector.
     - Multiplayer flow & state machine:
       - Lobby: create/join room → both players ready → server `startGame` → room.status=playing.
       - Setup: clients submit `fleet` snapshots (`ShipSnapshot[]`), set `fleetValid`, toggle ready.
       - Resolve: server `maybeResolveRound` checks both ready + snapshots → `simulateCombat` → updates `roundLog`, rewards, lives.
       - Combat playback: clients render `roundLog`, then ack. Server acks loop back to `setup` or finish.
       - Finish: `pendingFinish` set where appropriate; after acks, room status `finished`.
     - Data contracts (copy/paste type snippets from `shared/mpTypes.ts`).
     - Error handling, retries, invariants (both players present, no auto-start until both ready, snapshots required to ready).

Tasks & Steps (TDD)
1) Add `shared/mpTypes.ts` exporting the types above (Decision: duplicate minimal `ShipSnapshot` shape here to avoid importing server code in client/shared; tests will validate shape mapping).
2) Write failing tests:
   - `src/__tests__/mp_typing_contract.spec.ts`:
     - Validates that `useMultiplayerGame` exposes `gameState.playerStates[pid]` as `PlayerState` (type-only test via `.d.ts` or compile-only by importing and assigning).
     - Validates `fromSnapshotToShip` accepts `ShipSnapshot` and maps to `Ship` without `any`.
3) Update Convex handlers to use `PlayerState` internally; adjust narrow casts.
4) Update client to use `PlayerState` and `GameState` from shared.
5) Run: `npm run lint && npm run test:run && npm run build`.

Acceptance Criteria
- No `any` or `unknown` where shared types exist.
- All tests pass; build passes.
- Docs present and discoverable in `coding_agents/`.

Notes & Decisions
- ShipSnapshot Source: we can add a minimal `ShipSnapshot` to `shared/mpTypes.ts` so client/server don’t import from convex code (keeps layers clean). Shape should match what the server creates/consumes: `{ frame:{id:string;name?:string}; weapons:{name?:string; dice?:number; dmgPerHit?:number; faces?: { roll?:number; dmg?:number; self?:number }[]; initLoss?:number }[]; riftDice?:number; stats:{ init:number; hullCap:number; valid:boolean; aim:number; shieldTier:number; regen:number }; hull:number; alive:boolean; partIds?:string[]; parts?: { id:string }[] }`.

References
- See `coding_agents/multiplayer_implementation_plan.md` for broader MP design.
- Current client integration points: `src/App.tsx` (snapshot mapping, phase navigation), `src/hooks/useMultiplayerGame.ts` (rooms and gameState access).

