# Second Dawn UX iteration: continuous, tactile play

Status: approved design direction; implementation not started by this plan commit.
Owner: Adrian Obleton. Consolidated from the September 18, 2026 UX discussion.
Reviewed baseline: `ca764d429e4fe2ead0bba37eda6bf5fb83bb6879` on `main`.

## Start here

**Outcome:** Players can understand their options, plan an action, inspect its consequences, commit once, and see the result without hunting across panels or losing their place.

This is the canonical plan for the next UX iteration. It consolidates research, movement, building, upgrades, combat, economy, inspection, and the follow-on systems below. It supersedes conflicting interaction proposals in older UX plans, but does not replace game rules, existing regression coverage, multiplayer contracts, or the mobile/recovery work already shipped. In particular, the earlier sector-first building proposal is superseded: **choose what to build first, then deploy those pieces to valid sectors.**

Apply this plan to the full Second Dawn game in `src/second-dawn-game/` and `shared/eclipse/`. The repository retains the legacy roguelike at `#legacy`; do not implement these features in its `src/pages/CombatPage.tsx`, `src/game/combat.ts`, or Outpost screens by mistake.

Before coding: read `AGENTS.md`, inspect current `main`, review the relevant source seams and existing tests, and compare this baseline with any intervening work. Select the next incomplete delivery slice below. Use a feature branch for implementation. Update the delivery ledger with exact commits, tests, observed limitations, and the next task. Do not treat a design checkbox or a historical release report as implementation evidence.

The scope of this commit is documentation only. It does not implement features or authorize a rules redesign, save reset, backend replacement, hosting migration, or unrelated cleanup. GitHub main-only Vercel releases are already configured; preserve them. The old February deployment investigation is no longer a prerequisite for this UX work.

## 1. Accepted product decisions

1. **Choose → preview → commit → witness the result** in a continuous workspace. Put specific confirmation beside the choice; avoid generic confirmation in a remote panel.
2. **Browsing is free, drafts are reversible, commitment is explicit.** Inspecting an opponent, technology, or another ship class must preserve the action draft, map camera, and return context.
3. **Manipulate game objects.** Ships, sectors, planets, technology tiles, and dice expose their relevant actions. Keep the global action bar as an alternative route into the same workflows.
4. **Build first, deploy second.** Assemble a fleet/structure order, distribute it across legal sectors, then commit once. Build-here is a shortcut, not the primary model.
5. **Keep repeated actions open.** Stay in research/movement/build/upgrade as appropriate while legal activations remain; do not require exiting and reopening to continue.
6. **Show player consequences before bookkeeping.** Costs, capabilities, territory, damage, income changes, and affordable actions lead. Disc accounting, provenance, and formulas remain accessible on demand.
7. **Preserve meaningful choices.** Fewer navigation steps must not silently select a target, spend a resource mix, sacrifice a sector, discard a reward, or consume a unique part.
8. **Tactile feedback is brief and explanatory.** A chosen tile becomes an acquired tile; an ordered ship becomes a deployed ship; assigned dice become impacts. Keep longer beats for discoveries, major upgrades, and victories.
9. **Keep the current dark galaxy/brass visual direction.** Improve hierarchy and continuity before adding decoration. Support touch, keyboard, reduced motion, mute, and fast playback.
10. **Do not add a mandatory Roll click to each volley.** Automatic roll presentation leads into the existing allocation decision; the allocation supplies player agency.

## 2. Current foundations and gaps

These observations refer to the reviewed baseline and must be rechecked against current code before implementation.

