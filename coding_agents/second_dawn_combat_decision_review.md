# Combat visual-decision review

## Outcome

Combat allocation, retreat/combat-turn, tied initiative, and bombardment now
use visual ship, sector, queue, and population controls while retaining the
same persisted `resolve` commands and one final confirmation.

## Coverage

- A die's legal targets are ship cards with silhouette, owner, damage, and
  hit/miss state. Split damage uses bounded plus/minus counters and shows the
  assigned total.
- Retreats use small sector hex cards with owner and fleet facts; firing is a
  separate illustrated card. Forced retreats omit fighting and explain why.
- Initiative ties derive their owner and ship class from the public group id,
  then present a numbered, editable firing queue.
- Bombardment uses selectable planet cards and marks advanced population from
  the public sector catalog where available.

## TDD and validation

`second_dawn_decisions.spec.tsx` was changed first and failed against the old
native selects. It now verifies target-card selection, split +/- allocation,
retreat selection while disconnected, initiative queue ordering, and planet
target selection. Focused results: 10 tests passed across decision and battle
overview suites. `tsc -p tsconfig.eclipse.json --noEmit` passed.

Browser review used the deterministic combat and retreat fixtures at 1366x768,
1440x900, and 1920x1080. There was no horizontal overflow and no native select
inside the combat allocation or retreat controls. Captures are in
`coding_agents/second_dawn_revision_screenshots/` as
`*-combat-visual-allocation.png` and `1366x768-combat-visual-retreat.png`.

## Known integration issue

`DecisionPanel` now routes all non-combat persisted decisions to
`EconomyDecision`, and colonization to `ColonizationPlanner`; obsolete native
select helpers and their non-combat cases were removed. The post-combat
diplomacy integration test now drives the visual partner/resource cards. A
forced retreat with no legal destination is disabled, preventing an undefined
choice submission.

Focused decision, economy, and colonization suites passed (19 tests). The
production build passed after the concurrent diplomacy command narrowing was
completed. The inherited CSS minifier warning about a `file` utility class and
the pre-existing large-chunk warnings remain.

## Visual workflow release verification

Browser release scripts no longer select an `ActionCandidateCards` radio or a
native action select. They now drive the live interaction surfaces: technology
cards, shipyard +/- controls, selected fleet and galaxy target, influence
source/destination hex cards, colonization planet/cube controls, resource
trade controls, direct turn buttons, diplomacy cards, combat ship cards, and
retreat sector cards. Save/resume smoke now chooses an exploration frontier
tile before exercising its offline and reconnect guard.

On local port 5175, `second-dawn-action-workflows.mjs` completed all eleven
workflow/diplomacy cases against isolated authoritative fixtures. Its recorded
evidence is `coding_agents/second_dawn_gameplay_screenshots/action-workflows.json`.
`second-dawn-browser-resume.mjs` then passed guest save, reload, offline
disablement, reconnect, and the restored exploration decision. The independent
walkthrough passed its eight tasks, including the new visual combat target and
retreat controls. Script syntax checks passed for all updated release scripts.
