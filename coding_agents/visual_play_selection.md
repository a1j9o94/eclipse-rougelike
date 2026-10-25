# Visual play: selection, economy and rewards

## Outcome and scope

Implemented the approved `eclipse_visual_play_plan.md` on `feature/visual-play-redesign`. This slice replaces repeated requirements, empty finance panels and implicit list submissions with object selection, local consequences and one explicit commitment. Runtime command legality, hidden information and draft ownership remain authoritative.

This record separates executable checks, browser observations and human experience. Automated green gates do not establish that the game is delightful or easy for a newcomer.

## Coverage ledger

| Surface | Change and preserved behavior |
| --- | --- |
| Planet inspection / Colonize | Removed the repeated colonization requirements list and ownership explanations. A blocked planet remains inspectable and opens its own short inline reason; advanced technology can be inspected locally. Planet icons, planned population cubes and Shrine placement share `SectorPlanets`. Fixed-resource planets stage their cube immediately; flexible planets ask for the resource. Multi-sector selections, unavailable placements and exact supply validation remain. Changed income stays beside the planet choices, marked Round end; the compact footer reserves colony-ship cost and one commit. |
| Research / owned technology | Benefit and effective price precede optional price arithmetic. Prices at the minimum no longer display mathematically false subtraction. Owned cards stay inspectable and visibly marked. The selected technology, core benefit and exact cost stay in a reserved footer while the market/configuration body scrolls. A→B→C replacement, rare-track choice, compatible conversion funding and unavailable selections retain their existing correctness contracts. |
| Research variants | Quantum Labs, Developments and Shrine placement use the same research commitment area. Shrine track/planet choices retain ghost structures and engine-generated commands. Free technology uses the same technology cards with no price/track picker when only one track is legal. Advanced population opportunities show counts, supplies and colonization timing without generic instruction paragraphs. |
| Trade / funding | Direct received-quantity entry, +/- and Max; only changed resource balances appear. A retained invalid quantity blocks submission without substitution. Unavailable resource choices explain themselves when inspected. Bank and Guild are explicit modes. Funding choices remain compatible with Build and Research and retain invalid selections for correction. |
| Guild exchange | Explicit foreign-offer selection, one selected configuration, direct quantity and Max. Selecting a foreign offer hides the Guild player's posting commit. Offer selection and per-offer quantities survive navigation/reload as validated public IDs and amounts. A withdrawn selected offer stays visible as a blocker; it does not leave an empty workspace. Queue mode visibly disables unsupported Guild commits. |
| Recruit allies / Minor Species | Selected-only cube/rack configuration, effective purchase cost and exact reputation-loss acknowledgement. Selected card has a visible outline; other unavailable cards show a readable label rather than an unexplained glyph. Ordinary diplomacy no longer embeds a duplicate recruitment market. No ordinary action disc is added. |
| Diplomacy | Selected partner uses the same controlled exchange preview for ordinary offers and pending responses. Cube direction, income, rack space, VP and betrayal consequence are local to that exchange. Private reputation values remain private; returning one tile is selected and explicitly committed. One active relationship/reputation intent exposes one commit. |
| Resource reward / population return | Actual resource yield, token count, direct allocations and Put remaining here; a sole resource auto-fills. The choices scroll inside a bounded decision, with a reserved commitment footer. Population return keeps destination/income consequences. |
| Control / bankruptcy / portal | Engine-selected map targets and previews retained. Bankruptcy conversion hides the competing abandonment commit until returning to sector choices. The decision footer remains above mobile navigation. |
| Discovery replacement / reservation / reverse engineering | Full replacement tray slots show the selected reward's visual effect, including duplicate physical copies. Reserve/project selection keeps the object and effect visible; future timing is on that selected card. A compact, reserved footer contains the one primary commitment and optional Skip. |
| Faction abilities | Factory loading, colony-ship conversion, Guild portal, reverse project completion and extra activation keep explicit selected-object commits and local costs. Redundant reset and general instruction paragraphs removed. Existing supported queue restrictions and object scope remain. |
| Shared symbols / affordances | Wormhole Generator now uses the board opening bars via shared `WormholeMark`; the root agent integrated it into GalaxyBoard. Warp portals keep the distinct structure symbol. CommitBar is normal flow, ResourceExchangeChoices is shared, and global root styles supply bounded controls, chevrons, hover and focus states. |

## Verification

Fail-first regressions added for local planet blockers, no repeated ownership requirements, planned colony cubes, effective-price inspection, direct trade quantity/Max, unavailable-resource inspection, discovery-slot visuals, the Wormhole symbol, minimum-price arithmetic, bankruptcy's competing commit, and visible betrayal cost. Guild tests first reproduced missing persistence/validation, simultaneous post/fill commits, and disappearing selected offers before their fixes. The reward-yield test was added with implementation and did not capture a red run; this is not represented as fail-first evidence.

Existing bounded suites exercise research selection/track/payment changes, free technology, Shrine and Quantum choices, colony income/supply, trade rates, finite Guild offers, local invalid blockers, Minor Species purchase/rack consequences, diplomacy privacy and inspection continuity, resource allocation and faction commands. Test expectation changes follow the actual interaction: choose Bank/Guild, choose an offer, choose a cube, then commit. They do not remove engine/command assertions.

Final commands/results are recorded below after completion. Full lint and required build are coordinated by the supervisor; this agent does not claim those gates independently.

## Browser review