| System | Foundation already present | Gap to address |
| --- | --- | --- |
| Research | Technology cards, discounts, owned technologies, track choices, atomic conversion | Card selection and generic confirmation are split between workspace and inspector |
| Movement | Ship selection, highlighted legal routes, pinning/range logic, chained activations | Submission closes planner; a draft targets one common destination |
| Building | Quantities, prices, supply limits, funding, command with multiple build entries | UI assigns all entries to one sector; changing sector clears quantities; submission closes planner |
| Upgrades | Blueprint draft, legal upgrade ordering, stat comparisons, shared class designs | Part tray groups by acquisition source; key effects compete with detailed bookkeeping |
| Combat | Persisted rolls, individual allocation, splitter support, fleet overview | Allocation repeats target choices; dice lack tactile continuity and complete presentation provenance |
| Economy | Pure previews, upkeep forecast, resource conversions | Discs, money, and activations need a clear player-facing affordability summary |
| Opponents | Public player boards and blueprint comparisons | Sector fleet cards do not directly expose capabilities/comparison; inspection changes screen |
| Colonization | Batched placements, resource choice, legality explanations | Inspector planets are informational; choosing them does not directly begin colonization |
| Exploration | Visual rotation and placement | Follow-on control/discovery/population components can break spatial continuity |
| Diplomacy/history | Offers, betrayal preview, public journal, return recap | Consequences and map context can be closer to the decision |

## 3. Shared interaction and state contract

- Separate read-only inspection, editable local draft, authoritative submission, and result playback. Selecting or animating must not mutate the game.
- Give each workflow one persistent commit area with a specific verb and relevant total. Disabled controls explain the actual blocker in visible, touch-accessible text.
- Preserve drafts through inspection, navigation, and supported resume/reconnect flows using the existing draft infrastructure. Do not blanket-reset a draft on every render or revision.
- Preserve valid drafts after a rejected command; show the reason. Revalidate on authoritative changes. Mark stale selections and require an intentional correction or refresh; never silently submit against a newer board.
- Separate a draft's lifecycle from inspection selection. In particular, changing map sectors must not unmount and discard a multi-sector build/move plan.
- Only one confirmation issues the action command. Guard duplicate clicks, stale revisions, ownership, pending decisions, and lost connections through the existing command/receipt mechanism.
- When an accepted command leaves activations, reconcile the draft with the returned state and keep the workflow available. Do not treat an attempted submission as success or close prematurely.
- Inspection is available when legal, including while waiting, without exposing opponents' private state. Mobile uses a dismissible sheet that restores the same draft and map position; desktop uses a contextual panel.
- Display costs immediately in previews. Any conversion plan and unique-part consumption must be visible before commitment.
- Undo applies to uncommitted drafts. No generalized post-commit undo across revealed information, multiplayer turns, exploration draws, or combat RNG is included.

## 4. System designs and acceptance criteria

### UX-01 Research in place

Select a technology to expand a local detail/purchase surface in the research workspace. Show its plain-language benefit, discounted cost, relevant track selection, funding choice if needed, and a specific button such as `Research · 7 science`. No separate generic confirmation hunt. Mobile keeps details and commit together in the same surface.

After acceptance, the tile moves into owned research with a brief effect statement. Offer an optional contextual next step such as `Open shipyard` when a component is unlocked; do not force navigation or spend another action. Retain research when further activations are available. Browse owned technology without creating a purchase draft.

Acceptance: ordinary research takes one selection and one commit after entering research; track/funding choices add steps only when they are real choices. Final displayed cost matches the authoritative preview. Conversion plus research remains atomic and explicit. Inspecting another item and returning does not lose an unfinished choice. Market depletion or remote changes invalidate the draft visibly.

### UX-02 Continuous movement and split routes

Selecting your ships exposes Move and legal destinations. Select a ship/group, select a destination, and keep its proposed route visible. Add another ship/group and another destination without leaving the workflow. One `Execute moves` submits the ordered route plan. Draft routes can be revised or removed.

A smaller first slice keeps the current planner open after an accepted move and preserves the departure context while activations remain. Revalidate remaining ships and offer the next eligible ship without moving it automatically. The complete slice supports multiple destinations in one draft.

