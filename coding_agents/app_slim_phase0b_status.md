App Slim/Refactor — Phase 0B Status (2025-09-07)

Overview
- Goal: Continue slimming App.tsx by moving UI‑agnostic logic into adapters/engine while keeping behavior identical and MP/SP parity intact.
- Today’s scope: establish typed command mapping for Outpost actions, scaffold engine modules, and rewire App to use the adapter without changing UX.

What Landed
- Engine scaffold
  - src/engine/state.ts: OutpostState/OutpostEnv — minimal shape used by Outpost commands.
  - src/engine/commands.ts: OutpostCommand union + applyOutpostCommand delegating to outpostController; returns optional effects (startCombat, warning).
  - src/engine/effects.ts: placeholder effect sink (future wiring).
- Adapter
  - src/adapters/outpostAdapter.ts: Intent helpers that return typed commands (buy/sell/build/upgrade/dock/start).
- App integration
  - src/App.tsx now routes Outpost actions through applyOutpostCommand via a small helper `applyOutpost(cmd)`:
    - buyAndInstall → OutpostIntents.buyAndInstall(part) + sound ‘equip’.
    - sellPart → OutpostIntents.sellPart(frameId, idx) + validity warning if needed.
    - buildShip → OutpostIntents.buildShip().
    - upgradeShip → OutpostIntents.upgradeShip(idx).
    - upgradeDock → OutpostIntents.upgradeDock() + sound ‘dock’.
    - No behavior changes expected; multiplayer economy still respected via `getCurrentPlayerEconomyMods()`.
- Tests
  - src/__tests__/outpost_command_mapping.spec.ts covers buy/sell/build/upgrade/dock via commands (MP env). All green.
  - Stabilized MP guards spec; removed a slow UI snapshot spec and replaced with a fast unit test for snapshot mapping.

Design Notes / Invariants
- MP/SP parity: env.gameMode + economyMods flow through engine to controllers; no logic fork in App.
- Idempotent blueprint sync in App useEffects left intact; this change only touches Outpost action handlers.
- Command layer returns effects but state updates remain in React via existing setters — no state ownership change yet.
- Types are strict; no anys in new code.

File Map (new/changed)
- New: src/engine/state.ts, src/engine/commands.ts, src/engine/effects.ts, src/adapters/outpostAdapter.ts.
- Changed: src/App.tsx (handlers now use adapter/engine), tests under src/__tests__/…

How To Continue (Phase 0 → 1 steps)
1) Complete command coverage
   - Add commands and tests for: reroll, researchTrack, researchLabel/canResearch helpers as selectors or pure fns.
   - Introduce a `ShopCommand` slice if helpful (or keep OutpostCommand simple).
2) Introduce engine entrypoint (optional now)
   - src/engine/engine.ts: single `apply(state, env, cmd)` that dispatches to modules.
   - src/engine/controller.ts: thin wrapper to hold state + provide a stable interface for UI.
3) Split remaining UI‑agnostic helper logic from App.tsx into engine/ or controllers/
   - Keep MP effects in App effects for now to avoid regressions.
4) Wire tests
   - Add failing-first specs for reroll/resources/research parity in MP.
   - Maintain ready/validity guards coverage.

Success Criteria
- App.tsx continues to compile and pass all tests with zero behavior changes.
- Outpost actions rely exclusively on adapter/engine.
- New command tests cover core behaviors (credits/materials deltas, fleet/blueprints, focus, capacity).

Known Gaps / Flags
- One React-hooks warning remains in App.tsx (missing dep ‘multi’); intentionally left to avoid changing effect behavior during Phase 0B.
- ‘start_combat’ intent currently only signals `effects.startCombat`; App still uses existing startCombat path due to MP specifics.

Quick Start for New Agents
- Run tests: `npm test` (or `npm run test:run`)
- Lint: `npm run lint`
- Build: `npm run build`
- App.tsx baseline line count: 990 (use `npm run check:app-lines` to track; limit will be applied when nearing completion).
- Touch points to modify next:
  - Add `Reroll` and `Research` commands (src/engine/commands.ts) and adapter creators.
  - Extend `outpost_command_mapping.spec.ts` with failing tests, then implement.
  - Do not alter App useEffects sync behavior in this phase.
