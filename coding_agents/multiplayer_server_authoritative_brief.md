# Multiplayer PVP — Server‑Authoritative Loop (Handoff Brief)

Branch: `feature/pvp-ready-combat-loop-plan`

## Context

We’ve implemented the scaffolding for a server‑authoritative multiplayer loop using Convex. The current round resolution is a placeholder (deterministic winner + short log). We need to finish the real combat simulation on the server, clean up UI overlays, and ensure robust state transitions across two clients.

Key goals:
- Server‑authoritative combat resolution (no local randomness).
- Outpost uses the normal “Start Combat” button (no extra readiness bar).
- Lives/banner always visible in multiplayer, including during Setup/Combat and in lobby finish summary.
- Deterministic playback of server-provided round logs on both clients, then ack → server flips back to Setup.

## Current State (what’s in the branch)

- Convex schema: `rooms`, `players`, `gameState`, `fleetArchives` (winner fleet snapshots).
- Server mutations (selected):
  - `rooms.createRoom`, `joinRoom`, `startGame`, `updatePlayerReady`, `restartToSetup`.
  - `gameState.initializeGameState`, `submitFleetSnapshot`, `resolveCombatResult` (used earlier), `ackRoundPlayed`, `endCombatToSetup` (legacy, not used in the final loop).
- Client:
  - `useMultiplayerGame` hook exposes: `setReady`, `submitFleetSnapshot`, `ackRoundPlayed`, `updatePlayerReady`, etc.
  - `App.tsx` uses LivesBanner in multiplayer, wiring Outpost “Start Combat” → `submitFleetSnapshot(fleet, valid)` then `setReady(!myReady)`.
  - When server sets `gamePhase: 'combat'`, app switches to Combat and appends `roundLog`, then auto‑acks.
  - When both acks received, server returns to `setup` / or `finished` on elimination → app routes to lobby.

Known issues:
- Combat resolution is placeholder; needs real engine.
- Residual overlay: an old readiness bar was removed but a remnant can still appear overlapping the bottom (screenshot shows a pill overlapping “Fleet valid”).
- Occasional race conditions are reduced, but final server‑only resolution will eliminate divergence.

## What to Build

### 1) Server Combat Engine (deterministic)

Create `convex/engine/combat.ts` to run a full deterministic round using a seeded RNG.

- Inputs: `seed`, two fleet snapshots (structure must minimally include per ship: frame/HP, `stats` like `hullCap`, `init`, `valid`, `weapons` with damage), and any targeting/recoil/volley logic needed.
- Port or mirror the logic from `src/game/combat.ts` (client single‑player) to server. Do NOT import client files directly; either copy minimal logic or extract to a shared location that is buildable by Convex functions.
- Output:
  - `winnerPlayerId`
  - `roundLog: string[]` (timeline of events, kills, round header/footer). Keep it compact.

Wire this engine in `rooms.updatePlayerReady` once both players are ready and snapshots are present/valid.

### 2) Round Transition (authoritative)

When both ready & valid snapshots exist:
- Compute `roundSeed`
- Run server engine → `winnerPlayerId`, `roundLog`
- Decrement loser’s lives; insert `fleetArchives` entry for the winner.
- Patch `gameState` with:
  - `gamePhase: 'combat'`
  - `roundSeed`, `roundLog`, `acks: {}`
  - If loser lives reaches 0 → `gamePhase: 'finished'`, `rooms.status: 'finished'` instead.

On `ackRoundPlayed`: when both players ack:
- Clear `roundLog`, `acks`, set `gamePhase: 'setup'`
- Reset both players’ `isReady = false`
- Increment `roundNum`

### 3) UI Cleanup

Files:
- `src/App.tsx`: Remove any remnants of the bottom readiness bar (search for “Multiplayer: Outpost Ready Bar”, `showMultiReadyBar`, extra bottom padding `pb-20`).
- Ensure LivesBanner is always visible in multiplayer (already wired).
- In Outpost, Start Combat button:
  - Sends `submitFleetSnapshot(fleet, fleetValid)` and toggles `setReady(!myReady)`.
  - Optionally show a small “Waiting for opponent…” text if `myReady && opponent not ready`.
- Combat view: simply append `roundLog` and auto‑ack; no local RNG/steps.
- Finished: route to lobby; (optional) show a small summary and a “View Winning Fleet” button (see below).

### 4) (Optional) Finished Summary & Archive Query

Add a query to return the latest `fleetArchives` entry for the room, and render a small summary:
- Winner label, final lives for both.
- “View Winning Fleet” (blueprint/tiles snapshot).
- “Rematch” (host creates a new room with same config) / “Back to Menu”.

## Acceptance Criteria

- Two browsers (Host + Guest) can complete a full match:
  - Create/Join → lobby → Ready → host starts → Setup → Start Combat → Combat playback → Setup … until elimination.
  - Lives decrement shown in the top banner; elimination returns both to lobby.
- No bottom overlay overlaps modals or “Fleet valid”. No extra readiness bar.
- No client RNG: outcomes are identical and driven by server `roundLog`.
- No “No room ID”/OCC spam in console during steady‑state actions.

## Affected Files (primary)

- `convex/engine/combat.ts` (new)
- `convex/rooms.ts` (ready → resolve round via engine)
- `convex/gameState.ts` (ackRoundPlayed finalization; keep `submitFleetSnapshot`)
- `src/hooks/useMultiplayerGame.ts` (no change expected; already has submit/ack)
- `src/App.tsx` (remove readiness bar remnants; Outpost Start is the only control)
- `src/components/LivesBanner.tsx` (already OK)

## Non‑Goals / Out of Scope

- Ranking/ELO, matchmaking beyond private rooms.
- Persisting player names; we only archive winner fleets.
- Polishing all log lines; correctness over verbosity.

## Testing Notes

- Manual: two browsers through Create → Join → multiple rounds → elimination.
- Edge cases:
  - Cancel Ready in Outpost before the other side is ready.
  - Invalid fleet → Start disabled; server re‑computes validity on snapshot.
  - Refresh one client during combat → should rehydrate from server state and still ack.

## Dev Tips

- Convex functions must be pure and deterministic; add a small seeded RNG (e.g., mulberry32) inside engine.
- Do not import `src/game/*` into Convex; copy minimal logic or refactor to a shared module if buildable by Convex.
- Keep `roundLog` concise to avoid payload bloat.

## Done When

- Real server combat engine in place; both clients see identical playback.
- Outpost only uses its Start button; no extra UI overlays remain.
- Lives track correctly; elimination returns both to lobby.
- Build/tests green; verified across two browsers.