Show `2 moves left in this action` beside movement controls, with each ship's distance/range visible separately. Keep pinning, path, repeated-ship activation, movement technology, and diplomacy effects correct. Validate route order against the progressively updated board, not independently against the original board. Never split an invalid batch into partially accepted moves silently.

Acceptance: two ships in one sector can be assigned to two different valid sectors without closing/reopening the planner. The routes, activation total, diplomacy consequences, and final positions match engine execution. Reordering or removing one route revalidates the rest. Continue/Done moving behavior follows real action progress and owner changes.

### UX-03 Build order first, deployment second

**Primary flow: assemble → deploy → launch.** Enter Build without requiring a sector choice. Add ships or structures to an order tray. Cards show the current installed blueprint's capabilities, price, and remaining supply; uncommitted upgrade drafts must not be presented as installed capability. Show aggregate material cost, funding choices, and remaining construction capacity.

Select an unplaced piece: legal sectors highlight. Tap a sector to place a translucent preview and automatically select the next unplaced piece. Identical pieces support repeated placement without repeated reselection. Support different ship/structure types and multiple sectors in the same order. A grouped-placement shortcut may supplement individual placement but must show quantity explicitly.

Tap a placed preview to relocate it or return it to the tray. Changing sectors never clears other orders. Removing an item updates supply, budget, funding, and placement legality. The tray and map are visible together, with the tray beneath the map on mobile; do not turn this into a separate-page wizard.

Commit once with a concrete total, e.g. `Build 3 ships · 14 materials` or `Build 2 ships + 1 orbital · …`. Enable only when every item is legally placed and the entire order is valid. Show the number still awaiting placement. After acceptance, previews become ships/structures at their assigned locations. If Build activations remain, keep the mode available.

`Build here` remains a sector-context shortcut that preselects a destination while opening this same order model. It must not become the default sector-first design.

Acceptance: mixed pieces can be distributed across two sectors and committed atomically; changing destination preserves all other entries. Validate aggregate supply/resources/activations and per-sector structure limits across the entire draft. An orbital already queued in a sector prevents queueing an illegal second orbital there. A rejected/stale submission leaves a recoverable editable order. Do not use current `setCounts(empty())` on sector changes.

### UX-04 Ship fitting by function

Group available parts by Weapons, Drives, Reactors, Defense, and Computers, with appropriate handling for special parts. Merge default and researched inventory in this functional catalog. Acquisition source can appear in secondary details; it must not dictate the main navigation.

Select a slot, choose a part, and immediately preview it on the ship draft. Show changed damage, durability, range, initiative, computer/shield values, and power balance beside the design. Collapse unchanged statistics. Clearly state `Applies to every Cruiser` and use `Apply 2 upgrades` with an accurate installation count. Preserve drafts while switching classes or inspecting opponents.

Discovery/Ancient parts remain exceptional: show availability count, that installation consumes a stored copy, and any irreversible removal restriction. Do not describe a permanently installed weapon as firing only once. Removing an installed Ancient part must warn according to the real rule; never offer illegal relocation. Printed components still reappear according to rules, with player-friendly `Restore original component` language where appropriate. Keep outside-grid parts and valid intermediate upgrade ordering.

Acceptance: selecting by function reveals all currently available matching parts; blueprint changes preview immediately without submission. Only installed blueprints affect actual ships/build cards. Energy/drive constraints, per-action installation limits, faction defaults, stored-part counts, and legal upgrade order remain authoritative. Draft undo does not consume or duplicate an Ancient part.

### UX-05 Affordable actions and local capacity

Replace the primary bookkeeping emphasis with `N more actions affordable this round`. Keep separate action-local counters such as moves remaining, part installations remaining, or research activations. Never label influence discs or distance as interchangeable moves.

Define the baseline affordability forecast precisely: largest additional ordinary action-disc count supportable by available discs and current money plus projected income at round-end upkeep, assuming no further trading, direct spending, territorial/income changes, or special effects. Derive through existing authoritative economy functions. If current upkeep is already unfunded, display the shortfall instead of an optimistic count. Do not invent availability for a passed/eliminated player or confuse free actions and reactions with ordinary actions.

