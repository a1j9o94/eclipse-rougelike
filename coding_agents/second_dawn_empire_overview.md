# Visual empire overview

Outcome: selecting a civilization shows its identity, economy, colonization opportunities, fleet and public capabilities in an actionable player board. The human's mobile Empire destination uses the same component.

Acceptance: faction effects visible without opening reference text; resource stocks and production read together; physical empty planets separate technology eligibility from available colony ships/cubes; fleet hulls and locations link to existing inspection; opponents' researched technology effects inspect locally without navigating to the human's market; no reputation values or private discovery choices appear.

## Implementation and decisions

- `EmpireOverview.tsx` renders a faction hero/emblem, public-score link, income/resource cards, colony opportunity groups, fleet hulls/location chips, public technology tiles, faction abilities, current action capacities and diplomacy/traitor state.
- `empireOverviewModel.ts` derives from public sectors/ships and the inspected seat. No duplicated persisted state and no commands. Blueprint stats, faction capacities, economy tracks and scoring reuse existing authoritative helpers.
- Fixed money/science/materials spaces are grouped independently. Gray and orbital spaces share a separate Flexible group: each physical empty square appears once. Orbitals offer money/science only. Advanced gray spaces list the actually unlocked resource options. Advanced Robotics does not unlock advanced planets; Metasynthesis does.
- “Technology ready” is geographic eligibility, explicitly independent of turn/sector restrictions, colony ships and matching cubes. A shared colonization navigation callback opens the existing authoritative planner. The overview never claims every eligible planet can be colonized immediately.
- The human can navigate to research, trade and colonization. An opponent's technology tiles reveal their own public effects inline; they cannot accidentally open the human's market. Fleet/planet locations are inspection callbacks, not actions. Parent integration preserves active drafts and offers Back to empire.
- Faction presentation reuses the existing reviewed catalog text. Current capacities include research bonuses and passed-player reaction limits. Distinct faction hulls reuse the new shared faction ship artwork supplied by the ship-art slice.
- Hidden reputation values/private reward choices are never rendered. Existing running score excludes reputation until final scoring; the final total uses the normal score helper.

## Verification

TDD: new test suite failed first because the model/component did not exist. Seven focused tests now pass in `second_dawn_empire_overview.spec.tsx`:

1. Physical square conservation, controlled-only/occupied filtering, advanced eligibility and immutable view.
2. Inspected-owner fleet grouping, hidden-reputation-independent live score, technology activation bonuses and reaction capacities.
3. Own sector/blueprint/research/trade/colonization navigation callbacks.
4. Opponent technology inspection stays local and excludes own-action links/private values.
5. Advanced Robotics vs Metasynthesis; eligibility distinct from turn, enemy ships, colony/cube availability.
6. All twelve faction catalog variants, current blueprint fleet, starting occupied squares and capacities.
7. Flexible advanced-planet selection opens its exact sector and leaves the view unchanged.

Commands: focused Vitest with `--maxWorkers=1`, scoped ESLint, `tsc -p tsconfig.app.json --noEmit` passed. Parent owns full integration regression/build gate.

Browser review: reproducible `tools/second-dawn-empire-overview-review.mjs` captures own/opponent, fleet, abilities and technology effects at 1366×768, 1440×900, 1920×1080, 390×844 and 360×800. Artifacts and results are under `coding_agents/second_dawn_empire_overview_review/`.

Reviewed actual initial desktop and mobile images; corrected mobile Materials-label clipping caused by inherited workspace typography. Parent corrected the redundant desktop inspector/column width. Mobile opponent-roster sizing was found during the task walkthrough: inherited column flex direction gave every roster entry a 190px height and collapsed the content viewport. Parent corrected the roster direction; the final script now asserts roster height below 120px and main content above 200px on phones. The complete five-size capture/navigation run passes. Reviewed final 1366 and 1920 desktop views, 360 own resources, 390 opponent overview, 390 fleet and 360 opponent technology effect: labels, faction identity, hull distinctions and effect text are readable, with no horizontal page overflow or overlay blocking.

This is engineering/browser usability evidence, not a human newcomer or expert playtest. No claim of user playtest success.

## Risks and rollback

Presentation-only component/helper; no schema, catalog, engine, save or command changes. Parent can restore the prior Players/Empire rendering to roll back without touching persisted games. Planet availability remains descriptive until the existing planner validates a command. Future changes should preserve gray-square conservation and opponent-only public inspection.
