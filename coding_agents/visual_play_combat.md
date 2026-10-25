# Visual play: combat, exploration and discovery

Implementation on `feature/visual-play-redesign`, October 25, 2026. This is the combat and pending-choice portion of `eclipse_visual_play_plan.md`; the supervisor owns the shared shell, full 23-decision ledger and release gates. No backend, rules or automation-policy changes are included in this slice.

## Player outcome

Combat now uses one persistent battlefield. Opposing ships keep their positions through firing, hit assignment, waiting and aftermath. The same ship displays hull, drafted damage, projected destruction, accepted damage, retreat or destruction. Current dice and controls change below that field; historical result tables and firing diagrams do not accumulate beneath it. Earlier volleys remain available through explicit history inspection.

Players assign dice to ships directly and can revise the draft before one explicit commit. The heading states how many assignments remain. Hit arithmetic and die provenance are inspectable; missing historical weapon metadata remains unknown. The three-dimensional dice still present authoritative recorded results. Retreat timing and consumable costs remain visible as short consequences.

Discovery keeps both reward alternatives visible together with the actual tile and one shared commit. Strategic consequences such as lost replaced ancient parts, final-controller scoring, portal connections and delayed activation remain visible without repeating full rules. Exploration keeps the tile on the shared galaxy, provides compact rotation and placement controls, and moves detailed sector inspection behind an explicit control. Compatible saved orientations survive tile switching.

Shared `CommitBar` is used throughout these commitments. `ChoiceWorkspace` preserves mounted decisions during inspection, supports header tools, and retains keyboard focus and Escape behavior. Private reputation results still require the owning viewer.

## Exact decision coverage

| Decision kind | Machine evidence | Browser evidence |
| --- | --- | --- |
| `combat-turn` | Fire/retreat command semantics, delayed retreat, no legal retreat blockers | Current firing/retreat scene at all three sizes |
| `combat-allocation` | Editable assignments, split antimatter, missed dice, projected destruction, persistent ship nodes | Direct target selection, keyboard assignment, hit inspection, accepted engine result, dense ten-ship fixture |
| `retreat` | Legacy destination selection retained | Legacy retreat fixture at all three sizes |
| `initiative-order` | Explicit order submission retained | Current-scene order fixture at all three sizes |
| `super-joker` | Reversible selection followed by explicit commit; exact table result and consumable cost | Reroll fixture at all three sizes |
| `bombardment` | Individual allocation, Neutron Bombs all-or-none behavior, explicit spare/destroy commands | Population preview fixture at all three sizes |
| `exploration` | Rotation legality, offline commit block, same-id redraw, saved Draco draws, compatible/incompatible orientations, shared-map draft preservation | Ordinary and Ancient-bearing sectors at all three sizes |
| `discovery` | Alternative legality, reconsideration, public pool, selected consequence and explicit commit | Both alternatives visible at all three sizes; inspection return preserves selection by pointer and keyboard |
| `less-random-reputation` | Supply/track legality, draw accounting, undo/reset, explicit confirmation | Public supply and draft fixture at all three sizes |

The private reputation result is also checked for owner-only display and was observed after resolving an actual engine volley. It is an aftermath view rather than a tenth pending-decision kind. These nine kinds do not represent completion of all 23 kinds or the complete chained-game matrix.

## Machine verification

The initial compact context, allocation and discovery tests failed before implementation (`/tmp/eclipse-visual-combat-red.log`). Persistent transition coverage subsequently caught stale allocation on a waiting scene. A browser replay then caught a separate real defect: a destroyed ship removed by the accepted state lacked its wreck marker until combat history arrived. The fix uses authoritative ship removal; globally present retreating ships still display as retreated. Both history-present and history-delayed transitions are now tested.

The final known-green union is **70 tests across 15 suites**:

- `second_dawn_visual_play_combat`: 5
- `second_dawn_battle_overview`: 3
- `second_dawn_combat_direct`: 6
- `second_dawn_combat_volley_scene`: 4
- `second_dawn_combat_volley_ux`: 4
- `second_dawn_combat_automation_ui`: 3
- `second_dawn_decisions`: 12
- `second_dawn_less_random_decisions_ui`: 3
- `second_dawn_discovery_decision`: 9
- `second_dawn_discovery_reconsideration`: 4
- `second_dawn_less_random_discovery_ui`: 3
- `second_dawn_exploration_visual`: 4
- `second_dawn_exploration_shared_map`: 4
- `second_dawn_exploration_map`: 3
- `second_dawn_reputation_summary`: 3

