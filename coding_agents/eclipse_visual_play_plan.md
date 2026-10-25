# Eclipse visual play redesign plan

Status: proposed work, not implemented. This is the current presentation and usability plan for `src/second-dawn-game/`, based on the October 25 review of `f206619` and the player's screenshots. It supersedes the presentation and acceptance portions of the previous UX plans. Preserve their working selection, draft, rules, privacy, and automation guarantees.

The goal is to make the pieces, available choices, and visible consequences guide play. Routine actions should not require reading rules paragraphs or operating several layers of panels. The existing implementation passes substantial functional checks, but its visual and human acceptance remain open.

## Changes required by the screenshots

| Current interface | Replacement |
| --- | --- |
| Colonization requirements repeats ownership, colony rules, and technology prerequisites for each planet. | Remove this list from the sector inspector. Show ownership once on the sector. Represent each planet as empty, occupied, planned, or locked. Selecting a locked planet reveals its exact relevant prerequisite, with a short label and an inspection link. |
| Explore repeats an action-disc explanation, upkeep panel, coordinates, and the engine description about committing a hidden draw. | Show the selected frontier and a face-down sector tile. Use a specific draw action and a compact icon/value cost. After drawing, keep that frontier in view and show the drawn tile, connected edges, and rotation/placement controls. Remove the engine-description paragraph from the player interface. |
| Empty Build shows a zero total, zero placed/unplaced counts, an error, and a full forecast. | Show the available pieces and an empty tray with an Add piece affordance. No zero-cost ledger, forecast panel, or validation warning before the player has made a choice. Once an order exists, show its pieces and aggregate price once, beside the commit. |
| Recruit allies occupies a separate row between the header and drafts. | Remove the row. Put Recruit allies with Colonize and Trade in Other actions on desktop and mobile. It opens the existing market and preserves its draft. Its placement must not change its actual rule costs or make it an ordinary action-disc action. |

Removing those panels does not remove the rules. Ownership, technologies, available cubes, colony ships, spending, and valid targets remain enforced by the existing engine. Necessary explanations appear where a particular choice needs them.

## One visual language

Every activity follows the same sequence: choose an object, see the proposed change and cost, commit once, and see the result on that object.

| State | Presentation |
| --- | --- |
| Available | Clearly selectable piece, card, planet, or destination, with a short accessible name. |
| Selected | Consistent outline and selection marker; never color alone. |
| Planned | Dashed or translucent piece plus a visible proposed change. |
| Committed | Solid piece/state after the authoritative acceptance, with brief local feedback. |
| Blocked | Muted object with a lock or constraint marker. Its reason remains reachable by tap and keyboard. |
| Consequential risk | Warning icon and a short specific consequence beside the preview or commit. |

Reserve a filled accent button for the current commitment. Navigation uses a different treatment from selection. Faction colors identify factions; they must not double as universal availability or warning colors. Passive summaries and selectable targets must look different.

Use the existing resource, disc, ship, planet, technology, and combat symbols consistently. Icons replace repeated nouns and quantities. Keep short labels for actions, timing, and conditional effects that symbols cannot explain. Every unfamiliar icon needs an accessible name and a tap/focus explanation; hover cannot be the only way to understand it. Blocked objects remain inspectable: disabling a game action must not disable access to its explanation. Do not replace paragraphs with an equally opaque sentence of icons.

## Information that earns space

The default workspace contains the relevant objects, current selection, essential consequence, and specific action. Apply four explicit rules to every piece of copy:

1. **Delete routine narration.** Remove generic command descriptions, repeated ownership explanations, “new action” banners, zero-value ledgers, generic checklists of possible blockers, and instructions that merely repeat an obvious affordance. Collapsing these same panels is not completion.
2. **Show the actual blocker once.** An empty workflow is not an error. After a choice becomes invalid, identify that object and what needs correction: “Needs a sector,” “2 energy short,” or “Requires Advanced Mining.” Keep the player's choice intact.
3. **Keep strategic consequences visible.** Do not hide costs, loss of a unique part, diplomacy betrayal, delayed retreat, or an increased upkeep shortfall to achieve a cleaner screenshot. Give them concise, specific presentation beside the relevant choice.
4. **Keep rules and arithmetic inspectable.** Detailed formulas, timing rules, and exceptions belong in a shared rules/price inspection surface opened deliberately. They are not repeated expanded panels inside each activity.

### Economy timing

