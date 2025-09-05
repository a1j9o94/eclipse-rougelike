Title: Server‑Authoritative Combat — Implementation Notes

Branch: feature/server-authoritative-combat

Scope
- Add deterministic combat engine under `convex/engine/combat.ts` (seeded RNG, no client imports).
- Wire engine into `convex/rooms.updatePlayerReady` to resolve rounds when both players are ready and have valid snapshots.
- Remove legacy multiplayer readiness bar from `src/App.tsx`; Outpost Start button handles snapshot + ready.
- Keep LivesBanner visible in multiplayer; auto-ack playback remains.

Engine
- Pure function `simulateCombat({ seed, playerAId, playerBId, fleetA, fleetB })` → `{ winnerPlayerId, roundLog }`.
- Ports minimal client combat logic with seeded RNG (initiative sort, target selection, volley handling, rift self-damage).
- No imports from `src/`; redefines sizeRank, successThreshold, and Rift faces locally.

Convex Integration
- On both players ready with valid snapshots: run `simulateCombat`, archive winner fleet, decrement loser lives, set `gamePhase` to `combat` or `finished`, store `roundLog`, clear `acks`.
- `ackRoundPlayed` already loops back to setup and resets readiness.

UI
- Removed bottom readiness bar and padding from `src/App.tsx`.
- Outpost Start button continues to `submitFleetSnapshot` then `setReady(!myReady)`.

TDD
- Added `src/__tests__/convex_engine_combat.spec.ts` covering determinism and basic outcome for mismatched fleets.
- Lint/tests/build run clean.

Acceptance
- Deterministic server outcomes via `roundLog`.
- No readiness overlay; Lives banner always shown.
- Next: Optional finished summary + archive query.

