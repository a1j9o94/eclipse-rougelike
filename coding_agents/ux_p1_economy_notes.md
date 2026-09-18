# UX P1 economy capacity

## Outcome

The economy summary leads with the number of additional ordinary action discs the player can afford this round. Action planners show the corresponding `After this` capacity from the command preview.

## Implementation

- Added `affordableActionCapacity` in `upkeepForecast.ts`. It calculates the largest affordable additional action-disc count from money, projected income, the upkeep track, and available influence discs.
- The selector distinguishes affordable, unfunded, no-discs, passed, and eliminated states. It is explanatory only and does not affect command legality.
- Added `upkeepForecastAfter` so `ActionEconomy` derives its after-this number from the existing command preview's money, income, and influence projection.
- Reworked the round-end summary disclosure to include discs, the formula, explicit assumptions, ongoing-action semantics, and the fact that a shortfall is not a legality gate.
- Follow-up review: the capacity sentence is now the primary visual summary; round-end upkeep is subordinate. Passed and non-action phases omit the `Next action` teaser. A null planner preview reads `Current forecast`, while its separately labeled `If started` line shows the hypothetical disc bill.

## TDD evidence

Added `second_dawn_affordability_capacity.spec.tsx` before implementation. Its initial run failed because `affordableActionCapacity` did not exist and the headline was absent. It now covers exact upkeep thresholds, current shortfall, passed/eliminated/no-disc states, tap disclosure, an authoritative draft projection, funded money spending, ongoing activations, projected influence/income changes, conditional income, and non-action-phase wording.

## Validation

- `npx vitest run src/__tests__/second_dawn_affordability_capacity.spec.tsx src/__tests__/second_dawn_upkeep_summary.spec.tsx src/__tests__/second_dawn_action_economy.spec.tsx` — 12 passing tests.
- `npx eslint src/second-dawn-game/ActionEconomy.tsx src/second-dawn-game/upkeepForecast.ts src/second-dawn-game/UpkeepSummary.tsx src/__tests__/second_dawn_affordability_capacity.spec.tsx` — passing.
- `npm run build` during parallel development found temporary type errors in the new research component/integration. Those were feature-work errors, not baseline debt; final combined build evidence is recorded in `ux_p1_execution.md`.
- `npm run lint` has repository-wide pre-existing errors in Convex and legacy files; the targeted files pass lint.

## Board seam

No board integration is required for the global headline: `SecondDawnBoard.tsx` already renders `<UpkeepSummary view={view}/>` in the desktop header. Keep that import and call unchanged. For any alternate/mobile header that does not render it, import `UpkeepSummary` from `./UpkeepSummary` and pass the same `view` object.