Hover, focus, or tap reveals discs, current money, projected income, upkeep, and the forecast assumptions. An action draft previews `After this: N affordable` from its projected state, incorporating its known spending, conversions, control, population, or influence effects. If an unresolved choice changes income, label the forecast conditional rather than presenting false precision.

Affordability is explanatory, not an added legality gate. Preserve legal strategic overspending and the actual upkeep/bankruptcy rules. Display shortfalls and available remedies before commitment.

Acceptance: income-track thresholds, influence gaps/factions, no discs, exact upkeep boundary, trades, control, research disc effects, bankruptcy, and ongoing/free actions have consistent forecasts. Touch and keyboard reveal the same breakdown as hover. Continuing an action is not charged another disc.

### UX-06 Tactile combat on the existing engine

The current full-game engine already rolls and persists results, then requests per-die allocation. Keep it. As a firing group activates, show its dice tumbling briefly, settling on committed faces, and gathering into a tray. Preserve identity from roll through assignment and impact. Show weapon/source and damage beside the face.

Use one persistent set of enemy ship cards. Tap a die then a target; drag is optional, not required. Assigned dice appear on the target, and can be returned to the tray before confirmation. Display current HP, assigned damage, projected HP, and excess damage. Selecting a die explains target-specific hits and shield blocks. One `Resolve volley` commits the allocation, followed by impact, shield, and destruction feedback and the next firing group. No obligatory extra Roll step per volley. Preserve existing fight/retreat decisions; automatic opening missiles do not acquire a new decision.

Standard dice remain indivisible; natural 1 misses and natural 6 hits. Other outcomes use die face + firing ship's computer − target ship's shield against the existing hit threshold. Do not forbid a legal assignment to a target the die misses; clearly warn. Visually segregate automatic all-target misses while retaining required command serialization. Preserve eligible Antimatter Splitter allocation, simultaneous volley damage, initiative/ties, missile ordering, retreat timing, neutral targeting, and hull/HP semantics. Overkill previews must not remove targets or redirect damage before resolution.

Presentation work: existing allocation data lacks complete source/weapon provenance. Add typed, backward-compatible presentation data where needed; never infer weapon identity solely from damage. Neutral attacks currently auto-resolve and text-only events are insufficient to faithfully replay their dice/HP transitions. Add a public structured volley/result projection or events if needed, without exposing hidden information. Queue visual playback independently of authoritative progression. Keep current saves readable and do not simulate results from the log.

Acceptance: identical seed and command sequence produce identical engine results and RNG state with animations on/off. Animations consume zero authoritative RNG. Reconnect restores the existing decision and dice, not another roll. Assignment edits affect only the draft. Confirm resolves once. Mixed shields, misses, overkill, splitter, neutral attacks, stale/duplicate commands, spectators, and reduced-motion/touch/keyboard paths work.

### UX-07 Opponent and neutral inspection where decisions happen

Enemy fleet tokens and sector fleet cards open read-only details without replacing a move/build draft. Show ships present, damage, installed capabilities, weapons, shields, computers, and initiative. `Compare with selected fleet` presents relevant differences and exact explanatory statements such as which group fires first or the face needed to hit a particular target. Compare the actual selected fleet, not only same-class blueprints.

Expose the civilization's public technologies and relationship through the same panel. Use the same inspection model for neutral ships. Preserve map camera, selected routes, and draft on dismissal. Do not expose private reputation, discoveries, hidden choices, or other restricted state. Battle win-probability simulation is outside this iteration; first deliver correct mechanical comparisons.

Acceptance: inspect an opponent from the map, compare it, then resume the unchanged move/build plan. Values reflect authoritative public state and installed designs. Public/private boundaries match `PlayerView`; derived summaries cannot leak server-only state. Desktop, touch, and keyboard have equivalent access.

