# P1 research-in-place evidence

## Outcome

Research selection, explanation, track choice, atomic funding, authoritative cost preview, and explicit commitment now share one research workspace on desktop and mobile. Inspecting another market or owned tile preserves an unfinished purchase. The inspector and mobile footer no longer duplicate research confirmation.

An accepted command produces an `Acquired` payoff only after the returned player view confirms ownership of the submitted tile. A receipt arriving before that view leaves the draft editable. The workflow remains on Research so remaining activations can be used.

## TDD evidence

Fail-first command:

`npm test -- --run src/__tests__/second_dawn_research_workspace.spec.tsx`

Initial result: 2 tests failed because no local named research region or draft-return control existed.

Passing bounded commands:

- `npm test -- --run src/__tests__/second_dawn_research_workspace.spec.tsx`
- `npm test -- --run src/__tests__/second_dawn_research_workspace.spec.tsx src/__tests__/second_dawn_funding_ui.spec.tsx src/__tests__/second_dawn_research_readability.spec.tsx`
- `npx eslint src/second-dawn-game/ResearchWorkspace.tsx src/second-dawn-game/SecondDawnBoard.tsx src/__tests__/second_dawn_research_workspace.spec.tsx src/__tests__/second_dawn_funding_ui.spec.tsx src/__tests__/second_dawn_research_readability.spec.tsx`
- `npx tsc -p tsconfig.eclipse.json --noEmit`
- `npx tsc -b --pretty false`

## Coverage and limits

The focused tests cover local benefit/cost/funding/commit, no generic confirmation, inspection-safe drafts, atomic submission, delayed ownership-confirmed payoff, and remaining in Research. Existing mobile shell tests provide the layout-mode harness; this slice does not add screenshot or physical-device coverage.

Integration follow-up added responsive coverage proving technology selection keeps the mobile inspector sheet closed, keyboard focus and scroll move to the local detail, accepted older submissions cannot clear or redirect a newer draft, and reduced-motion users do not receive the acquired animation. The initial full project TypeScript check exposed two new `TechnologyId` narrowing errors in `ResearchWorkspace`; both were corrected before the passing `tsc -b` run above.
