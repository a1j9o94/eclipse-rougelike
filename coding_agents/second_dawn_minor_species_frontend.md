# Minor Species interface

## Outcome and acceptance

Enabled games have an inspectable four-tile market in Diplomacy. Each tile shows its effect, VP treatment and one money purchase price. Population cards require an explicit resource choice and preview the resulting income. Recruiting exposes remaining money and warns about an upkeep shortfall before committing. A required reputation return needs an inline acknowledgement naming the private tile value(s); purchase and return form one atomic command.

Owned Minor Species remain visible in the command center, inspected opponent overview, diplomatic racks and AI action playback. Public score breakdowns include their bonus without revealing reputation values. Research and construction previews include acquired discounts.

## Rules and interface decisions

The canonical catalog is `shared/eclipse/minorSpecies.ts`, sourced by the engine agent from the [official Second Dawn Minor Species rules](https://www.lautapelit.fi/files/Online%20rules/Eclipse2_MS_rules_web.pdf). The UI consumes its legal purchase options and issue explanations, rather than substituting its own traitor, turn or rack rules. It uses `previewCommand`, `constructionCostForSeat`, and `researchCostForSeat` for prices/economic consequences.

- Current market only; purchased tiles leave it. Disabled controls explain the actual issue. No login, persistence or rules engine changes in this subtask.
- Reputation returns use authenticated command-only VP values; acquired cards, public history and scoring use public tile metadata/counts.
- Research progression adds the Researchers discount to the existing official curve and states its origin. Technology minimum prices remain enforced by the shared helper.
- Diplomatic empty-space illustrations count Minor Species occupancy. Dedicated ambassador-space wording uses the faction capability directly, preserving Terran behavior once a Minor Species occupies that space. Orion's reputation-only space does not promise another diplomatic slot.
- Generic card imagery reuses the existing ship silhouettes and effect icons. No new image assets or browser emoji.

## Implementation

New `MinorSpeciesMarket.tsx` and scoped `minorSpecies.css`; integrated in Diplomacy, EmpireOverview and AI narration. ResearchWorkspace, BuildPlanner, buildPlanning and empireBuildOptions use seat-aware prices. RunningScore, ScoreWorkspace and publicInspection include optional Minor Species scoring and old snapshots continue reading missing values as zero.

The selectable `minor-species` review fixture uses actual seeded setup: seed12, warp portals off, Minor Species on, Eridani/Hydran. Its real shuffled market is Cruiser engineers, Research partners, Esteemed allies and Settler envoys; no invented command results.

## Verification

- Eleven new component/preview tests pass: purchase delegation, disabled funding/turn reasons, deliberate population selection, unavailable cubes, acknowledged private reputation return, acquired public cards, upkeep shortfall, dedicated rack slots, engineer build prices, researcher progression, public scoring and AI playback.
- Initial absent-market tests and missing-preview tests failed before implementation. The upkeep-shortfall assertion also failed before projection was connected. Later rack and public narration regressions cover review findings.
- Related bounded batches: 47 diplomacy/build/score/history cases passed; a later 35-case research/build/market batch passed (overlap with the first batch). Final 11-case expansion UI batch passed.
- Scoped ESLint, TypeScript and `git diff --check` passed; browser error log empty. Parent owns final full lint/build/release gates.

Actual Chromium walkthrough used the real preview: recruit Research partners (money26→22), then Settler envoys with Science (22→13, science income3→4). Both appeared in acquired cards, public VP advanced3→5, and no influence disc or turn advanced. Research strips then showed the additional discount. The fixture's seed was subsequently pinned to12 with explicit warp-portals=false for deterministic review.

Saved images opened and reviewed:

- [1440×900 market](screenshots/minor-species/market-desktop.png): all four tiles and complete effects visible, cost appears once per tile, resource choices readable. Review corrected cramped ship/title spacing, gold-on-gold money icon and the previous three-plus-one card grid.
- [390×844 population purchase](screenshots/minor-species/population-mobile.png): resource choices, income previews and Buy button fit; natural vertical scrolling between cards.
- [Acquired command-center cards](screenshots/minor-species/acquired-desktop.png): public effects, attached science cube and increased research discounts visible together.

These are engineering browser checks, not human playtest or physical-device evidence. Rollback removes presentation/integration edits; shared engine and persistence rollout are tracked by the parent separately.