### UX-08 Direct colonization

Make eligible empty planets actionable on the board/sector inspection surface. Tap to add a colony to a batch; show compatible resource choice only where multiple legal resources are available. Preserve the existing batching engine and colony-ship/cube limits. Show actual marginal income changes from the track, not an assumed +1 per cube, and one commit for the batch.

Keep unavailable planets inspectable with a specific reason, such as missing advanced technology or no colony ships. Do not require a separate population-choice interaction when exactly one resource is legal. Avoid scroll jumps that pull the user away after every planet selection.

Acceptance: colonize multiple eligible planets with one commit; gray/orbital/advanced options, population limits, and colony ships remain correct. Show free-action status and income consequences. Changing sector preserves selected planets. No automatic colony spending simply because a planet was revealed.

### UX-09 Continuous exploration and rewards

Retain the existing visual placement preview. Keep the revealed tile anchored as rotation, placement, and subsequent control/discovery/population choices occur in their actual engine order. Highlight real connections while rotating; clearly distinguish legal placement, disc cost of control, hostile ships, and later colonization opportunities.

Place reward-specific confirmation inside the selected discovery card: e.g. `Keep for 2 VP`, `Store component`, or the actual effect. Show what is gained and where it goes; keep further resource/technology choices when required. No silent selection of reward versus VP, automatic control spending, reordered decisions, or rerolling an already saved draw.

Acceptance: complete an exploration sequence without losing the tile/location context. Resume the exact persisted pending decision after reconnect. Legal rotations, optional discard/redraw abilities, blocked rewards, and follow-on choices retain rule semantics. Destructive choices stay deliberate.

### UX-10 Influence and diplomacy by intent

Lead influence with `Claim sector`, `Release sector`, and `Transfer control`, derived from existing legal options. Preview territory, population/income, upkeep, and VP together; disc mechanics remain available as explanation. Do not hide colony refresh or other existing legal influence options.

Expose diplomatic offers on opponent inspection with relationship, VP, returned-population/income effects, and the specific Offer action. Keep existing resource choice explicit when meaningful. Put betrayal consequences beside the proposed movement/action and before the actual commitment that breaks relations. Do not mislabel legal passage as immediate betrayal when the rules assess end-of-action occupancy.

Acceptance: previews match influence execution and subsequent population-return choices; offers retain ownership, capacity, and traitor restrictions. Inspecting another civilization never sends an offer. Exact reputation values remain private. Existing betrayal confirmation is preserved.

### UX-11 Funding and trading in context

Standardize existing atomic funding on shortfalls within research/build: show what is missing, permitted funding mixes, resulting resources, and affordable-action effect beside the intended purchase. Keep the standalone Trade tool for deliberate exchanges. Do not automatically choose and spend the player's preferred resource mix merely to save a click.

Acceptance: `Convert & research/build` executes atomically with the displayed ratio, mix, and cost. Editing a funding mix never submits. Affordability updates after draft changes. Insufficient, stale, or illegal funding is rejected without a partial trade or purchase.

### UX-12 Clear turn boundaries

Use contextual `Done moving`/equivalents for ending the current action, `Pass for this round`, and `Finish upkeep`. Explain unused activations or legally available colonization when relevant. Keep ordinary transitions fast; do not introduce a mandatory confirmation dialog for every pass/end-action.

One unobtrusive opportunity reminder may be useful; reserve blocking confirmation for actual consequential choices already requiring it, such as betrayal. At ownership/phase changes, show whose turn it is and what the next real decision is. Human attention must not be hijacked by AI playback while drafting or inspecting.

Acceptance: the correct scope is clear, each activation issues one command, and no free/remaining action is silently spent. Pending decisions, AI ownership, reactions, pass state, and upkeep retain their current contracts.

### UX-13 Scoring, history, and returning to play

