Title: Multiplayer Faction Blueprints & Seeded Fleets — Diagnosis & Plan

Context
- Goal: In multiplayer, faction effects must match single‑player at the very first Outpost view.
- Specifically: class blueprints and the initial fleet must reflect faction perks (e.g., Warmongers see Cruisers and cruiser blueprints; Timekeepers/Raiders see Disruptor/Antimatter, etc.).
- Current behavior: server logs show seeding, fleet snapshots submit, but class blueprints in Outpost render as default (Fusion Source, Fusion Drive, Positron, Plasma), not faction‑specific.

How class blueprints and fleet are rendered (today)
- Blueprints:
  - App.tsx maintains `blueprints` state (initialized from `INITIAL_BLUEPRINTS`).
  - OutpostPage receives `blueprints` prop and renders “Class Blueprint — <frame>”.
  - We added a client util `applyBlueprintHints(current, hints)` to map `playerStates.modifiers.blueprintHints` (ids) to ALL_PARTS and merge into `blueprints` during setup.
  - Issue: timing/race — the merge may occur after the first Outpost render, or another effect may overwrite state.

- Fleet:
  - Server `initializeGameState` writes `playerStates[f].fleet` seeded by faction (e.g., Warmongers cruisers, TK/raiders special weapons).
  - Client, on setup, prefers server snapshot; if none, builds local seed from `blueprints` + `startingFrame`, and submits it.
  - Fleet rendering uses `fromSnapshotToShip(snap)` → `CombatPage` and Outpost’s fleet state. This part is working better (logs show snapshot count and sync), but we need to ensure parts mirror faction seeds.

Why the class blueprint isn’t updating
- Likely causes:
  1) Order-of-operations: switch to OUTPOST before applying blueprint hints.
  2) Late modifiers arrival: blueprintHints applied only in the first setup effect; if hints arrive after, state remains default.
  3) Overwrite: a subsequent effect or code path (e.g., “seed local fleet” block or other init) could replace `blueprints` with defaults.
  4) Hints limited to interceptor only; Warmongers cruiser blueprints weren’t supplied (we seeded cruiser fleet but didn’t provide cruiser blueprint hints).

Proposed solution (server authoritative blueprint ids + client mapping before render)
1) Server: add `playerStates[f].blueprintIds` (Record<frameId, string[]>) in `initializeGameState` for every faction — not just `modifiers.blueprintHints`. This becomes the authoritative per‑player blueprint set for the first round.
   - scientists: keep Tier 1 base unless faction grants specific parts
   - industrialists: base + economy perks (no special blueprint changes)
   - warmongers: provide cruiser blueprint ids for the initial class blueprint (e.g., tachyon source, tachyon drive, plasma array, positron, gauss, composite)
   - timekeepers: interceptor blueprint ids include disruptor
   - raiders: interceptor blueprint ids include antimatter + tachyon drive/source
   - collective: interceptor blueprint ids include auto‑repair

2) Client: in App.tsx on phase→setup, before setting `mode` to OUTPOST:
   - Read `playerStates[myId].blueprintIds` (if present) and map ids → ALL_PARTS.
   - Call `setBlueprints(mapped)` to replace the default class blueprints.
   - Only after blueprints/resources/research/economy/rareChance/capacity are applied, then set `mode='OUTPOST'`.
   - Keep the existing safety: re-apply if the values arrive late (in the playerStates sync effect), but guard against overwrites.

3) Remove overwrite paths:
   - Audit effects that call `setBlueprints` (only use the server-provided mapping and avoid re-initializing from `INITIAL_BLUEPRINTS` after setup begins).
   - Ensure `rollInventory` and research changes don’t reset class blueprints unintentionally.

4) Seed fleet deterministically from blueprint ids (if server didn’t provide a fleet yet):
   - Use `startingFrame` from server modifiers.
   - Build each ship with the mapped class blueprint; submit to server snapshot.
   - This will match the local single‑player seed visuals exactly.

5) Tests (TDD)
   - Unit: `applyBlueprintHints` maps ids and merges correctly (already added: mp_blueprint_hints_apply.spec.ts).
   - Unit: `faction_blueprint_hints.spec.ts` confirms hint IDs exist.
   - Integration: simulate `gameState.playerStates` with `blueprintIds` and assert `App` (or a shallow store selector) sets `blueprints.interceptor/cruiser` to contain those ids before Outpost render.
   - Integration: warmongers first render shows Cruiser class blueprints with expected ids; timekeepers/raiders show Disruptor/Antimatter; collective shows Auto-Repair.

Implementation steps
1) Server
   - In `convex/gameState.initializeGameState`, add `blueprintIds` alongside `modifiers`. For each faction, fill with a concrete list per frame:
     - warmongers.cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite']
     - raiders.interceptor: ['tachyon_source','tachyon_drive','antimatter','positron']
     - timekeepers.interceptor: ['fusion_source','tachyon_drive','disruptor','positron']
     - collective.interceptor: ['fusion_source','fusion_drive','plasma','auto_repair']
     - scientists/industrialists: leave empty (defaults) or tweak as design requires.

2) Client
   - Add a `mapBlueprintIdsToParts(ids: Record<frameId,string[]>)` util (or reuse applyBlueprintHints) and call it in the setup effect before `setMode('OUTPOST')`.
   - Ensure mapping runs again in the playerStates sync effect if playerStates changes and blueprint ids were present.
   - Guard against re-initializing `blueprints` after setup begins.

3) Validation/logging
   - Add a debug log upon applying server blueprint ids: `[MP] applied class blueprints from ids | {frame, count}` and before Outpost mode switch.
   - Capture counts in logs to confirm non-zero merges.

Known pitfalls & rationale
- Convex server cannot import `ALL_PARTS`; we avoid doing so by sending ids only. Mapping remains client-side.
- Order-of-operations matters. Blueprints/resources/economy/rareChance/capacity must be applied before the Outpost view mounts; otherwise, the first frame shows defaults.
- Avoid racy overwrites. Effects that set `blueprints` must be staged: initial apply (setup) → optional re-apply on playerStates change → disable any other resets.

Acceptance criteria
- On warmongers: Outpost first render shows Cruiser class blueprint parts and seeded Cruiser fleet.
- On scientists: Tier 2 research visible; shop rare chance reflected.
- On industrialists: Reroll = 0, resource bump; discounted pricing.
- On raiders/timekeepers/collective: class blueprints reflect advanced parts; initial ships show those parts visually.
- Logs show `[MP] applied class blueprints from ids` before Outpost render.

Code pointers
- Server: `convex/gameState.ts` (initializeGameState per-player setup)
- Client: `src/App.tsx` effects watching `multi.gameState?.gamePhase === 'setup'` and `playerStates` sync; `setBlueprints`, `setResources`, `setResearch`, `setEconomyModifiers`, `setRareTechChance`, `setCapacity` calls must occur before `setMode('OUTPOST')`.
- Util: `src/multiplayer/blueprintHints.ts` (applyBlueprintHints), extend with a `mapIds` helper if needed.

Open questions / follow-ups
- Do we want faction-specific cruiser/dread blueprint ids beyond warmongers? If yes, add to blueprintIds per faction variant.
- Should `playerStates` explicitly include `blueprintIds` instead of `modifiers.blueprintHints`? (This plan proposes `blueprintIds` as authoritative.)
- Should we also serialize per-ship part ids in fleet snapshots (for perfect parity visuals)? Currently snapshots include weapons/stats; that’s sufficient for rendering.

