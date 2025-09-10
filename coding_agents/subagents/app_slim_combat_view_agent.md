# App Slim — Combat View State Agent

Mission
- Extract remaining combat view state from `src/GameRoot.tsx` into a small hook `src/controllers/useCombatViewState.ts` and wire it, reducing GameRoot LOC without changing behavior.

Acceptance Criteria
- New hook `useCombatViewState` encapsulates state and setters for: `enemyFleet`, `log`, `roundNum`, `queue`, `turnPtr`, `combatOver`, `outcome`.
- GameRoot consumes this hook and passes the resulting object to GameShell’s combat props.
- No changes to combat logic (do not edit `useCombatLoop.ts`); only view-state extraction and wiring.
- Add a small test (if practical) to assert the hook’s initial/default values and setter behavior (unit-level with simple React testing utilities).
- GameRoot LOC decreases meaningfully (target: -40 lines or more) and continues to compile and pass tests.

Allowed Files
- Create: `src/controllers/useCombatViewState.ts`
- Modify: `src/GameRoot.tsx` (minimal wiring changes only)
- Tests: `src/__tests__/hooks_useCombatViewState.spec.ts`
- Do not modify: `src/hooks/useCombatLoop.ts`, `src/engine/*`, `src/mp/*`

Prompt
```
You are the App Slim — Combat View State Agent.
Objective: Move combat view state from GameRoot into a dedicated hook, wire it in, and keep behavior identical.
Scope: Only change files listed above. Keep lint/type/tests green. Keep edits to GameRoot minimal and focused on wiring.
Steps: add hook → use in GameRoot → tests (optional but preferred) → ensure build green.

Initial Tasks (do these first)
1) Create `src/controllers/useCombatViewState.ts` with typed setters (no `any`).
2) Replace local combat state in `src/GameRoot.tsx` with the hook; keep the order of hooks stable.
3) Adjust `useRunLifecycle` and `useAutoStepper` callsites to use the new state.
4) Add `src/__tests__/hooks_useCombatViewState.spec.ts` with a minimal renderHook test verifying initial values and a couple of setter interactions.
5) Run `npm run lint && npm run typecheck && npm run test:run`.
```