Let selecting a score category highlight public contributing sectors, structures, or technologies. Show point deltas with the actions that cause them. Keep public totals separate from private reputation until scoring rules permit disclosure; do not invent certainty about standings.

Build on the existing public history and return recap: selecting a spatial event locates its sector, fleet, or route when meaningful. Show important public changes first with full chronological detail available. Clearly distinguish a historical location from the current board if the pieces have moved. Preserve the player's draft and previous camera after leaving inspection. Do not create mandatory acknowledgment clicks for each event.

Acceptance: category totals reconcile to the scoring engine; map highlighting uses only permitted information. Recap links tolerate removed/moved entities, partial pagination, reconnect, and missing legacy event metadata. Inspection never submits a gameplay command.

## 5. Game feel, accessibility, and presentation budget

- Connect feedback to objects: technology tile settles into research, part snaps into a slot, ghost piece becomes a built ship, fleet follows its route, dice hit their targets.
- Select/previews should react immediately. Suggested tuning starting points: 100–200 ms for ordinary transitions, 300–600 ms for move/build results, 600–900 ms for a dice roll. These are proposed budgets, not measured performance claims. Avoid cumulative waits on large fleets.
- Sound is brief and distinctive, with mute respected. Reduced motion uses immediate state changes and static highlights. Fast/skip playback affects only presentation and must not skip player decisions.
- Do not require dragging, hovering, color recognition, or audio to complete an action. Provide keyboard focus, labeled controls, readable contrast, approximately 44 px touch targets, and meaningful accessible announcements.
- Keep controls and commit summaries reachable on narrow portrait screens; support at least 360–430 px phone widths and existing desktop review sizes. Inspect no-overlap behavior at enlarged text and short desktop heights.
- Reserve prominent success moments for discoveries, meaningful fleet upgrades, and victory. Routine confirmation should not spawn another acknowledgment dialog.

## 6. Delivery slices and dependencies

All implementation items are **not started by this plan**. The order below is the default; report any deliberate reordering with its dependency rationale.

| Slice | Scope | Depends on | Exit evidence |
| --- | --- | --- | --- |
| P0 | Record baseline workflows; shared draft/inspection lifecycle; map/component entry points and command validation seams | Current main audit | Existing tests mapped; draft-survival contract covered; click/navigation baseline recorded |
| P1 | UX-01 research, UX-05 economy, UX-11 funding consistency, UX-12 contextual labels; movement planner continuation portion of UX-02 | P0 | No remote confirmation hunt; continuing movement stays open; counters have honest semantics |
| P2 | Full UX-03 build-first order/deployment and UX-02 multi-route movement | P0/P1 | Mixed multi-sector build and split fleet routes preserve drafts and commit correctly |
| P3 | UX-04 functional ship fitting, UX-07 contextual fleet inspection, UX-08 direct colonization | P0; share capabilities with P2 | Inspect/compare without draft loss; unique parts safe; multi-planet action works |
| P4 | UX-06 dice tray/allocation, then structured combat playback and object feedback | P0; public inspection primitives from P3 useful | Same deterministic results; one allocation surface; opponent/neutral playback faithful |
| P5 | UX-09 exploration/rewards, UX-10 influence/diplomacy, UX-13 scoring/recap; complete feedback/accessibility pass | P0–P4 contracts | Follow-on decisions stay in context; history and scoring navigate the board accurately |

Use reviewable commits within each slice; do not hold every system for one giant rewrite. P3 public capability selectors may be brought forward to support P2 build cards; record that explicitly. Reuse existing preview, funding, decision, and recovery code. Add server/event data only when a verified UI requirement cannot be met safely with the existing public projection.

### Delivery ledger (maintain in this file)

| Slice | Status | Branch / commit | Tests and review evidence | Next step / blocker |
| --- | --- | --- | --- | --- |
| P0 | Not started | — | — | Audit current main and record workflow baseline |
| P1 | Not started | — | — | Depends on P0 |
| P2 | Not started | — | — | Depends on P0/P1 |
| P3 | Not started | — | — | Depends on shared draft/inspection contract |
| P4 | Not started | — | — | Reuse existing allocation engine |
| P5 | Not started | — | — | Preserve continuity contracts across remaining systems |

