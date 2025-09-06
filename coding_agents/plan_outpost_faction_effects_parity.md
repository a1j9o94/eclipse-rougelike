# Outpost Faction Effects Parity — Comprehensive Plan (Single‑Player vs Multiplayer)

## Overview

Goal: Ensure all faction effects apply correctly and consistently at the very first Outpost render and throughout setup for both single‑player (SP) and multiplayer (MP). Close any gaps where SP and MP behavior may diverge, with a bias toward server‑authoritative state in MP and clear per‑player isolation.

Context sources consulted (Sep 6, 2025):
- coding_agents/economy_isolation_bug.md — multiplayer economy contamination analysis and fix proposal
- coding_agents/multiplayer_faction_blueprints.md — blueprint + seeded fleet diagnosis/plan
- coding_agents/architecture_shared_config_and_mp_state.md — SP/MP shared config + data contracts
- Recent commits on this branch (feature/multi-faction-loss):
  - a579802 “Fix economy isolation regression in multiplayer” (skip global setEconomyModifiers in MP)
  - e8ff124 “Fix warmongers not getting cruisers in multiplayer” (server seeding)
  - be269c5/e2b2844 “Consolidate faction effects; apply in sync effect before Outpost”
  - cb3bec5 “Lint cleanup; stronger MP types; shared config fallbacks”
  - 8b12fdd/354db6f/754eab6 “MP snapshots: partIds in ShipSnap; shared defaults; client reconstruction”

References per AGENTS.md:
- Planning approach: coding_agents/planning_agents.md
- Implementation guidance: coding_agents/implementation_agents.md
- Research guidance: coding_agents/research_agents.md

## Faction Effects Contract (Authoritative Invariants)

For a player P (SP or MP) before Outpost first render:
- Resources: P.resources reflects faction starting credits/materials/science.
- Research: P.research reflects faction starting tiers (e.g., Scientists T2/T2/T2).
- Economy: P.economy.rerollBase, creditMultiplier, materialMultiplier applied to P only.
- Blueprints: Class blueprints match faction provided blueprintIds/hints (e.g., Warmongers cruiser set; TK Disruptor; Raiders Antimatter; Collective Auto‑Repair).
- Starting Frame: P.modifiers.startingFrame respected when seeding local fleet (Warmongers: cruiser).
- Rare Chance: P.modifiers.rareChance applied before shop inventory roll.
- Capacity: P.modifiers.capacityCap applied before capacity checks/costs.
- Seeded Fleet: If server didn’t provide fleet, seed deterministically from blueprintIds/hints + startingFrame; submit snapshot.
- Isolation: No global state (economy, rare chance) from P contaminates any other player.

First‑render order (MP):
1) Read playerStates[P] from gameState (resources, research, economy, modifiers, blueprintIds, fleet).
2) Apply resources/research/rareChance/capacity/blueprints.
3) Prefer server fleet; else seed from blueprints + startingFrame and submit snapshot.
4) Only then set mode='OUTPOST' and roll shop inventory based on (2).

## Divergence Audit (SP vs MP)

1) Economy in hangar and Outpost UI uses global state
   - Files: src/game/hangar.ts, src/pages/OutpostPage.tsx (getEconomyModifiers direct usage)
   - MP Fix to date: App.tsx avoids setEconomyModifiers in MP; research/reroll use parameter‑based functions.
   - Remaining gap: Build/upgrade/dock costs in hangar + Outpost labels won’t reflect Industrialists’ discounts in MP because globals stay at 1.0.

2) Blueprint application timing vs first render
   - Files: src/App.tsx (mode switch, blueprint mapping)
   - Fix underway: moved blueprint/economy/research application to sync effect before mode switch.
   - Risk: Any later effect or fallback re‑initialization can overwrite class blueprints with defaults; ensure no post‑setup resets.

3) Seed fallback vs server blueprintIds
   - Files: src/App.tsx, src/multiplayer/blueprintHints.ts
   - Risk: Using INITIAL_BLUEPRINTS for fallback when server provided ids/hints could diverge visuals/functions. Ensure fallback only when neither ids nor hints exist.

4) Server snapshot "parts" vs "partIds"
   - Files: convex/gameState.ts, src/App.tsx fromSnapshotToShip
   - Risk: Sending shallow `parts: [{id}]` can cause client to prefer incomplete parts over catalog mapping, producing mismatched stats/labels. Use partIds only; client maps to catalog, with synthetic extras only for server‑only stats.

5) Rare tech chance global
   - Files: src/game/shop.ts (setRareTechChance), src/App.tsx (sync effect applies mods.rareChance)
   - Acceptable in MP because each client is isolated runtime; still document and test that shop rolls happen after setting rareChance.

6) Capacity cap timing
   - Files: src/App.tsx (setCapacity with cap max), hangar.ts (fits/cost depends on capacity)
   - Ensure capacity is applied before any capacity‑dependent UI or seed operations.

7) Persistence spillover in MP
   - Files: src/game/storage.ts (saveRunState / evaluateUnlocks)
   - Risk: MP could write SP persistence unintentionally. Ensure MP avoids saving SP run state or writes under a separate key namespace.

## Implementation Plan (TDD)

Phase 0 — Branch & Scaffolding
- Work on current branch: feature/multi-faction-loss.
- Add plan + TODOs under coding_agents/; keep types strict (no any/unknown).

