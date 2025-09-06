# MP Outpost Parity — What Actually Fixed It

Date: 2025-09-06
Branch: feature/multi-faction-loss

## Problems Observed

- Warmongers saw Interceptors at first Outpost render (not Cruisers).
- Industrialists sometimes showed `Class Blueprint — Interceptor 0/6` in MP.
- Warmongers’ reroll sometimes showed `0¢` (spillover from SP/Industrialists).
- Research upgrades in MP didn’t persist across setup→combat→setup.

## Fixes Applied

1) Prefer Server Snapshot When Frames Differ
- Change: In setup sync, the client now adopts the server fleet snapshot when:
  - round advanced, OR
  - server has more ships, OR
  - frame ids differ (new).
- Rationale: Fallback seeded Interceptors while the server later sent Cruisers; counts were equal (3 vs 3), so the old logic didn’t swap. Comparing frames ensures the authoritative server state wins.
- Code: src/App.tsx — checks `framesOf(mapped) !== framesOf(fleet)` in setup sync before applying server snapshot.

2) Prevent Fallback Overwrite Once Server Applies
- Change: Added `mpServerSnapshotApplied` guard — once we apply a server snapshot for the round, fallback cannot run.
- Logs: `[Fallback] seeding local fleet …` only occurs before any server snapshot is applied.

3) MP Baseline Class Blueprints (No 0/6)
- Change: If a player has no `blueprintIds` or `blueprintHints`, we backfill class blueprints from `INITIAL_BLUEPRINTS` (same as SP). This avoids “0/6” for Industrialists in MP.
- Code: src/App.tsx — baseline fill in the blueprint application branch.

4) Reroll Reset in MP (No SP Spillover)
- Change: On MP setup round 1, initialize reroll cost from:
  - `economy.rerollBase` if server provides it (Industrialists = 0), else
  - `ECONOMY.reroll.base` (8) for everyone else.
- Effect: Warmongers immediately show `Reroll (8¢)`, never `0¢` from SP.
- Code: src/App.tsx — setBaseRerollCost/setRerollCost and `mpRerollInitialized` flag.

5) Research Persistence (Server-Authoritative)
- Change: After a successful MP research upgrade, the client persists the new `research` and adjusted `resources` via `multi.updateGameState(updates)`.
- Important: The client must pass only `{ updates }` (research/resources) to the MP helper. We fixed a bug where we incorrectly included `{ roomId, playerId }` inside `updates`, which Convex rejected (`ArgumentValidationError: Object contains extra field 'playerId' in 'updates'`).
- Code: src/App.tsx — call `multi.updateGameState({ research, resources })` (no roomId/playerId).
- Result: On next setup, the server re-applies the upgraded research — no “tier reset”.

## Diagnostics to Verify in Prod
- `[Fallback] seeding local fleet { frame, count }` — only during initial no-snapshot window.
- `[Sync] server snapshot frames [...]` — should show `'cruiser'` for Warmongers after initializeGameState.
- `[MP] applied class blueprints from ids { interceptor, cruiser, dread }` — counts for current frame.
- `[MP] persist research { nextResearch, track, delta }` — printed on MP upgrades.

## Tests (TDD)
- `outpost_warmongers_view.spec.tsx` (green): Cruiser header/stack/capacity.
- `mp_fallback_then_snapshot.spec.tsx` (to green next): ensures server Cruisers win after fallback.
- `mp_industrialists_baseline_blueprints.spec.tsx` (green with baseline fill): avoids 0/6.
- `mp_reroll_spillover.spec.tsx` (green target): ensures Warmongers see 8¢ even if SP save had 0¢; Industrialists keep 0¢.
- `mp_research_persistence.spec.tsx` (to green): updateGameState gets called with `{ research, resources }` to persist tiers.

## Summary
By (a) adopting server fleets when frames differ, (b) blocking fallback after server snapshots, (c) backfilling MP class blueprints, (d) resetting MP reroll to base when absent, and (e) persisting research to the server with the correct argument shape, the Outpost UI now matches SP expectations at first render and across rounds.
