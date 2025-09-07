# App Slim Refactor — Prune Checklist (Phase 0 → 0B)

Status: active • Owner: coding agent • Branches: `feature/app-slim-phase0b`, `feature/app-slim-phase0c`

Goal: Reduce `src/App.tsx` to ~50 lines where App acts only as a composition root and lightweight router. All game logic, effects, and MP sync live outside App behind typed boundaries. Keep SP/MP parity and current player experience. Commit frequently; each commit must pass lint and build. Intentional failing tests are allowed when explicitly noted in the commit message.

How to use: Treat each item as a mini-task with acceptance criteria. Check off only when criteria are met and lint/build are green.

## Ground Rules

- [ ] CI hygiene: `npm run lint && npm run build` green on every commit.
- [ ] TDD hygiene: for new engine hooks/routers/effects, write a failing test first (ok to commit) then make it pass.
- [ ] Types: no `any`/`unknown` on public boundaries.
- [ ] SP/MP parity: new code paths must work in both modes identically where applicable.

## Checklist

1) Baseline snapshot
- [ ] Acceptance: Capture App.tsx line count baseline in `coding_agents/app_slim_phase0b_status.md` and keep updated per commit.

2) Enumerate App responsibilities
- [ ] Acceptance: Document current props/state/effects App touches (list) in `app_slim_phase0b_status.md`.

3) Define target architecture boundaries
- [ ] Acceptance: One-paragraph boundary descriptions for Engine, Adapters, Effects Runner, MP Sync, Selectors, Router in `app_slim_refactor_design.md`.

4) Public engine surface finalized
- [ ] Acceptance: Exported types `OutpostState`, `OutpostCommand`, `OutpostEffects`, `applyOutpostCommand(state, env, cmd)` are stable and imported only through engine entry.

5) Adapter intents complete
- [ ] Acceptance: `OutpostIntents` covers buy/sell/build/upgrade/dock/start/reroll/research without importing UI.

6) Reroll/Research wired via engine
- [ ] Acceptance: App no longer calls legacy reroll/research paths; tests cover credits/science deltas, reroll cost bump, shop version.

7) Centralize warnings and UX effects
- [ ] Acceptance: Warnings, sound triggers, and dialog intents come from `OutpostEffects` rather than inline App strings.

8) Start combat converted to command
- [ ] Acceptance: `start_combat` emits `effects.startCombat` consumed by Effects Runner; no App inline handler logic beyond dispatch.

9) Effects Runner hook in place
- [ ] Acceptance: `useEffectsRunner(effects$)` processes warning/sound/timer/startCombat; covered by unit tests (exactly-once semantics).

10) MP sync hook extracted
- [ ] Acceptance: `useMpSync(engine$)` encapsulates snapshot application, idempotence guard, debounce; App has no MP-specific `useEffect`.

11) Round tick isolated
- [ ] Acceptance: `useRoundTick(engine$)` drives ticks without causing re-render loops; test verifies no infinite renders.

12) Snapshot mapping pure + tested
- [ ] Acceptance: Pure mapper remains outside App with unit tests; App does not touch mapping logic.

13) Selectors layer added
- [ ] Acceptance: UI derives labels and booleans via `selectors/*`; App passes only selected props down.

14) Screen router extracted
- [ ] Acceptance: `GameRoot.tsx` (or `useScreenRouter`) handles SP/MP screens; App renders root only.

15) Engine provider added
- [ ] Acceptance: `EngineProvider` supplies state/dispatch; App uses provider and renders children.

16) Remove remaining App handlers
- [ ] Acceptance: No inline action handlers in App; handlers live in feature components or adapters.

17) Remove remaining App effects
- [ ] Acceptance: No `useEffect` in App except optional telemetry mount; tests confirm behavior unchanged.

18) Delete dead code
- [ ] Acceptance: Remove unused utils/handlers/props left behind; tree-shakeable build shows no references.

19) Enforce line budget
- [ ] Acceptance: `tools/check-app-lines.mjs` exists; add npm script `check:app-lines` and record line count in status doc.

20) SP/MP parity sanity runbook
- [ ] Acceptance: Add a short manual checklist in `coding_agents/step_by_step_plan.md` to sanity-check both modes.

21) Expand tests where needed
- [ ] Acceptance: Tests for effects once-only, MP double-apply guard, selectors under economy mods.

22) Final docs pass
- [ ] Acceptance: Update `implementation_agents.md` with final architecture and refactoring notes.

23) App file ≤ ~50 lines
- [ ] Acceptance: `src/App.tsx` ≤ 60 lines hard cap (target ~50), measured by the guard script.

### Phase 0C — GameRoot thinning
- [x] Extract `useOutpostHandlers` and swap all inline handlers in `GameRoot.tsx`.
- [x] Extract `useMpPhaseNav` and remove phase-navigation `useEffect` from `GameRoot.tsx`.
- [x] Extract `useRunLifecycle` and wire it to replace `handleReturnFromCombat` in `GameRoot.tsx` (victory + defeat)
- [ ] Add `selectors/guards.ts` and refactor fleet validity logic to use it (pure + unit-tested).
  - Done via `selectors/guards.ts` and `selectors/mpGuards.ts`.
- [ ] GameRoot LOC ≤ ~200 for this phase; add optional `check:gameroot-lines` script but do not gate CI yet.
  - Note: `npm run check:gameroot-lines` available; not part of CI.

Additions for 0C (done)
- [x] Add `useResourceBarVm` to assemble SP/MP ResourceBar props.
- [x] Add `useOutpostVm` to centralize MP guards, combined validity, start toggle, and restart logic.
- [x] Normalize shop items after research/reroll to enforce current tier caps; simplify ItemCard tier label.

## Run Commands

Common ones to keep things green:

```bash
npm run lint && npm run typecheck
npm run test:run   # forks pool; basic reporter
npm run build
npm run check:app-lines
npm run orchestrator  # spawns planning/tests/engine agents; logs under coding_agents/logs/
```

## Definition of Done

- `src/App.tsx` ≤ ~50 lines and contains only composition/root routing.
- All handlers/effects/logic live outside App behind typed boundaries.
- Lint, tsc, build are green; tests pass or intentionally failing tests are clearly marked in commits.
- Docs in `coding_agents/*` reflect final architecture and provide a runbook for future contributors.