Phase 1 — Economy Mods In Hangar/Outpost (MP Isolation)
- Add WithMods variants in hangar:
  - canBuildInterceptorWithMods(resources, capacity, tonnageUsed, econMods)
  - buildInterceptorWithMods(blueprints, resources, tonnageUsed, capacity, econMods)
  - upgradeShipAtWithMods(idx, fleet, blueprints, resources, research, capacity, tonnageUsed, econMods)
  - expandDockWithMods(resources, capacity, econMods)
- Update OutpostPage to not call getEconomyModifiers directly:
  - Accept `economyMods: EconMods` prop OR accept precomputed costs from App.
  - Use WithMods functions for computed labels (dockCost/buildCost/upgradeCost/rrInc).
- App.tsx:
  - Compute `const economyMods = getCurrentPlayerEconomyMods()` in MP; pass down to OutpostPage and use WithMods adapters when invoking hangar actions.
- TDD:
  - New test: src/__tests__/mp_economy_hangar_isolation.spec.ts
    - MP Industrialists: build/upgrade/dock costs reflect 0.75 multipliers.
    - MP non‑Industrialists: unaffected by Industrialist multipliers.
    - SP path uses legacy (no regression).

Phase 2 — First‑Render Blueprint Parity
- Guarantee blueprintIds→parts mapping before mode='OUTPOST'.
- Guard against any re‑initialization of blueprints after setup begins.
- TDD:
  - src/__tests__/mp_blueprint_first_render.spec.tsx
    - Warmongers see Cruiser blueprint and seeded Cruiser on first render.
    - Raiders/Timekeepers/Collective blueprints show Antimatter/Disruptor/Auto‑Repair respectively.
    - Scientists show T2 items with higher rare chance affecting initial shop composition (probabilistic check with seeded RNG or count threshold).

Phase 3 — Server Snapshot Shape (partIds only)
- convex/gameState.ts: Remove `parts: [{id}]` from seeded snapshots; include only `partIds` for deterministic mapping.
- src/App.tsx fromSnapshotToShip: Always map using partIds when present; ignore `parts` unless fully‑typed/complete.
- TDD:
  - src/__tests__/mp_server_snapshot_shape.spec.ts
    - Client reconstructs ships correctly from partIds; no reliance on shallow parts.

Phase 4 — Outpost Parity Harness (SP vs MP)
- Create a parity test harness that derives an “OutpostState” snapshot from SP initNewRun and from mocked MP playerStates.
- Assert parity for each faction across:
  - research tiers, blueprint part ids per class, economy modifiers applied to costs/labels, startingFrame, capacity cap, shop size/rare chance effect (seed RNG if needed).
- TDD:
  - src/__tests__/sp_mp_outpost_parity.spec.tsx

Phase 5 — Ready/Validity Guarding
- Keep snapshot submit + fleetValid enforcement; verify “Start Combat” remains disabled until both snapshots present and valid.
- TDD:
  - src/__tests__/ready_guard.spec.ts (extend): gate respects fleetValid, snapshots, and readiness toggles.

Phase 6 — Persistence Hygiene (MP)
- Scope saveRunState/evaluateUnlocks away from MP or add `mode` guard to avoid polluting SP continuity.
- TDD:
  - src/__tests__/mp_persistence_hygiene.spec.ts

## Success Criteria

Automated
- All new tests pass:
  - mp_economy_hangar_isolation.spec.ts
  - mp_blueprint_first_render.spec.tsx
  - mp_server_snapshot_shape.spec.ts
  - sp_mp_outpost_parity.spec.tsx
  - ready_guard.spec.ts updates
  - mp_persistence_hygiene.spec.ts
- Typecheck clean (no any/unknown): `npm run typecheck`.
- Lint/format clean: `npm run lint` and `npm run fmt` (or project scripts).
- Build succeeds: `npm run build`.

Manual (player experience)
- Warmongers: First Outpost shows Cruiser class blueprints and deployed Cruisers; costs reflect 1.0 multipliers.
- Industrialists: See 0¢ initial rerolls and 0.75× costs for build/upgrade/dock; opponent unaffected.
- Scientists: T2 research reflected in shop immediately; research labels/prices correct.
- Raiders/Timekeepers/Collective: Class blueprints reflect Antimatter/Disruptor/Auto‑Repair respectively; initial ships visually match parts.
- No flicker to default blueprints on first render; no cross‑player contamination.

## Risks & Mitigations
- UI cost labels drift from underlying actions — Mitigate by routing both labels and actions through WithMods functions.
- Snapshot “parts” reintroduction regresses client mapping — Guard with explicit test and prefer partIds.
- Order‑of‑operations regressions — Add invariant tests ensuring mode switch occurs after faction applications.

## Rollout Notes
- Implement Phase 1 first to fix visible MP economy discrepancies in Outpost.
- Land Phases 2–4 with tests to harden first‑render parity.
- Finish with hygiene + guards (Phases 5–6).

## Pointers
- Server: convex/gameState.ts (initializeGameState, submitFleetSnapshot)
- Client: src/App.tsx (setup/sync effects; mode switch; seed fallback)
- UI: src/pages/OutpostPage.tsx (avoid direct globals; accept `economyMods`)
- Hangar: src/game/hangar.ts (add WithMods variants; stop using global in MP path)
- Shop/Research: src/game/shop.ts, src/game/research.ts (WithMods exist; ensure usage)