Maintain one compact display of authoritative holdings. The selected draft gets one consequence strip, using existing previews and these explicit meanings:

- Pay now: immediate materials, science, money, or influence-disc consumption.
- Round end: the resulting upkeep or income change, clearly labeled as deferred.
- Result: the changed capability, piece, resource balance, or territory.

For the screenshot's Explore example, the compact preview can show the influence-disc symbol with `1` and `Round end` with the money symbol and `7 → 10`. Do not imply that 10 money is paid immediately. A continuing activation, reaction, free reward, and ordinary new action must each show their actual costs. Do not hardcode “1 influence disc” into an Explore button.

Show changed values only; omit unnecessary zeros and unchanged balances. The current “actions affordable” forecast must stop dominating the header or implying that the player can afford every associated purchase. Put its detailed meaning in economy inspection. Keep a clear round-end shortage warning visible when relevant, without treating a legal shortfall as an illegal action. Conditional income remains visibly conditional.

## A shell that leaves room to play

Replace the stacked header, drafts row, roster, tools row, and secondary action bars with a compact hierarchy. Current turn or pending decision, essential balances, and global navigation stay discoverable. Full roster, deck counts, history, rules, and preferences remain one deliberate inspection away; their panels do not occupy the active canvas by default.

Use a shared action registry for desktop and mobile labels, icons, grouping, visibility, and availability. The six ordinary actions remain together. Other actions includes Colonize, Trade, Diplomacy, and Recruit allies when their systems are enabled. Faction abilities belong beside their relevant ship, planet, supply, or remaining activation, with an appropriate route from the action interface. Do not introduce another free-floating header row for each exception.

Each activity has one explicit Close/Back control and one commit area. Global navigation remains available and switching preserves drafts. Remove duplicate footer Close, header ×, and lower action-bar exits that perform the same operation. Keep one Undo for the current draft; place scoped reset operations in a clearly named overflow menu. A slot-specific restoration belongs to that slot. Undo cannot reverse an accepted game command.

“Your decision” takes precedence over “Passed” or “Waiting” in the primary status. Optional AI following must not override inspection. The activity switcher must stay compact and should not allocate an entire full-width row to a single draft.

### Mobile layout acceptance targets

Design and check 360×740 and 390×844 explicitly, alongside 1440×900 desktop. Do not stack the desktop panels and declare the result responsive.

- At the two phone sizes, fixed interface chrome, navigation, and the commit area together should consume no more than 25% of viewport height during editing. Count all persistent rows, not just the header.
- Build placement must have at least 240px of usable map, excluding overlaid map tools, and aim for at least half of the activity area. Focus or enlarge the placement area so legal targets have at least 44px touch regions; do not rely on tiny whole-galaxy thumbnails.
- Upgrade keeps the selected hardpoint, relevant ship capabilities, and replacement choices visible together. Scroll the component list without scrolling the ship completely away.
- Commit areas have an opaque background and reserved layout space. They never cover a target, alternative reward, input, or final row of content.
- No horizontal page overflow, inaccessible content behind nested scroll panes, or controls obscured by the on-screen keyboard. Shorter screens must offer a coherent focused layout rather than silently violating these constraints.

If a layout cannot meet these targets, redesign the activity frame. Do not solve it by shrinking text or stacking another sheet.

## Workflow changes

### Explore and colony placement

Highlight eligible frontiers and preview the chosen frontier directly. Before the draw, communicate uncertainty with a face-down sector, not backend terminology. After the draw, keep the same scene through tile choice, rotation, placement, control, discovery, and colonization. Do not charge or display an already-paid disc again.

For colonies, use hollow spaces, solid cubes, ghost cubes, and locks on the actual planets. Display the controller once. Fixed-resource planets stage their cube immediately; flexible planets show their legal resource icons beside that planet. The chosen batch remains visible across sectors. Show lack of ready colony ships once by the supply, and a missing technology only on the affected planet. Opponent inspection must not become a repeated list of things the viewer cannot do.

### Build and Upgrade

Build begins with pieces. Adding one puts it in the tray and exposes legal placement targets. Selecting an existing item edits that item; Add piece creates another. On mobile, open the piece catalog in the existing activity area, then return to placement with the selected piece and tray still identifiable. Keep the sector list as an accessible fallback, not the practical primary interface because the map is too small.

Show order price once in the commitment area. Show funding alternatives when needed or explicitly inspected. Mark unplaced or invalid pieces on those pieces. Remove the separate empty-order error and repeated placed/unplaced/total summaries.

