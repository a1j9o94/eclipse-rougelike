Architecture: Shared Config and Multiplayer Game State

Overview
This document captures how shared configuration feeds both single-player and multiplayer, and the data contracts for the multiplayer state stored in Convex and consumed by the client.

Shared Config Modules
- shared/defaults.ts: INITIAL constants for research, resources, blueprints, capacity.
- shared/frames.ts: Frame definitions and `FrameId` union.
- shared/parts.ts: Part catalog, types, and helpers (effects/labels/description).
- shared/game.ts: BASE_CONFIG and `buildFactionConfig` to assemble a faction’s `GameConfig` from overrides.
- shared/factions.ts: `SHARED_FACTIONS` (simple ids) mapped to `FACTIONS` (real parts) for client; includes boss fleets.
- shared/pacing.ts: Sector curve and `getSectorSpec`.
- shared/difficulty.ts: Difficulty knobs, base reroll cost, defeat policy, initial capacity.
- shared/economy.ts: Reroll cost behavior and shop sizes.

Single-Player Flow (client)
1) StartPage: pick faction + difficulty; reads unlocks from storage.
2) initNewRun: uses `getFaction`, `buildFactionConfig`, `getStartingShipCount`, etc. Sets economy modifiers and rare chance.
3) Outpost: shop, research, build/upgrade ships; `rollInventory` produces items based on research.
4) Combat: `generateEnemyFleetFor` uses sector spec and boss data; turns resolve to Victory/Defeat with rewards and progression.

Multiplayer Flow & State Machine
- Lobby (server + client):
  - createRoom/joinRoom; both players appear with lives and (optional) faction.
  - When both are ready in lobby, server moves room to `playing` (no combat yet).
- Setup (server-side gameState):
  - `gamePhase: 'setup'`, `roundNum` increments per loop.
  - Each client submits `fleet` snapshot (ShipSnapshot[]), updates `fleetValid`, toggles ready.
  - Server `maybeResolveRound` checks: 2 players, both ready, snapshots present, fleets valid.
- Resolve (server):
  - `simulateCombat` returns `winnerPlayerId`, `roundLog`, and final snapshots.
  - Loser lives decremented; both resources adjusted (winner rewards + loser consolation). `roundLog` stored.
  - If a player hits 0 lives, mark `pendingFinish` and wait for client acks; otherwise loop back to setup.
- Combat Playback (client):
  - On `gamePhase: 'combat'`, client renders `roundLog` with pacing; then calls `ackRoundPlayed`. Server flips back to `setup` or `finished`.
- Finish (server):
  - When `pendingFinish` true and both players ack, mark room finished; reset readiness.

Data Contracts (proposed shared/mpTypes.ts)
- FrameId: 'interceptor' | 'cruiser' | 'dread'
- Resources: { credits:number; materials:number; science:number }
- Research: { Military:number; Grid:number; Nano:number }
- PlayerModifiers: { rareChance?: number; capacityCap?: number; startingFrame?: FrameId; blueprintHints?: Record<string,string[]> }
- PlayerState: { resources?: Resources; research?: Research; economy?: { rerollBase?: number; creditMultiplier?: number; materialMultiplier?: number }; modifiers?: PlayerModifiers; blueprintIds?: Record<FrameId,string[]>; fleet?: ShipSnapshot[]; fleetValid?: boolean; sector?: number; lives?: number }
- GamePhase: 'setup' | 'combat' | 'finished'
- GameState: { currentTurn: string; gamePhase: GamePhase; playerStates: Record<string, PlayerState>; combatQueue?: unknown; roundNum: number; roundLog?: string[]; acks?: Record<string, boolean>; pendingFinish?: boolean; matchResult?: { winnerPlayerId: string } }
- RoomGameConfig: { startingShips:number; livesPerPlayer:number; multiplayerLossPct?: number }
- ShipSnapshot (client/server wire): { frame:{ id:string; name?:string }; weapons:{ name?:string; dice?:number; dmgPerHit?:number; faces?: { roll?:number; dmg?:number; self?:number }[]; initLoss?:number }[]; riftDice?:number; stats:{ init:number; hullCap:number; valid:boolean; aim:number; shieldTier:number; regen:number }; hull:number; alive:boolean; partIds?:string[]; parts?: { id:string }[] }

Client Integration Points
- src/hooks/useMultiplayerGame.ts: Queries/mutations and helpers to access room and gameState.
- src/App.tsx: Phase-driven navigation; server snapshot mapping to client `Ship` for render.

Server Integration Points (Convex)
- convex/rooms.ts: Room lifecycle (create/join/start/restart/prepareRematch), readiness toggles.
- convex/gameState.ts: Initialize gameState; update player validity & snapshots; ack and loop transitions.
- convex/helpers/resolve.ts: Server-side resolution, rewards, and lives updates.

Testing Strategy
- Add compile-time tests for `PlayerState` usage in hooks (no any/unknown), and snapshot mapping input type safety.
- End-to-end MP test exists (`multiplayer_authoritative_flow.spec.ts`); keep it green.

Design Notes
- Keep `schema.ts` flexible with `v.any()` for `playerStates` but guard all handlers with typed transforms.
- Avoid importing Convex code into `shared/`; prefer shared `ShipSnapshot` type and make server adapt if it diverges.