## 7. Engineering seams and verification

Primary UI: `src/second-dawn-game/SecondDawnBoard.tsx`, `BuildPlanner.tsx`, `MovementPlanner.tsx`, `movementPlanning.ts`, `BlueprintEditor.tsx`, `ActionEconomy.tsx`, `upkeepForecast.ts`, `FundingPlanSelector.tsx`, `fundedCandidates.ts`, `CombatDecisionVisuals.tsx`, `DecisionPanel.tsx`, `BattleOverview.tsx`, `SectorFleet.tsx`, `SectorPlanets.tsx`, `ColonizationPlanner.tsx`, `ExplorationDecision.tsx`, `DiscoveryDecision.tsx`, `InfluencePlanner.tsx`, `DiplomacyPanel.tsx`, `TradePanel.tsx`, `ActivityRecap.tsx`, `HistoryPanel.tsx`, and mobile shell components. Paths in this sentence are relative to `src/second-dawn-game/` after the first one.

Draft/recovery: `ActionDraftProvider.tsx`, `actionDraftContext.ts`, `actionDraftStorage.ts` and `src/second-dawn-session/`. Engine/public projection: `shared/eclipse/commandPreview.ts`, `funding.ts`, `legal.ts`, `actions.ts`, `upgradePlan.ts`, `blueprints.ts`, `tracks.ts`, `battleEngine.ts`, `random.ts`, `protocol.ts`, `history.ts`, and `types.ts`. Reuse rules; do not duplicate them in components.

Use existing isolated review fixtures in `SecondDawnReview.tsx` and targeted tests matching `src/__tests__/second_dawn*.spec.*`. Existing scripts under `tools/second-dawn-*` cover action workflows, research, movement chains, planners, combat decisions, mobile drafts, economy, and resume. Inspect scripts before running them; do not assume every script is local/read-only or run a live-mutating review by accident.

### Tests to write failing first for implementation

1. Local research confirm and correct cost/track/funding; owned inspection does not purchase.
2. Movement stays open after acceptance and can split ships between destinations; ordered pinning/path validation and no unintended extra disc.
3. Build order before sector selection; independent piece placements across sectors; location changes preserve order; aggregate supply, structure uniqueness, funding, and exact-once submission.
4. Functional part catalog, class-wide effective stats, legal upgrade ordering, unique-part consumption/removal, draft undo, and existing outside-grid behavior.
5. Action affordability boundaries, ongoing versus new actions, free/reaction/pass states, preview deltas, and uncertain follow-on income.
6. Inspect opponents/neutrals and return to identical draft/camera; public-only comparison and honest historical data.
7. Colonization from a planet, only meaningful resource choices, correct marginal income, batch constraints, and no automatic spend.
8. Combat determinism/zero animation RNG, target-specific hit rules, natural 1/6, splitter, overkill, simultaneous damage, neutral playback, resume and duplicate submission.
9. Exploration/reward/control continuity, exact pending-decision recovery, influence consequences, diplomacy privacy and end-action betrayal timing.
10. Contextual end-action/pass/upkeep controls; score reconciliation, public history navigation, missing old metadata, and draft preservation.

Tests should check player behavior and rules contracts, not mirror component implementation. Use bounded relevant suites, per `AGENTS.md`; do not run the entire historical test suite into memory exhaustion. Run applicable lint, `npm run typecheck:eclipse`, and build gates for implementation. Current `npm run build` includes Convex codegen; `npm run build:vercel` is the frontend release build. Record exact commands and blockers, and do not change a backend merely to make a local build pass. Existing lint debt in historical release notes must be remeasured and distinguished from new failures.

### Human/browser acceptance tasks