Upgrade keeps the ship, chosen hardpoint, and component tray together. Put existing before/after comparisons in the ship summary, such as `Hull 1 → 2`, along with energy and the remaining installation allowance. Changed classes receive compact badges. Ordinary fitting and discovered-part fitting use the same arrangement. Preserve class drafts, unique-part constraints, per-slot restoration, and aggregate commitment.

### Research, exchanges, recruitment, and rewards

Research cards lead with the capability or effect and effective price. Put base/minimum/discount arithmetic in price inspection. An effect such as destroying population still needs its meaningful timing condition in a short line; an “ALL” icon alone is insufficient. Owned technology must look like inspection, not a purchasable market option. The selected effect, cost, and commit stay together for paid and free technology, developments, reservations, and project completion.

Trade, Guild exchanges, and resource rewards use the same quantity language: what leaves, what arrives, and the changed balances. Support direct quantity entry, stepping, and Max or Put remaining here where appropriate. A reward pool displays its actual resource yield. Do not introduce unexplained allocation units.

Recruit allies uses the normal Other actions entry and opens a market with one selected species, its benefit, payment, and commitment. Its drafts, blocked states, and close/resume behavior follow the same rules as other activities. Remove the standalone Recruit allies row and its reserved space.

Discovery shows the actual discovered object once and all meaningful alternatives together, such as Keep for VP and Use for the shown benefit. A selected option updates one consequence preview and one commit. Never put the second alternative underneath a sticky button. Use actual tiles in starting-discovery and reservation trays, with visible replacement of a selected slot.

### Movement, Influence, and diplomacy

Keep the selected ships/routes or influence discs on the map while editing. Expose the changed destination, affected population, route order, costs, and diplomacy consequences on the relevant objects. Make the route or disc transfer the primary preview; remove generic action-budget prose. Preserve sibling routes and placements when one item changes.

Diplomacy uses the same relationship/exchange presentation for offers and responses. Actual cubes and reputation tiles show what moves or is surrendered. Keep consequential betrayal and reputation loss explicit. Do not move private values into public previews or persisted public drafts.

### Combat and aftermath

Use one encounter header with compact opposing fleets. Put firing ships, dice, and legal targets together. Replace “Combat Allocation” with a verb-led state such as `Assign hits · 2 remaining`. Show assignment and projected damage/destruction on the target, with a consistent selected treatment.

Keep one opaque outcome-and-commit area. Retain Auto fight in the encounter controls; show its current state and exact pause reason when intervention is required. Preserve its existing authentication, battle scope, background execution, pause rules, and manual strategic choices.

Initiative, retreat, rerolls, bombardment, reputation, occupation, and discoveries update the same encounter. Show relevant uncertainty and delayed retreat timing. Use explicit actions such as Destroy 2 population, Spare population, and Claim sector. Remove duplicate battle titles and competing passed/waiting messages.

### Surrounding screens

Apply the same hierarchy to home/setup/lobby, empire/fleet inspection, history, scoring, preferences, identity/recovery, and spectating. Keep important recovery, resignation, and shared-undo consequences precise. Reduce repeated generic explanation without weakening confirmation for consequential operations. Spectators get the same visual vocabulary with read-only behavior and existing privacy limits.

## Delivery sequence

| Slice | Concrete work and exit evidence |
| --- | --- |
| 1 Shared vocabulary and shell | Inventory default prose, duplicate controls, and competing status rows. Define object states, compact consequence strip, contextual blocker, commit area, and shared action registry. Move Recruit allies into Other actions. Produce desktop and both phone layouts with the actual controls and realistic data. |
| 2 Prove the screenshot fixes | Complete Explore, Colonize, and Build through empty, selected, blocked, corrected, saving, failed, and accepted states. Show the removal of the three cited panels, accurate costs, a usable map, and preserved drafts. Review these working slices before spreading the pattern. |
| 3 Comparison and purchase | Apply the proven frame to Upgrade, Research, Trade, recruitment, discoveries, free technologies, and resource rewards. Verify object/benefit/cost/commit visibility and consistent replacement behavior. |
| 4 Remaining spatial and encounter flows | Finish Move, Influence, diplomacy, combat, aftermath, faction abilities, and the rest of the 23 decision families. Review chained transitions and dense/blocked states, not just isolated components. |
| 5 Surrounding screens and acceptance | Reconcile setup, inspection, history, scores, settings/recovery, and spectating. Run functional and visual gates, observe human play, fix significant findings, and release with an accurate acceptance record. |

