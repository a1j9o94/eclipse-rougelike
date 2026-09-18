# UX P5: public history, recap, and score inspection

## Outcome
Players can inspect a public history reference or a public score category without changing a draft or issuing a command. Historical references are clearly distinguished from the current public board.

## Implementation
- `PublicInspectionContext.tsx` exposes the typed request union for history entries and score categories.
- `PublicInspectionModal.tsx` includes a local-camera `GalaxyBoard` for current public contributor-sector highlights, leaving the underlying board camera and action draft untouched.
- `publicInspection.ts` reconciles values with `runningScore` and derives public spatial contributors for sectors, monoliths, portals, Planta species, and Draco Ancient sectors. It also explains research tracks with their public technologies and threshold VP, ambassador relationships, and frozen eliminated scores without inventing historical contributors.
- History and recap provide optional inspection links and retain their ordinary chronology. The recap includes a concise public action count.
- History renders every `combatVolleys` item while preserving the legacy single-volley fallback.

## Verification
- Added context/modal, score reconciliation, research detail, and recap interaction coverage.
- Passed: `npx vitest run src/__tests__/second_dawn_public_inspection.spec.tsx src/__tests__/second_dawn_history_panel.spec.tsx src/__tests__/second_dawn_activity_recap.spec.tsx --pool=forks --maxWorkers=1` (8 tests).
- Passed: `npm run typecheck -- --pretty false`.

## Board integration
Wrap the board in `PublicInspectionProvider`, render `PublicInspectionModal`, and route category buttons through `usePublicInspection().request`. The modal supplies its own current public-board map and camera.

## Accessibility follow-up
The public inspection modal now takes focus, traps Tab within its controls, closes on Escape, and restores focus to the trigger. Historical references without a current sector explain that absence instead of rendering an empty map. Public research and upgrade presentations include concrete technology and class labels.
