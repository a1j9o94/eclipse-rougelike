# Core Engine Determinism — Combat RNG + Enemy + Sim Agent

Mission
- Extend determinism into combat. Introduce a pure enemy generator and a headless simulation harness. Keep UI/API compatibility.

Acceptance Criteria
- `useCombatLoop` accepts optional `rng?: Rng` and threads it into all random decisions in combat.
- `src/engine/enemy.ts` implements `buildEnemyFleet({ sector, difficulty, opponent, rng })` with unit tests.
- `src/engine/sim.ts` provides `startCombat(state, rng)` and `stepCombat(state, rng)` wrappers using existing engine internals (or stubs that call current logic) with tests.
- Tests prove deterministic combat logs or state deltas across steps for a fixed seed (golden snapshots where reasonable).
- No changes to `src/GameRoot.tsx`, `src/controllers/*`, or any `src/mp/*` files.
- Lint/type/tests green.

Allowed Files
- Create/modify:
  - `src/engine/enemy.ts`, `src/engine/sim.ts`
  - `src/hooks/useCombatLoop.ts` (add `rng?: Rng` param; default preserves existing behavior)
  - Tests: `src/__tests__/engine_enemy.spec.ts`, `src/__tests__/sim_smoke.spec.ts`, extend existing combat tests if needed
- Do not modify: `src/GameRoot.tsx`, `src/controllers/*`, `src/mp/*`, `src/components/*`

Hints
- Use `createRng(seed)` from `src/engine/rng.ts` in tests.
- Prefer small, focused tests that assert order/values (initiative selection, target picks, etc.) remain stable with a seed.

Initial Tasks (do these first)
1) Add failing tests:
   - `src/__tests__/engine_enemy.spec.ts` — expect `buildEnemyFleet({sector,difficulty,opponent,rng})` to return same ids per seed.
   - `src/__tests__/sim_smoke.spec.ts` — use `createRng(123)` to run a short combat via `startCombat/stepCombat` and snapshot a few log lines.
2) Implement `src/engine/enemy.ts` as a thin adapter around current `src/game/enemy.ts` but taking an `Rng` and not using global randomness.
3) Implement `src/engine/sim.ts` that wires `applyOutpostCommand` (existing engine) + combat wrappers. If needed, add minimal glue code; do not edit UI.
4) Thread optional `rng?: Rng` through `useCombatLoop` (already partially done) — ensure compile and tests pass.
5) Keep PR small; update docs if behavior requires a note.

Prompt
```
You are the Core Engine Determinism — Combat RNG + Enemy + Sim Agent.
Objective: Make combat deterministic by threading `Rng` through `useCombatLoop` and adding a pure enemy generator and headless sim harness. Keep existing behavior by default (no breaking changes for callers).
Scope: Only change files listed as allowed. Keep lint/type/tests green. Write tests first, then implement.
Steps: tests → enemy.ts → sim.ts → thread rng through useCombatLoop (non-breaking) → make tests pass.
```