This is a union of bounded runs, not a claim of a single 70-test command. The first 15-suite run had one obsolete assertion expecting the removed routine “Ready to place” sentence. Its legality assertion now checks the enabled explicit commit; all three exploration suites and the six affected suites then passed. The final history-delayed case passed in its isolated five-test suite.

Evidence: `/tmp/eclipse-visual-play-combat-final.log`, `/tmp/eclipse-visual-explore-final.log`, `/tmp/eclipse-visual-combat-final-followup.log`, and `/tmp/eclipse-visual-combat-receipt-green.log`. TypeScript build checking and changed-file ESLint passed (`/tmp/eclipse-visual-combat-types.log`, `/tmp/eclipse-visual-combat-lint.log`). Full lint/build are supervisor gates.

Two attempts to collect the final receipt suite hit transient Vite/esbuild `ENOSPC` despite ample disk/inodes. The isolated retry passed without file deletion. The first attempted red run of that new case was blocked before collection; browser reproduction, rather than a red Vitest result, established that particular failure. The Super Joker red attempt was similarly blocked by an unrelated concurrent syntax edit; the eventual behavior check passed. These are not presented as successful fail-first runs.

## Actual-browser verification

Full Board harnesses were inspected at **360×740, 390×844 and 1440×900**. Thirty initial captures cover combat, retreat, legacy retreat, discovery, exploration, bombardment, dense fleets, initiative, reroll and public reputation. Follow-up captures cover Ancient-bearing exploration and the latest shared bounded frame. There were no page runtime errors or horizontal page overflow in these capture matrices.

Latest Explore and Ancient-bearing Explore commit bounds are 519–576 at 360px, 580–637 at 390px, and 311–372 at 1440px. Latest Discovery commit bounds are 565–622 on both phones and 529–590 on desktop. The phone footers are 57px tall and remain above navigation. Both discovery alternatives are visible together. Dense fleets scroll within the field; the last target remains selectable while the commitment remains visible.

The keyboard and accepted-command replay verified target assignment, opening hit arithmetic, the same two ship nodes after resolution, one wreck, zero appended result tables, and the private reputation result. It used the real local rules processor, not a mocked success callback.

Evidence: `/tmp/eclipse-visual-combat-browser-final.log`, `/tmp/eclipse-visual-combat-browser-confirm.log`, `/tmp/eclipse-visual-combat-final-frame.log`, `/tmp/eclipse-visual-combat-interactions.log`; captures `/tmp/eclipse-vp-*.png` and `/tmp/eclipse-vp-final-*.png`. Temporary review harness files are under ignored `.second-dawn/visual-play-combat/`.

Browser review found and corrected substantive layout issues: legacy one-column discovery styling, stacked inspection chrome, exploration commitment wrapping/overlap, inherited reputation disclosure margins, excess encounter header chrome, and delayed-history wreck rendering. These were assessed through full Board screenshots rather than treating component assertions as layout proof.

## Open acceptance and integration findings

The final mobile inspection replay identified and helped resolve a **shared-shell pointer blocker**: after Discovery → Inspect → Technologies, the Return to discovery button was covered by the empty Auto-pass turn-controls wrapper. At 390×844 both occupied x4/y744/382×44. The supervisor fixed MobileNavigation and added a fail-first UI regression. A fresh real-pointer replay now returns successfully, retains the selected Keep option and shows the correct Keep for 2 VP commitment, with no runtime errors. Before-fix evidence: `/tmp/eclipse-discovery-return-blocked.png` and `/tmp/eclipse-visual-discovery-return-geometry.log`. Passing replay: `/tmp/eclipse-visual-discovery-return-final.log` and `/tmp/eclipse-vp-final-390-discovery-return.png`. No Board edits were made by this agent. No known blocker remains in the owned scope.

Functional evidence covers these nine decision families and their tests. Visual evidence covers the listed fixtures, sizes and selected transitions. Live authenticated Auto fight scheduling was not exercised through this local browser harness; its controls and existing UI tests were preserved, and this slice does not alter automation behavior.

Human acceptance remains open: no five-newcomer/two-expert playtest was conducted. The observed-play completion gate, full 23-decision matrix, complete chained-game checks, release build and production verification remain supervisor-owned. Automated correctness and screenshots alone do not establish delight.
