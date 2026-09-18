# UX P3: functional ship fitting

## Outcome
Ship fitting now presents usable components by their tactical function, makes the class-wide effect and changed performance legible, and preserves the authoritative upgrade ordering and ancient-part restrictions.

## Implementation evidence
- `fittingPlanning.ts` is a pure public UI inventory. It groups grid parts as Weapons, Drives, Reactors, Defense, Computers, and Special, while `validateBlueprint` and `planBlueprintUpgrade` still decide legality and ordering.
- Ancient availability is counted from stored copies. A selected stored ancient is reserved in the draft; an ancient already on the current or another blueprint is blocked with a non-relocation explanation. The editor exposes optional `installedAncientParts` for the board to supply other-class ownership.
- `BlueprintEditor.tsx` leads with class-wide scope, functional groups, stored Ancient copy/consumption feedback, exact `Apply N upgrades`, and changed statistics. Unchanged statistics are available in a disclosure. Existing action-draft keys continue to retain each class draft and selected hardpoint.
- Outside-grid parts remain separate and permanent restrictions continue to be checked by the shared upgrade plan.

## Test evidence
- Fail-first helper tests cover tactical grouping, stored Ancient counts, and relocation restrictions.
- Editor coverage covers a functional group, stored Ancient install, exact upgrade count, blocked relocation, permanent outside-grid display, and existing persistent draft behavior.
- Passed: `npx vitest run src/__tests__/second_dawn_blueprint_editor.spec.tsx src/__tests__/second_dawn_fitting_planning.spec.ts src/__tests__/second_dawn_action_drafts.spec.tsx --pool=forks --maxWorkers=1` (18 tests).
- Passed: `npm run typecheck -- --pretty false`.

## Board integration
Pass `installedAncientParts` as the current player's ancient parts across all blueprints. This is public player-board data and lets the editor distinguish another-class ownership from a part that has never been acquired.