The full local Board was inspected in Chromium at 360×740, 390×844 and 1440×900. Fixtures use `/.second-dawn/ux/` and an ignored, local-only extended fixture harness; no backend/network state was modified.

Observed defects corrected during this pass:

- Resource reward, population return, control and bankruptcy initially placed confirmation below phone navigation. Choices now scroll within the bounded workspace; confirmation remains in normal flow above navigation.
- Trade had the same defect at 360 px. Its choice body is now bounded and its footer reserved.
- Colonization's duplicated income preview inflated its footer. Changed income moved beside planet choices; the footer now shows only colony ships and commitment.
- Reservation and reverse-project footers grew to 151/101 px on phones. Timing moved onto the selected object; shorter visible buttons retain full accessible names.
- Shrine commitment was below the viewport at all three sizes. Purchase Research now reserves one shared footer for ordinary technology, developments and Shrine placement, with no competing card commit.

Browser logs: `/tmp/visual-play-browser-selection.log`, `/tmp/visual-play-economy-layout.log`, `/tmp/visual-play-compact-footer.log`, `/tmp/visual-play-extended-browser.log`, `/tmp/visual-play-extended-final.log`. These include pre-fix failures and are not all final acceptance results. Final research and footer captures are recorded below.

The expanded browser sweep covered selected free technology, discovery replacement, technology reservation, reverse project, recruited Research partners, Guild posting and Guild filling at all three sizes. The initial Shrine fixture incorrectly paired two factions with one physical color; correcting the fixture exposed the real footer issue above. The factory browser scenario opened Build without selecting a factory-capable ship, so it did not exercise the factory commit; component/command tests cover that control, and this browser gap remains explicit.

## Remaining experience validation

No observed newcomer or expert play session was performed. Human enjoyment, discoverability without coaching, perceived reading load and strategic confidence remain unverified. Browser captures cover representative selected objects and decisions, not every technology, faction, resource shortage, queued action or long offer list. The supervisor's broader shell/combat/support audit complements this slice.

## Final machine results

- `/tmp/visual-play-selection-gates.log`: **78 tests passed / 12 files** (Guild selection, supporting exceptions, sci-fi UI, Trade, economy decisions, ambassador identity, faction abilities, Minor Species UI/previews, Diplomacy, Guild Board integration, Influence/Colonization).
- `/tmp/visual-play-selection-final-research.log`: **45 tests passed / 5 files** (Research workspace, A→B→C/track/payment/variant behavior, advanced opportunities, new visual-play regressions, mobile diplomacy inspection continuity).
- `/tmp/visual-play-selection-final-price.log`: **30 tests passed / 5 files** (price details/minimum/Minor Species discounts, advanced opportunities, selected research variants, SectorPlanets). These suites overlap the preceding run; the counts are not summed as distinct tests.
- Changed TypeScript/TSX files and changed test files passed ESLint; `/tmp/visual-play-selection-lint-final.log` and `/tmp/visual-play-selection-final-touch-lint.log`.
- A transient Vitest `ENOSPC` load failure occurred once while concurrent browser/tooling processes were active despite ample free storage. No repository artifacts were deleted; rerunning the affected diplomacy suite passed. An earlier shared-process timeout also passed on the final run. No remaining assertion failure in this slice's final bounded suites.
- The supervisor repaired the shared Shrine command preview with engine comparisons; the UI now receives its exact resource charge and influence/upkeep effects, rather than relying on button prose for cost.

## Final browser measurements

`/tmp/visual-play-final-acceptance.log` and `/tmp/visual-play-{360,390,1440}-{research,shrine,colonize}-accepted.png` are the final source captures. All nine states had no browser errors, no document horizontal overflow, exactly one visible primary commit and a footer within the available viewport.

| Selected flow | 360×740 footer | 390×844 footer | 1440×900 footer |
| --- | --- | --- | --- |
| Ordinary Research | 57 px; bottom 657, navigation starts 681 | 57 px; bottom 761, navigation starts 785 | 57 px; bottom 878 |
| Shrine | 57 px; bottom 657, navigation starts 681 | 57 px; bottom 761, navigation starts 785 | 57 px; bottom 878 |
| Colonize | 58 px; bottom 629, navigation starts 637 | 58 px; bottom 733, navigation starts 741 | 57 px; bottom 564 |

Research and Shrine now show exact costs in the shared consequence strip; repeated Science holdings were removed from the workspace header. Core benefit symbols remain in the reserved selected-object footer at a compact size, with the full labels and explanation still on the selected card.

Previously verified final layouts: free technology, reservation and reverse project each have a 57 px footer at all three sizes; Trade has a 61 px phone footer above navigation; resource/population decisions have a 61 px phone footer above navigation. Final representative screenshots were inspected visually, not judged solely from overflow measurements.

The colonization snapshot's bottom shell is 103 px high (navigation plus current draft row), unlike the 59 px navigation-only shell in Research. Its own 58 px footer meets the compact target, but that extra shell row means the complete chrome budget remains a supervisor-level caveat; this record does not claim universal compliance with the plan's 25% target.

All browser processes launched by this agent were closed. No further source changes are pending from this slice.

Supervisor integration resolved the extra Colonize turn row after this slice review. An auxiliary activity no longer offers Finish for the underlying ordinary action beside its own commit. Final real-pointer checks at360/390 show header63 + navigation59 + commit58 =180px (24.3% of740), with the commit ending673/777 before navigation681/785; no errors or overflow. Fail-first integration regression now passes.