Shared components should land before parallel workflow work. The supervisor owns the shell and shared contracts; bounded implementation streams can then own spatial/economy, fitting/purchase, and combat/decisions. Review integrated screens between slices. Do not allow each stream to invent a new footer, disclosure panel, or icon meaning.

### Implementation references

- `SectorPlanets.tsx`, `ColonizationPlanner.tsx`, and `colonizationPlanning.ts`: replace repeated rules markup with shared planet states derived from existing legality helpers.
- `ActionEconomy.tsx`, `UpkeepSummary.tsx`, `commandPreview`, and `upkeepForecast`: separate holdings, immediate costs, deferred changes, and true blockers. Retire the repeated narrative economy panel.
- `SecondDawnBoard.tsx`: stop rendering engine candidate descriptions as generic player instructions; consolidate the shell, commit regions, and contextual activity controls.
- `MobileNavigation.tsx`, `MobileActionPicker.tsx`, `ActivityDock.tsx`, `ActionIcon.tsx`, and the desktop rail: share action definitions, include recruitment, and remove duplicate navigation/control scopes.
- `BuildPlanner.tsx`, `buildPlanning.ts`, and mobile layout styles: distinguish empty, incomplete, and invalid orders. Empty is not a validation error. Keep rule checks separate from when and where a message is displayed.
- `BlueprintEditor.tsx`, `FittingHardpoints.tsx`, `UpgradePartPicker.tsx`, and `AncientPartDecision.tsx`: keep the edited ship and stat comparison in view.
- `ResearchWorkspace.tsx`, `ResearchCost.tsx`, `FundingPlanSelector.tsx`, `EconomyDecision.tsx`, `DiscoveryDecision.tsx`, and `ScifiDecision.tsx`: use one selected-object/consequence/commit pattern across ordinary and reward variants.
- `BattleOverview`, `CombatDecisionVisuals.tsx`, `CombatTurnDecision.tsx`, and `DecisionPanel.tsx`: consolidate encounter context and make editable targets and outcomes explicit.

Keep engine messages available for diagnostics and explicit rules inspection. Derive typed presentation state from authoritative candidates/previews; do not parse English descriptions or weaken server checks to make the UI simpler. Preserve saved-draft compatibility and the existing manual default for combat automation.

## Completion criteria

Track each slice separately as functional, visual, and human accepted. An implementation or deployment is not evidence for all three.

**Functional acceptance:** fail-first behavioral regressions, bounded relevant suites, lint, and build. Cover A → B → commit B; compatible quantity/payment/source retention; invalid choices without substitution; collection edits; inspection and return; close/resume; local Undo; remote updates; offline/error recovery; retries/deduplication; and results staying in context. Verify continuing actions, reactions, free rewards, advanced/flexible planets, conditional income, faction variants, private choices, timers, rollback, resignation, and automation boundaries. Check recruitment appears once in the right action group on both layouts.

**Visual acceptance:** settled captures and interactive scrolling/keyboard checks at all three target sizes. Cover all six ordinary actions, auxiliary activities, and all 23 decisions. Each flow needs empty or initial, selected, blocked, corrected, and accepted states where applicable, including dense fixtures. Reject duplicate headings, routine rules paragraphs, unexplained disabled actions, ambiguous reset/exit scopes, hidden alternatives, covered content, and layouts that fail the object/choice/commit visibility requirements. Verify reduced motion, focus order, noncolor states, readable text, and touch targets. Correctness tests alone cannot close these failures.

**Human acceptance:** observe at least five newcomers and two experienced players. Start with a full opening round, then scripted changed-mind journeys through Build placement, fitting, Explore-to-colony, research/funding, recruitment, and combat/rewards. At least four of five newcomers must finish the core Build, fitting, and Explore-to-colony tasks without coaching or opening routine rules instructions, and correctly identify immediate spending versus deferred upkeep. Experienced players must revise multi-item plans without losing unrelated work. Record hesitation, misunderstood commitments, accidental actions, recovery, and enjoyment; fix significant confusion and retest. Optional advanced-rule inspection is acceptable. Do not declare delight based on a screenshot score or test count.

Final delivery must identify which gates passed, which remain open, and the exact deployed commit. Release must retain the existing main-only Git/Vercel flow and backend target. Until the visual and human gates pass, describe the work as implemented or under evaluation, not finished UX.
