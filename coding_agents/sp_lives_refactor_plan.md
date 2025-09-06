# SP Lives Refactor — Plan

Date: 2025-09-06
Branch: feature/sp-lives-config
Owner: coding_agents

## Goal
Fix the single‑player "Hard shows immediate loss" confusion by making lives an explicit difficulty property, and by using only the lives counter to decide defeat. Remove implicit coupling to a "defeat policy" for SP flow while keeping a compatibility shim for any existing references.

## Why
- The current code infers lives from `getDefeatPolicy(difficulty)`; Hard maps to `reset`, which yielded `0` lives and could be interpreted as an instant loss. Lives should be a first‑class setting to avoid ambiguity.
- Using only `livesRemaining` to determine end of run is clearer and matches the UI (hearts counter).

## Changes
- shared/difficulty.ts
  - Add `lives: number` to `DifficultySpec`.
  - Set: Easy=1, Medium=1, Hard=0.
  - Add `getStartingLives(difficulty)`.
  - Keep `getDefeatPolicy()` as a shim that derives from lives (lives>0 ⇒ grace, else reset).
- App.tsx
  - Initialization: replace policy‑based lives with `getStartingLives()`.
  - Defeat resolution: rely solely on `livesRemaining` (remove policy check).
  - Back‑compat: preserve old `graceUsed` save support.

## Tests
- New: `src/__tests__/sp_hard_lives_config.spec.ts`
  - Asserts lives per difficulty and policy shim mapping.
- Existing suites pass (multiplayer unaffected).

## Risks / Mitigations
- Old code paths reading `getDefeatPolicy()` still work due to shim.
- Saves with `graceUsed` continue to load via back‑compat branch.

## Acceptance Criteria
- Selecting Hard no longer implies an immediate run loss; the player starts with 0 lives and only loses the run upon an actual defeat.
- Easy/Medium initialize with 1 life.

## Follow‑ups (optional)
- Consider showing a small tooltip in StartPage for difficulties describing starting lives explicitly.

