# planning_agent

## Charter
Maintain the step plan and ensure exactly one in-progress step at all times. Triage blockers and synchronize sub-agents.

## Immediate TODOs
- [ ] Sanity-check `coding_agents/step_by_step_plan.md` for scope creep.
- [ ] Create placeholder issues/tasks in `coding_agents/task_board.md` with owners.
- [ ] Align test naming and locations with current test runner.

## Status Log
## 2025-09-07 13:30 — Phase 0C plan drafted
- Outcome: Thin `src/GameRoot.tsx` by extracting gameplay handlers, MP navigation/sync, and lifecycle into hooks/controllers so GameRoot acts as a shell. Keep App at 1-line. No behavior changes.
- Acceptance criteria:
  - GameRoot ≤ ~200 LOC in this phase (target), contains only composition, state wiring, and view routing; no inline business logic.
  - Outpost actions (`buy/sell/build/upgrade/dock/reroll/research/startCombat`) route through `OutpostIntents` + `applyOutpostCommand` and emit typed `OutpostEffects`; UI triggers effects via `useEffectsRunner` only.
  - MP/SP parity: guards (local+server validity), seed/submit, phase navigation work unchanged; tests remain green.
  - New selectors/handlers covered by unit tests; no `any` on public types.
- Risks & rollback:
  - Risk: UI regressions from splitting logic; Mitigation: incremental PRs with green gates, keep a feature flag to fall back to current GameRoot implementation.
  - Risk: Type churn while moving helpers; Mitigation: stabilize `engine/*` types, re-export through adapters.
- Test list (write failing first, then implement):
  - MUST FAIL: `mp_research_persistence.spec.tsx` (persist research/resources via `updateGameState` on research).
  - MUST FAIL: `selectors/fleet_validity.spec.ts` (server/local validity combination rules as pure function).
  - MUST FAIL: `effects/start_combat.spec.ts` (dispatching `startCombat` intent emits effect once; sink calls provided `startCombat` exactly once).
  - SHOULD FAIL: `hooks/useMpPhaseNav.spec.tsx` (phase → routing: setup→game view, combat→mode switch, finished→lobby/winner modal).
  - SHOULD FAIL: `hooks/useOutpostHandlers.spec.ts` (maps UI intents to engine; reroll bumps version/cost, research drains science with mods).
  - NICE: `gameroot_line_budget.spec.ts` (guard GameRoot LOC <= budget; optional script `check:gameroot-lines`).

Next actions:
- Create `src/hooks/useMpPhaseNav.ts`, `src/hooks/useRunLifecycle.ts` with tests.
- Migrate remaining inline functions from GameRoot into those hooks; wire via context/props.
- Add a Decision Log entry to the design doc aligning on `src/engine/*` naming (vs `src/game/*`).

Tooling notes:
- package.json has `orchestrator` pointing to missing `orchestrator.sh`. Either add the script later or remove the script entry to avoid confusion.

Progress 2025-09-07 14:08
- Implemented `useOutpostHandlers` + tests; integrated into GameRoot.
- Added `selectors/guards.ts` + tests and updated GameRoot to consume.
- Extracted `useMpPhaseNav` + tests and wired into GameRoot.
- Extracted `useRunLifecycle` (victory + defeat) and replaced GameRoot's return-from-combat logic; tests cover defeat path.

## 2025-09-06 09:00 — Seeded
- Context: Kickoff docs created.
- Next: Populate task_board.md and confirm test runner command.
- Decisions: Use `update_plan` for high-level tracking; file-based for detail.
- Questions: Do we prefer `pnpm` or `npm` in this repo?