- Research a technology, including a funded purchase, without looking for a separate confirmation panel.
- Assign two ships from one origin to separate sectors without closing/reopening movement.
- Assemble ships/structures before choosing locations, distribute them across sectors, revise one placement, then build once.
- Inspect an enemy fleet while planning that move/build, compare its capabilities, then return with the plan intact.
- Upgrade a blueprint by function, understand its class-wide effect, and correctly explain what happens to a stored discovery part.
- Explain affordable actions versus moves within the current action without opening the rules.
- Colonize multiple planets and understand the actual income increase.
- Complete dice allocation by touch and keyboard; identify why the same face hits one target but not another.
- Complete exploration, pass/upkeep, and resume a pending decision without losing spatial context or rerolling.

Record task success without assistance, clicks/taps, panel changes/reopens, hesitation/backtracking, and accidental commits. Baseline these first; do not invent improvement percentages. Target zero forced planner reopenings for continuing a legal action, zero draft loss from inspection, and zero confirmations outside the active workflow. Keep meaningful allocation/track/funding choices even if they take more taps. Agent browser evidence and real human playtest evidence must be labeled separately.

## 8. Risks, rollback, and release discipline

| Risk | Mitigation / rollback |
| --- | --- |
| Presentation accidentally changes rules | Shared legality/previews and deterministic command tests; revert UI slice independently |
| Batch plans overcommit supply or ignore sequential pinning | Validate whole draft/ordered route in engine; preserve all-or-nothing commands |
| Remote updates discard or misapply drafts | Revision-aware revalidation, stable draft IDs, preserve recoverable user selections |
| Unique parts duplicate or become illegally movable | Inventory conservation and explicit rule-backed removal checks |
| Simplified action counter misleads | Define baseline assumptions, show local capacity separately, expose conditional previews |
| Rich combat playback rerolls or replays damage | Read-only event presentation, decision/event IDs, zero authoritative animation RNG |
| Opponent comparison leaks private state | Derive only from authorized PlayerView/public events; privacy tests |
| Mobile overlays hide confirmation/map or seize camera | Same interaction contract, portrait/keyboard/reduced-motion review, restore inspection context |
| Deployment recreates lost-local-work confusion | Push reviewable feature commits, record remote SHAs and validation; release through existing main workflow |

Do not discard saves, remove old journal fields, or rename deployed backends. Presentation metadata must be additive/backward-compatible and tolerate old saves/events. If backend projection changes are needed, coordinate a compatible backend rollout before frontend dependence. Revert the affected presentation slice or use the established deployment rollback; retain data needed to read already-created saves. The documentation commit itself is reversible with a normal revert.

## 9. Decision log and bounded follow-ups

- 2026-09-18: User requested a consolidated committed plan for future agents; this file is the authoritative handoff for that request.
- Preserve mechanics; improve discovery, continuity, feedback, and interpretation.
- User explicitly reversed the initial sector-first build proposal: assemble desired pieces, then deploy to valid sectors. Both tray and map stay visible; one final commit.
- Research confirmation stays with the selected technology. Movement continuation and split routes must not require exit/re-entry.
- Part function takes precedence over acquisition source; stored discovery/Ancient parts retain unique inventory semantics.
- Global affordable-action forecast and current-action capacity are separate concepts. Hover information must also be accessible by tap/focus.
- Combat is a presentation/allocation improvement on the new full-game engine, not a rewrite of legacy roguelike combat.
- Opponent details belong at the map decision, including neutrals, without losing action drafts or revealing private information.
- General post-commit undo, strategic auto-play, combat balance changes, battle win-probability simulation, a new tutorial campaign, and a visual rebrand are not part of this iteration.

Implementation tuning may settle tray grouping, exact motion timings, and panel layout through playtests. No unresolved product choice blocks P0/P1. Future agents should proceed with the accepted flows, document findings, and ask only when a real rules/product conflict cannot be resolved from this plan and current code.
