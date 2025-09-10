# Core Engine Determinism Agent

Mission
- Make the core game deterministic and easily testable by introducing a seedable RNG, extracting a pure enemy generator, and providing a headless simulation harness. Keep single-player and multiplayer behavior identical for existing flows.

Outcomes (Acceptance Criteria)
- Deterministic RNG available via `src/engine/rng.ts` with a typed `Rng` interface and `createRng(seed)` factory. No use of `Math.random` in engine codepaths covered by this scope.
- Pure enemy generator `buildEnemyFleet(sector, difficulty, opponent, rng)` in `src/engine/enemy.ts` with unit tests (golden expectations per seed).
- Headless sim in `src/engine/sim.ts` that can run outpost commands and combat steps without React. Minimal CLI smoke test via unit tests.
- Shop rolls deterministic: `rollInventory(research, count, rng?)` supports injected RNG and defaults to existing behavior when not provided; tests prove determinism.
- No public API regressions; existing callers work. Lint/type/build + existing tests remain green.

Strict File Boundaries (No Overlap With MP Transport Agent)
- You MAY create/modify:
  - `src/engine/rng.ts` (new)
  - `src/engine/enemy.ts` (new)
  - `src/engine/sim.ts` (new)
  - `src/game/shop.ts` (add optional `rng?: Rng` param; keep defaults)
  - `src/hooks/useCombatLoop.ts` (optional: accept `rng?: Rng` passed through; keep defaults)
  - Tests: `src/__tests__/engine_rng.spec.ts`, `src/__tests__/engine_enemy.spec.ts`, `src/__tests__/sim_smoke.spec.ts`
  - Docs (if needed): `docs/engine_testing.md`
- You MUST NOT modify:
  - `src/GameRoot.tsx`, `src/controllers/*`, `src/hooks/useMp*`, `src/mp/*` (reserved to MP Transport Agent)
  - `src/components/*`
  - Any file under `src/mp/` (owned by MP Transport Agent)

Key Interfaces
```ts
// src/engine/rng.ts
export interface Rng { next(): number; }
export function createRng(seed: number | string): Rng

// src/engine/enemy.ts
import type { Rng } from './rng'
export function buildEnemyFleet(params: { sector: number; difficulty: string; opponent: string; rng: Rng }): Ship[]

// src/engine/sim.ts
import type { Rng } from './rng'
export function runOutpostCommand(state: OutpostState, cmd: OutpostCommand): { next: OutpostState; effects?: OutpostEffects }
export function startCombat(state: FullState, rng: Rng): CombatState
export function stepCombat(state: CombatState, rng: Rng): CombatState
```

Test Plan
- engine_rng.spec.ts: same seed -> same number sequence; different seeds -> different sequences.
- engine_enemy.spec.ts: buildEnemyFleet deterministic per seed/sector; sanity checks on tonnage/cost tiers.
- sim_smoke.spec.ts: run a short headless loop (buy -> start -> resolve -> rewards) and assert stable outcome per seed.

Implementation Steps
1) Add `rng.ts` using Mulberry32 (fast, stable). Export `createRng` and an adapter `fromMathRandom()`.
2) Update `game/shop.ts` signatures to accept optional `rng?: { next(): number }`; default to `fromMathRandom()` so UI remains unchanged.
3) Implement `engine/enemy.ts` with pure generation using `rng`.
4) Implement `engine/sim.ts` harness calling existing engine commands and new combat entry points.
5) Add tests; wire `npm run test:run`.
6) Ensure `npm run lint && npm run typecheck && npm run test:run` green.

Command Hints
```bash
npm run lint && npm run typecheck && npm run test:run
```

Anti‑Goals
- No UI changes; do not touch GameRoot, GameShell, or OutpostPage.
- No multiplayer transport changes.

Deliverables
- New engine modules + tests; documentation notes in `docs/engine_testing.md` (optional but preferred).

Agent Prompt (paste into your agent)
```
You are the Core Engine Determinism Agent working in this repo.
Objective: add a seedable RNG, extract a pure enemy generator, and provide a headless sim harness, keeping all existing behavior compatible.
Scope: ONLY touch files listed under “You MAY create/modify” in coding_agents/subagents/core_engine_agent.md. Do not edit MP or UI files.
Constraints: no regressions; lint/type/tests must pass; no any at public boundaries.
Steps: implement rng.ts → update shop.ts signature (optional rng) → enemy.ts → sim.ts → tests.
Finish when all acceptance criteria in the doc are met and all checks are green.
```

