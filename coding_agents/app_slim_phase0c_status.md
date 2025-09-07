App Slim/Refactor — Phase 0C Status (2025-09-07)

Overview
- Goal: Slim `src/GameRoot.tsx` by extracting gameplay handlers, MP phase navigation, and lifecycle into hooks/selectors backed by `engine/*`. Preserve behavior; App remains 1-line shell.

2025-09-07 16:45 — Progress update
- Extracted view-model hooks:
  - `useResourceBarVm` — SP/MP ResourceBar props (names, lives, phase).
  - `useOutpostVm` — MP guards, combined fleet validity, readiness toggle, and restart plumbing.
- Stabilized shop + MP readiness tests:
  - Normalized shop after research/reroll to current tier caps.
  - Simplified ItemCard meta (removed explicit “Tier N” labels) for deterministic tests.
  - CombatPage button state accessible for tests (“Resolving…” vs “Return to Outpost”).
- Added unit tests for the two new hooks.
- Build/typecheck/lint: green. Targeted test suites: green.
- Next: finish slimming `GameRoot` by moving remaining view assembly to VMs and approach the ~200 LOC target for 0C.
- Baseline: `src/GameRoot.tsx` = 880 lines (2025-09-07).

What Landed So Far (context)
- Engine + adapter for Outpost commands (`applyOutpostCommand`, `OutpostIntents`) with reroll/research added.
- `useEffectsRunner` processes startCombat/warnings and shop updates.
- MP sync helpers: `useMpTestTick`, `useMpSetupSync`.
- `App.tsx` trimmed to 1-line and implementation moved to `GameRoot.tsx` (temporary).

Scope This Phase
- Create hooks: `useOutpostHandlers`, `useMpPhaseNav`, `useRunLifecycle`.
- Move inline functions from `GameRoot.tsx` into these hooks; wire via props/context.
- Add selectors: `selectors/guards.ts` for fleet validity/guards.
- Keep Convex calls inside hooks (not in GameRoot); push game rules into engine/selectors.

Acceptance Criteria
- GameRoot ≤ ~200 LOC; contains only composition, state wiring, and view routing.
- All Outpost actions route through intents/engine and emit effects; `useEffectsRunner` is the only place we interpret them.
- MP parity: phase navigation, seeding/submission, and guards behave as before.
- Tests added for hooks/selectors (failing-first), all green by end of phase.

Risks & Rollback
- Risk: behavior drift during extraction. Rollback: keep a `feature/gameroot-slim` branch; small PRs with green gates; if needed, re-export old inline handlers for a release.

Next Steps
1) Write failing tests for: startCombat effect once-only; guards combination; research persistence in MP.
2) Implement `useOutpostHandlers` with typed inputs/outputs; adopt in GameRoot.
3) Implement `useMpPhaseNav` and replace phase-based `useEffect` in GameRoot.
4) Implement `useRunLifecycle` and swap `handleReturnFromCombat`.
5) Add `selectors/guards.ts`; refactor guards to use it.
6) Verify green: `npm run lint && npm run test:run && npm run build`.

Progress 2025-09-07 14:08
- Added `src/hooks/useOutpostHandlers.ts` and tests `src/__tests__/hooks_useOutpostHandlers.spec.tsx` (MP research persistence via updateGameState).
- Integrated handlers into `src/GameRoot.tsx`; removed inline outpost functions (applyOutpost/buy/sell/build/upgrade/reroll/research).
- Build + targeted tests green. GameRoot trimmed from 880 → 865 LOC (−15).
 - Added `src/selectors/guards.ts` + test `src/__tests__/selectors_fleet_validity.spec.ts` and used it in GameRoot for combining local/server fleet validity.
 - Extracted MP phase navigation into `src/hooks/useMpPhaseNav.ts` with tests (`hooks_useMpPhaseNav.spec.tsx`) and integrated into `GameRoot.tsx`.
- Added `src/hooks/useRunLifecycle.ts` with full victory + defeat paths; wired into `GameRoot.tsx` (replaces `handleReturnFromCombat`). Test added for defeat path; victory coverage to follow.
 - Added victory-path tests: `src/__tests__/hooks_useRunLifecycle_victory.spec.tsx`.
 - Extracted combat loop, run management, MP seeding, MP guards, ghost preview, and research UI selectors.
 - GameRoot now 613 LOC (down ~267 lines from original 880). Next: extract more combat/MP glue and state wiring to approach ~200.
