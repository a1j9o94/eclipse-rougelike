# Influence: select territory, then explicitly control it

## Outcome
A newcomer selects a sector on the galaxy and sees a specific control confirmation, while giving up an owned sector is a separate, clearly destructive choice.

## Acceptance and failing-first tests
- Map selection of an owned sector never stages or commits withdrawal; show “You already control this sector.”
- Highlight every legal control destination, including destinations requiring an explicit transfer source.
- A destination selection shows “Take control of sector N”; transfer confirmation names both the territory lost and gained.
- Withdrawal lives under “Withdraw control from a sector,” describes loss of sector VP and population return, and uses a distinct danger-styled confirmation.
- Existing exact authoritative candidates, colony-ship refresh, legality revalidation, saved drafts, and disabled submission remain intact.
- Four revised behavioral tests failed on the old UI before implementation. The final 12 planner/colonization tests plus seven draft revalidation tests pass (19 total).

## Decisions and implementation
The original planner led with “Release sector” and treated a click on an owned map hex as a removal draft. That is the dangerous ambiguity reported by the user. The primary flow now always interprets map selection as an inquiry about taking control; an owned or enemy sector produces an explanation, never removal. Direct claims use the existing add-only candidate. Transfers remain available destination-first, with an explicitly selected source and a confirmation reading “Withdraw from A and control B.” All submitted commands are supplied authoritative candidates; no rules, faction activation budgets, hidden state, or draws changed.

The selected sector and named commit share the inspector. A compact visible upkeep forecast retains money short/left; full action accounting expands in place. Destination cards show existing planet resource symbols and advanced stars. Optional `onSectorFocus` keeps list selection synchronized with the map. Existing `influenceDraft` and `influenceSource` keys preserve intentional drafts across remounts and reconnects; current candidate legality still disables obsolete choices.

## Browser and visual evidence
`tools/second-dawn-influence-clarity-review.mjs` runs the actual deterministic `workflow-influence` board. Chromium and WebKit at 1440×900 and 390×844 all passed owned-sector safe selection, map keyboard target selection, explicit control confirmation and actual preview-engine ownership change. No page errors or horizontal document overflow. Artifacts and results are in `coding_agents/second_dawn_influence_clarity_review/`.

Actual rendered desktop and mobile images were reviewed. The first review revealed inherited inspector heading/disclosure spacing pushing the confirmation too low; the revised layout keeps the selected sector, forecast and control button together. A module export typo also surfaced during the first browser load and was corrected before the successful four-case run. The existing fleet badge remains its own inspection target; sector keyboard activation and card fallback were exercised.

## Risks, rollback, follow-ups
This is UI-only and can be reverted independently. The parent handles Board wiring, integrated lint/build and release. Human newcomer and expert playtests remain outstanding; browser automation does not establish subjective ease or strategic quality. The user’s report is the evidence for the old accidental-withdrawal defect, not a claim that a new human playtest has passed.

Final focused validation also includes 31 existing engine action/auto-advance regression tests (50 tests total with planner/draft coverage). Changed TSX/test/browser-tool files are lint-clean and `git diff --check` passes. No engine changes were needed.
