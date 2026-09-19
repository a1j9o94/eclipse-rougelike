# Second Dawn UX: discoverable strategy and tactile play

Status: P1–P5 implementation and engineering review complete; release verification and human playtests tracked below.
Product owner: Adrian Obleton.
Source baseline reviewed: `ca764d429e4fe2ead0bba37eda6bf5fb83bb6879`.
Last revised: September 18, 2026.

## Product goal

**Make Eclipse fun, tactile, and delightful to play. A newcomer should be able to see what they can do and understand the immediate consequences. An experienced player should be able to make better decisions through planning, timing, and mastery of the same rules.**

The player is building a civilization, fitting a fleet, discovering territory, and taking calculated risks. The interface should make those activities feel tangible: ships gather in a tray before deployment, a new component changes the ship in front of you, a technology becomes part of your empire, and rolled dice become the attacks you assign. Each action has anticipation, a meaningful choice, and a visible payoff.

A successful turn feels like: “I can see an opportunity. I can try a plan safely. I understand what I am committing. I can see what happened, and I want to make the next decision.” Fewer clicks and clearer counters support that experience; they are supporting measures rather than the definition of success.

### Accessible choices, rewarding mastery

Everyone plays under the same rules, with information access governed by the game's existing public/private boundaries. Familiarity with Eclipse should improve strategic judgment. It should not be necessary just to find a legal action or interpret a button.

Present information in three layers:

1. **What can I do?** Show relevant objects, legal opportunities, actual costs, and clear verbs. An empty planet can be colonized; an available technology can be researched; a selected ship reveals its destinations. Explain blocked options beside them so players can see a route to unlocking them.
2. **What would happen?** Preview the immediate effects of the player's draft: new capabilities, destinations, damage, income, remaining resources, and affordable actions. State material tradeoffs and uncertainty before commitment.
3. **Why does it work?** Let players inspect exact parts, thresholds, discounts, influence accounting, range, initiative, and other rules when they want more depth. Make this available by tap, focus, and hover without forcing everyone to read it every turn.

Explain consequences without choosing strategy for the player. Keep viable alternatives discoverable; do not turn all legal opportunities into an “optimal move” recommendation. Experienced players should still gain an edge from sequencing actions, choosing research and funding, timing expansion, matching ship designs to opponents, managing upkeep, and allocating damage well. Strategic difficulty comes from those tradeoffs, risk, and other players.

| Moment | A newcomer can understand | Mastery can improve the outcome |
| --- | --- | --- |
| Research | What a technology unlocks, its price, and how to acquire it | Timing purchases, using discounts, and building complementary technologies |
| Building | Which pieces they can afford and where each can be deployed | Fleet composition, resource commitment, and positioning |
| Moving | Where selected ships can go and what the route costs | Splitting fleets, sequencing routes, pinning, and initiative preparation |
| Fitting ships | How a chosen part changes the ship and whether it fits | Power/slot tradeoffs, counters, class-wide synergies, and unique-part placement |
| Combat | What was rolled, legal assignments, and their immediate effects | Allocating against shields, avoiding wasted damage, using splitters, and retreat timing |
| Economy and territory | Which actions remain affordable and what a colony changes | Managing income thresholds, action timing, territorial commitments, and calculated shortfalls |

### The experience to deliver

- **Agency:** trying a draft feels safe; committing it feels intentional. Inspection and revision are easy.
- **Tactility:** the selected object maintains a visible identity through planning, commitment, and result. Pieces appear placed, fitted, acquired, or fired.
- **Discovery:** opportunities reveal themselves through the board and components. The player learns a rule when it becomes relevant.
- **Tension:** costs, opponents, and uncertain outcomes are readable enough to support deliberate risks. Dice resolve the existing uncertainty visibly.
- **Payoff:** the player sees how their empire or fleet changed. Sound and motion reinforce that result.
- **Flow:** routine turns stay quick, meaningful choices get room, and familiar players can inspect deeply or play briskly.

Example: a player opens Build, sees the capabilities and costs of their current ships, and assembles an order. Selecting a piece illuminates valid deployment sectors. They place two ships, inspect an opposing fleet, revise a location, and commit the whole order. The previews become actual ships. A newcomer can complete this without knowing the construction rules in advance; an expert can choose a stronger composition and position using the same interface.

## Implementation orientation

This document is a standalone product brief and implementation plan for the full Second Dawn game. It includes the interaction requirements, rules to preserve, engineering references, delivery slices, and acceptance criteria. No prior conversation or proposal is required to understand the intended experience.

The target code is `src/second-dawn-game/` and `shared/eclipse/`. The repository also contains a separate legacy roguelike at `#legacy`; leave that application's Outpost and combat screens outside this work.

Before coding, read `AGENTS.md`, inspect current `main`, and review the relevant source and tests. Recheck baseline observations against intervening changes. Select the next incomplete delivery slice and use a feature branch. Update the ledger with remote commits, test results, playtest observations, remaining limitations, and the next task.

Preserve the existing game rules, saves, multiplayer privacy, recovery contracts, and main-only Vercel release configuration. This is a UX implementation plan; changing game balance or deployment infrastructure requires its own concrete rationale and scope. The plan's delivery ledger separates requirements from implemented and verified behavior.

## 1. Interaction principles

1. **Choose → preview → commit → witness the result** in a continuous workspace. Put specific confirmation beside the choice; avoid generic confirmation in a remote panel.
2. **Browsing is free, drafts are reversible, commitment is explicit.** Inspecting an opponent, technology, or another ship class must preserve the action draft, map camera, and return context.
3. **Manipulate game objects.** Ships, sectors, planets, technology tiles, and dice expose their relevant actions. Keep the global action bar as an alternative route into the same workflows.
4. **Build first, deploy second.** Assemble a fleet/structure order, distribute it across legal sectors, then commit once. A Build-here shortcut preselects a destination in this same workflow.
5. **Keep repeated actions open.** Stay in research/movement/build/upgrade as appropriate while legal activations remain; do not require exiting and reopening to continue.
6. **Show player consequences before bookkeeping.** Costs, capabilities, territory, damage, income changes, and affordable actions lead. Disc accounting, provenance, and formulas remain accessible on demand.
7. **Preserve meaningful choices.** Fewer navigation steps must not silently select a target, spend a resource mix, sacrifice a sector, discard a reward, or consume a unique part.
8. **Tactile feedback is brief and explanatory.** A chosen tile becomes an acquired tile; an ordered ship becomes a deployed ship; assigned dice become impacts. Keep longer beats for discoveries, major upgrades, and victories.
9. **Carry the space-board-game atmosphere through every action.** Use the dark galaxy/brass visual direction, readable components, purposeful sound, and clear motion. Each functional slice includes its feedback and accessible equivalents.
10. **Give combat a rhythm of anticipation, allocation, and impact.** Dice roll automatically as a firing group activates, settle into the tray, and await meaningful assignments. Support touch, keyboard, reduced motion, mute, and fast playback.

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

Player experience: “I see a new possibility for my civilization, understand what it unlocks, and acquire it right here.” Keep the acquired tile and its new capability visibly connected; experienced players can inspect track discounts and future synergies.

Select a technology to expand a local detail/purchase surface in the research workspace. Show its plain-language benefit, discounted cost, relevant track selection, funding choice if needed, and a specific button such as `Research · 7 science`. No separate generic confirmation hunt. Mobile keeps details and commit together in the same surface.

After acceptance, the tile moves into owned research with a brief effect statement. Offer an optional contextual next step such as `Open shipyard` when a component is unlocked; do not force navigation or spend another action. Retain research when further activations are available. Browse owned technology without creating a purchase draft.

Acceptance: ordinary research takes one selection and one commit after entering research; track/funding choices add steps only when they are real choices. Final displayed cost matches the authoritative preview. Conversion plus research remains atomic and explicit. Inspecting another item and returning does not lose an unfinished choice. Market depletion or remote changes invalidate the draft visibly.

### UX-02 Continuous movement and split routes

Player experience: “I am directing a fleet across the galaxy.” Routes remain on the board as the player experiments; ships follow those routes after commitment. Legal highlights make movement discoverable while leaving route order, fleet splitting, and tactical position to the player.

Selecting your ships exposes Move and legal destinations. Select a ship/group, select a destination, and keep its proposed route visible. Add another ship/group and another destination without leaving the workflow. One `Execute moves` submits the ordered route plan. Draft routes can be revised or removed.

A smaller first slice keeps the current planner open after an accepted move and preserves the departure context while activations remain. Revalidate remaining ships and offer the next eligible ship without moving it automatically. The complete slice supports multiple destinations in one draft.

Show `2 moves left in this action` beside movement controls, with each ship's distance/range visible separately. Keep pinning, path, repeated-ship activation, movement technology, and diplomacy effects correct. Validate route order against the progressively updated board, not independently against the original board. Never split an invalid batch into partially accepted moves silently.

Acceptance: two ships in one sector can be assigned to two different valid sectors without closing/reopening the planner. The routes, activation total, diplomacy consequences, and final positions match engine execution. Reordering or removing one route revalidates the rest. Continue/Done moving behavior follows real action progress and owner changes.

### UX-03 Build order first, deployment second

Player experience: “I am assembling a force, then putting it into the galaxy.” Filling the tray creates anticipation; placing ghost pieces makes the plan tangible; launch provides a clear payoff. Capabilities and costs help new players choose, while composition and deployment reward strategic judgment.

**Primary flow: assemble → deploy → launch.** Enter Build without requiring a sector choice. Add ships or structures to an order tray. Cards show the current installed blueprint's capabilities, price, and remaining supply; uncommitted upgrade drafts must not be presented as installed capability. Show aggregate material cost, funding choices, and remaining construction capacity.

Select an unplaced piece: legal sectors highlight. Tap a sector to place a translucent preview and automatically select the next unplaced piece. Identical pieces support repeated placement without repeated reselection. Support different ship/structure types and multiple sectors in the same order. A grouped-placement shortcut may supplement individual placement but must show quantity explicitly.

Tap a placed preview to relocate it or return it to the tray. Changing sectors never clears other orders. Removing an item updates supply, budget, funding, and placement legality. The tray and map are visible together, with the tray beneath the map on mobile; do not turn this into a separate-page wizard.

Commit once with a concrete total, e.g. `Build 3 ships · 14 materials` or `Build 2 ships + 1 orbital · …`. Enable only when every item is legally placed and the entire order is valid. Show the number still awaiting placement. After acceptance, previews become ships/structures at their assigned locations. If Build activations remain, keep the mode available.

`Build here` is a sector-context shortcut that preselects a destination in the shared order model. The primary Build entry begins with choosing pieces and keeps the order tray and deployment map together.

Acceptance: mixed pieces can be distributed across two sectors and committed atomically; changing destination preserves all other entries. Validate aggregate supply/resources/activations and per-sector structure limits across the entire draft. An orbital already queued in a sector prevents queueing an illegal second orbital there. A rejected/stale submission leaves a recoverable editable order. Do not use current `setCounts(empty())` on sector changes.

### UX-04 Ship fitting by function

Player experience: “I am designing a ship and can feel it becoming different.” Each candidate part changes the visible draft and highlights its benefits and costs. Players can explore safely; experts gain from power, slots, counters, and combinations.

Group available parts by Weapons, Drives, Reactors, Defense, and Computers, with appropriate handling for special parts. Merge default and researched inventory in this functional catalog. Acquisition source can appear in secondary details; it must not dictate the main navigation.

Select a slot, choose a part, and immediately preview it on the ship draft. Show changed damage, durability, range, initiative, computer/shield values, and power balance beside the design. Collapse unchanged statistics. Clearly state `Applies to every Cruiser` and use `Apply 2 upgrades` with an accurate installation count. Preserve drafts while switching classes or inspecting opponents.

Discovery/Ancient parts remain exceptional: show availability count, that installation consumes a stored copy, and any irreversible removal restriction. Do not describe a permanently installed weapon as firing only once. Removing an installed Ancient part must warn according to the real rule; never offer illegal relocation. Printed components still reappear according to rules, with player-friendly `Restore original component` language where appropriate. Keep outside-grid parts and valid intermediate upgrade ordering.

Acceptance: selecting by function reveals all currently available matching parts; blueprint changes preview immediately without submission. Only installed blueprints affect actual ships/build cards. Energy/drive constraints, per-action installation limits, faction defaults, stored-part counts, and legal upgrade order remain authoritative. Draft undo does not consume or duplicate an Ancient part.

### UX-05 Affordable actions and local capacity

Player experience: “I know how much room I have to act, and can decide whether to stretch my economy.” Lead with usable capacity and visible consequences; let players learn and exploit the exact upkeep and income thresholds through inspection.

Replace the primary bookkeeping emphasis with `N more actions affordable this round`. Keep separate action-local counters such as moves remaining, part installations remaining, or research activations. Never label influence discs or distance as interchangeable moves.

Define the baseline affordability forecast precisely: largest additional ordinary action-disc count supportable by available discs and current money plus projected income at round-end upkeep, assuming no further trading, direct spending, territorial/income changes, or special effects. Derive through existing authoritative economy functions. If current upkeep is already unfunded, display the shortfall instead of an optimistic count. Do not invent availability for a passed/eliminated player or confuse free actions and reactions with ordinary actions.

Hover, focus, or tap reveals discs, current money, projected income, upkeep, and the forecast assumptions. An action draft previews `After this: N affordable` from its projected state, incorporating its known spending, conversions, control, population, or influence effects. If an unresolved choice changes income, label the forecast conditional rather than presenting false precision.

Affordability is explanatory, not an added legality gate. Preserve legal strategic overspending and the actual upkeep/bankruptcy rules. Display shortfalls and available remedies before commitment.

Acceptance: income-track thresholds, influence gaps/factions, no discs, exact upkeep boundary, trades, control, research disc effects, bankruptcy, and ongoing/free actions have consistent forecasts. Touch and keyboard reveal the same breakdown as hover. Continuing an action is not charged another disc.

### UX-06 Tactile combat on the existing engine

Player experience: “The roll creates suspense; my assignments matter; I see each attack land.” Readable dice and target previews make participation accessible. Target choice, shield interactions, damage efficiency, and retreat preserve the reward for mastery.

The current full-game engine already rolls and persists results, then requests per-die allocation. Keep it. As a firing group activates, show its dice tumbling briefly, settling on committed faces, and gathering into a tray. Preserve identity from roll through assignment and impact. Show weapon/source and damage beside the face.

Use one persistent set of enemy ship cards. Tap a die then a target; drag is optional, not required. Assigned dice appear on the target, and can be returned to the tray before confirmation. Display current HP, assigned damage, projected HP, and excess damage. Selecting a die explains target-specific hits and shield blocks. One `Resolve volley` commits the allocation, followed by impact, shield, and destruction feedback and the next firing group. No obligatory extra Roll step per volley. Preserve existing fight/retreat decisions; automatic opening missiles do not acquire a new decision.

Standard dice remain indivisible; natural 1 misses and natural 6 hits. Other outcomes use die face + firing ship's computer − target ship's shield against the existing hit threshold. Do not forbid a legal assignment to a target the die misses; clearly warn. Visually segregate automatic all-target misses while retaining required command serialization. Preserve eligible Antimatter Splitter allocation, simultaneous volley damage, initiative/ties, missile ordering, retreat timing, neutral targeting, and hull/HP semantics. Overkill previews must not remove targets or redirect damage before resolution.

Presentation work: existing allocation data lacks complete source/weapon provenance. Add typed, backward-compatible presentation data where needed; never infer weapon identity solely from damage. Neutral attacks currently auto-resolve and text-only events are insufficient to faithfully replay their dice/HP transitions. Add a public structured volley/result projection or events if needed, without exposing hidden information. Queue visual playback independently of authoritative progression. Keep current saves readable and do not simulate results from the log.

Acceptance: identical seed and command sequence produce identical engine results and RNG state with animations on/off. Animations consume zero authoritative RNG. Reconnect restores the existing decision and dice, not another roll. Assignment edits affect only the draft. Confirm resolves once. Mixed shields, misses, overkill, splitter, neutral attacks, stale/duplicate commands, spectators, and reduced-motion/touch/keyboard paths work.

### UX-07 Opponent and neutral inspection where decisions happen

Player experience: “I can size up the threat while keeping my plan in mind.” Show actionable public differences where the encounter is being considered. Exact comparisons support learning; deciding what to risk remains the player's judgment.

Enemy fleet tokens and sector fleet cards open read-only details without replacing a move/build draft. Show ships present, damage, installed capabilities, weapons, shields, computers, and initiative. `Compare with selected fleet` presents relevant differences and exact explanatory statements such as which group fires first or the face needed to hit a particular target. Compare the actual selected fleet, not only same-class blueprints.

Expose the civilization's public technologies and relationship through the same panel. Use the same inspection model for neutral ships. Preserve map camera, selected routes, and draft on dismissal. Do not expose private reputation, discoveries, hidden choices, or other restricted state. Battle win-probability simulation is outside this iteration; first deliver correct mechanical comparisons.

Acceptance: inspect an opponent from the map, compare it, then resume the unchanged move/build plan. Values reflect authoritative public state and installed designs. Public/private boundaries match `PlayerView`; derived summaries cannot leak server-only state. Desktop, touch, and keyboard have equivalent access.

### UX-08 Direct colonization

Player experience: “This world can become part of my economy.” An open planet visibly accepts a draft colony; its income contribution is clear before commitment and appears in the empire's resources afterward. Experts can optimize resource choices and income thresholds.

Make eligible empty planets actionable on the board/sector inspection surface. Tap to add a colony to a batch; show compatible resource choice only where multiple legal resources are available. Preserve the existing batching engine and colony-ship/cube limits. Show actual marginal income changes from the track, not an assumed +1 per cube, and one commit for the batch.

Keep unavailable planets inspectable with a specific reason, such as missing advanced technology or no colony ships. Do not require a separate population-choice interaction when exactly one resource is legal. Avoid scroll jumps that pull the user away after every planet selection.

Acceptance: colonize multiple eligible planets with one commit; gray/orbital/advanced options, population limits, and colony ships remain correct. Show free-action status and income consequences. Changing sector preserves selected planets. No automatic colony spending simply because a planet was revealed.

### UX-09 Continuous exploration and rewards

Player experience: “I have discovered a place worth investigating.” Give the reveal a short moment, let the player shape its connections, and keep the tile present while resolving its opportunities. Preserve uncertainty until the rules reveal information and keep optional rewards a real choice.

Retain the existing visual placement preview. Keep the revealed tile anchored as rotation, placement, and subsequent control/discovery/population choices occur in their actual engine order. Highlight real connections while rotating; clearly distinguish legal placement, disc cost of control, hostile ships, and later colonization opportunities.

Place reward-specific confirmation inside the selected discovery card: e.g. `Keep for 2 VP`, `Store component`, or the actual effect. Show what is gained and where it goes; keep further resource/technology choices when required. No silent selection of reward versus VP, automatic control spending, reordered decisions, or rerolling an already saved draw.

Acceptance: complete an exploration sequence without losing the tile/location context. Resume the exact persisted pending decision after reconnect. Legal rotations, optional discard/redraw abilities, blocked rewards, and follow-on choices retain rule semantics. Destructive choices stay deliberate.

### UX-10 Influence and diplomacy by intent

Player experience: “I am shaping borders and relationships.” Claims and alliances should visibly change the board and relationship display. New players see the immediate stakes; experts judge when territory, income, diplomatic protection, or betrayal is worth its cost.

Lead influence with `Claim sector`, `Release sector`, and `Transfer control`, derived from existing legal options. Preview territory, population/income, upkeep, and VP together; disc mechanics remain available as explanation. Do not hide colony refresh or other existing legal influence options.

Expose diplomatic offers on opponent inspection with relationship, VP, returned-population/income effects, and the specific Offer action. Keep existing resource choice explicit when meaningful. Put betrayal consequences beside the proposed movement/action and before the actual commitment that breaks relations. Do not mislabel legal passage as immediate betrayal when the rules assess end-of-action occupancy.

Acceptance: previews match influence execution and subsequent population-return choices; offers retain ownership, capacity, and traitor restrictions. Inspecting another civilization never sends an offer. Exact reputation values remain private. Existing betrayal confirmation is preserved.

### UX-11 Funding and trading in context

Player experience: “I can see how to make this plan possible and what I give up.” Offer explicit funding choices at the shortfall, with immediate resource and action consequences. Leave the strategic choice of which reserve to spend to the player.

Standardize existing atomic funding on shortfalls within research/build: show what is missing, permitted funding mixes, resulting resources, and affordable-action effect beside the intended purchase. Keep the standalone Trade tool for deliberate exchanges. Do not automatically choose and spend the player's preferred resource mix merely to save a click.

Acceptance: `Convert & research/build` executes atomically with the displayed ratio, mix, and cost. Editing a funding mix never submits. Affordability updates after draft changes. Insufficient, stale, or illegal funding is rejected without a partial trade or purchase.

### UX-12 Clear turn boundaries

Player experience: “I know what I just accomplished and who acts next.” Close completed actions with a brief result and clear handoff. Passing remains a deliberate timing decision; unused opportunities are discoverable without repeated interruption.

Use contextual `Done moving`/equivalents for ending the current action, `Pass for this round`, and `Finish upkeep`. Explain unused activations or legally available colonization when relevant. Keep ordinary transitions fast; do not introduce a mandatory confirmation dialog for every pass/end-action.

One unobtrusive opportunity reminder may be useful; reserve blocking confirmation for actual consequential choices already requiring it, such as betrayal. At ownership/phase changes, show whose turn it is and what the next real decision is. Human attention must not be hijacked by AI playback while drafting or inspecting.

Acceptance: the correct scope is clear, each activation issues one command, and no free/remaining action is silently spent. Pending decisions, AI ownership, reactions, pass state, and upkeep retain their current contracts.

### UX-13 Scoring, history, and returning to play

Player experience: “I can see my empire's progress and understand what changed while I was away.” Connect points and public events to real places and pieces. Let experts inspect exact contributions and trajectories while keeping the return to play quick.

Let selecting a score category highlight public contributing sectors, structures, or technologies. Show point deltas with the actions that cause them. Keep public totals separate from private reputation until scoring rules permit disclosure; do not invent certainty about standings.

Build on the existing public history and return recap: selecting a spatial event locates its sector, fleet, or route when meaningful. Show important public changes first with full chronological detail available. Clearly distinguish a historical location from the current board if the pieces have moved. Preserve the player's draft and previous camera after leaving inspection. Do not create mandatory acknowledgment clicks for each event.

Acceptance: category totals reconcile to the scoring engine; map highlighting uses only permitted information. Recap links tolerate removed/moved entities, partial pagination, reconnect, and missing legacy event metadata. Inspection never submits a gameplay command.

## 5. Game feel and accessible presentation

Every delivery slice must implement the relevant anticipation, manipulation, commitment, and payoff. Game feel is part of the slice's acceptance, including static and silent equivalents; it is not deferred to a finishing pass.

- Connect feedback to objects: technology tile settles into research, part snaps into a slot, ghost piece becomes a built ship, fleet follows its route, dice hit their targets.
- Select/previews should react immediately. Suggested tuning starting points: 100–200 ms for ordinary transitions, 300–600 ms for move/build results, 600–900 ms for a dice roll. These are proposed budgets, not measured performance claims. Avoid cumulative waits on large fleets.
- Sound is brief and distinctive, with mute respected. Reduced motion uses immediate state changes and static highlights. Fast/skip playback affects only presentation and must not skip player decisions.
- Do not require dragging, hovering, color recognition, or audio to complete an action. Provide keyboard focus, labeled controls, readable contrast, approximately 44 px touch targets, and meaningful accessible announcements.
- Keep controls and commit summaries reachable on narrow portrait screens; support at least 360–430 px phone widths and existing desktop review sizes. Inspect no-overlap behavior at enlarged text and short desktop heights.
- Reserve prominent success moments for discoveries, meaningful fleet upgrades, and victory. Routine confirmation should not spawn another acknowledgment dialog.

## 6. Delivery slices and dependencies

Implementation status is recorded in the delivery ledger below. The order below is the default; report any deliberate reordering with its dependency rationale.

| Slice | Scope | Depends on | Exit evidence |
| --- | --- | --- | --- |
| P0 | Observe newcomers and experienced players in baseline workflows; establish shared draft/inspection lifecycle and object entry points | Current main audit | Record option discovery, consequence comprehension, strategic choices, and felt experience alongside navigation; map existing tests |
| P1 | UX-01 research, UX-05 economy, UX-11 funding consistency, UX-12 contextual labels; movement continuation | P0 | New players can identify a purchase and its consequence; acquisition has visible payoff; action capacity is understandable; continued movement stays open |
| P2 | Full UX-03 build-first order/deployment and UX-02 multi-route movement, including piece/route feedback | P0/P1 | Players assemble, place, inspect, revise, and launch a plan; multi-sector orders and split routes remain correct; experts retain meaningful positioning choices |
| P3 | UX-04 functional ship fitting, UX-07 contextual fleet inspection, UX-08 direct colonization | P0; share capabilities with P2 | New players understand changes and available options; experts inspect counters and tradeoffs; fitting and colony feedback show results; unique parts remain safe |
| P4 | UX-06 dice roll, tray/allocation, impact feedback, and structured combat playback | P0; public inspection primitives from P3 useful | Combat has readable suspense, deliberate allocation, and clear impacts; decisions reward mastery; deterministic results and opponent/neutral playback remain faithful |
| P5 | UX-09 exploration/rewards, UX-10 influence/diplomacy, UX-13 scoring/recap; whole-game flow review | P0–P4 contracts | Reveals, territorial changes, and progress feel connected; players can explain what changed and find their next opportunity; accessibility is consistent |

Use reviewable commits within each slice; do not hold every system for one giant rewrite. P3 public capability selectors may be brought forward to support P2 build cards; record that explicitly. Reuse existing preview, funding, decision, and recovery code. Add server/event data only when a verified UI requirement cannot be met safely with the existing public projection.

### Delivery ledger (maintain in this file)

| Slice | Status | Branch / commit | Tests and review evidence | Next step / blocker |
| --- | --- | --- | --- | --- |
| P0 | Code audit complete; human baseline pending | [PR #87](https://github.com/a1j9o94/eclipse-rougelike/pull/87), implementation `8c46c74` | [Code baseline and independent review](ux_p0_baseline.md); existing draft/receipt contracts reused | Observe unfamiliar and experienced players; broader cross-workflow inspection lifecycle remains to be implemented/verified |
| P1 | First implementation ready for review; experience validation pending | [PR #87](https://github.com/a1j9o94/eclipse-rougelike/pull/87), implementation `8c46c74` | [Execution and validation](ux_p1_execution.md): 84 tests across 15 suites; full build and changed-file lint pass | Browser/physical-device and human playtests; wider funding/end-action consistency remains; continue P2 after review |
| P2 | Implemented and cross-reviewed | PR #87; planner checkpoint `4ea488f` | [Build](ux_p2_build.md), [movement](ux_p2_movement.md), [integrated review](ux_integrated_release.md) | Live fixture checks recorded; human/physical-device playtest pending |
| P3 | Implemented and cross-reviewed | PR #87; implementation `50a76be`, merge `f2869d0` | [Fitting](ux_p3_fitting.md), [inspection and colony review](ux_integrated_release.md) | Live fixture checks recorded; human/physical-device playtest pending |
| P4 | Implemented; backend rollout required for rich live replay | PR #87; additive metadata | [Combat evidence and compatibility](ux_p4_combat.md), [rollout boundary](ux_integrated_release.md) | Publish compatible Convex backend; verify live provenance/impact replay |
| P5 | Implemented and cross-reviewed | PR #87; implementation `50a76be`, merge `f2869d0` | [Contextual actions](ux_p5_context.md), [history/scoring](ux_p5_history_scoring.md) | Live fixture checks recorded; human/physical-device playtest pending |

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

### Playtest the experience and the depth

Use both participants unfamiliar with Eclipse and experienced players, with comparable positions and the same rules. Give a short goal such as “strengthen this border” or “improve your economy”; avoid teaching the route through the interface first. A browser automation pass establishes functional behavior, while human playtests establish discovery, understanding, and felt experience.

Evaluate five dimensions:

1. **Option discovery:** Can newcomers identify relevant legal actions and a specific reason an unavailable option is blocked, without a rulebook or facilitator? Can they find the next step after a reveal or unlock?
2. **Consequence comprehension:** Before committing, can they describe the main benefit, cost, and scope of their chosen action? Afterward, can they point to what changed and distinguish certainty from a dice-dependent outcome?
3. **Tactility and agency:** Can players follow the same ship, part, technology, or die through the interaction? Do they feel comfortable trying and revising a plan, and do outcomes feel connected to their choices?
4. **Delight and pace:** Which moment felt satisfying, surprising, or frustrating? Would they willingly take another turn? Observe attention and voluntary exploration alongside self-report. Routine animation must not become a repeated wait.
5. **Strategic expression:** Can experienced players compare and execute alternative viable plans based on timing, synergy, position, funding, or allocation? Ask them to explain a concrete advantage their knowledge produced. Ensure the interface does not choose away that tradeoff. A novice need not match expert performance to pass discoverability checks.

Record observations, participant familiarity, device, position, and exact task. Set improvement targets after baseline evidence; do not claim that low click counts or a small playtest prove fun. A slice needs evidence that its choices are understandable, its payoff is legible, and its strategic tradeoffs remain available. Treat a flow that is fast but confusing or unrewarding as unfinished.

### Functional acceptance tasks

- Research a technology, including a funded purchase, without looking for a separate confirmation panel.
- Assign two ships from one origin to separate sectors without closing/reopening movement.
- Assemble ships/structures before choosing locations, distribute them across sectors, revise one placement, then build once.
- Inspect an enemy fleet while planning that move/build, compare its capabilities, then return with the plan intact.
- Upgrade a blueprint by function, understand its class-wide effect, and correctly explain what happens to a stored discovery part.
- Explain affordable actions versus moves within the current action without opening the rules.
- Colonize multiple planets and understand the actual income increase.
- Complete dice allocation by touch and keyboard; identify why the same face hits one target but not another.
- Complete exploration, pass/upkeep, and resume a pending decision without losing spatial context or rerolling.

Record task success without assistance, clicks/taps, panel changes/reopens, hesitation/backtracking, and accidental commits as diagnostic measures alongside the experience findings above. Baseline these first; do not invent improvement percentages. Target zero forced planner reopenings for continuing a legal action, zero draft loss from inspection, and zero confirmations outside the active workflow. Keep meaningful allocation/track/funding choices even if they take more taps. Agent browser evidence and real human playtest evidence must be labeled separately.

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
| Release provenance is unclear | Push reviewable feature commits, record remote SHAs and validation; release through the configured main workflow |

Do not discard saves, remove old journal fields, or rename deployed backends. Presentation metadata must be additive/backward-compatible and tolerate old saves/events. If backend projection changes are needed, coordinate a compatible backend rollout before frontend dependence. Revert the affected presentation slice or use the established deployment rollback; retain data needed to read already-created saves. The documentation commit itself is reversible with a normal revert.

## 9. Design rationale and decision log

- **Visible opportunities lower the entry barrier.** Object actions, clear costs, and specific blockers let a player participate before knowing every rule.
- **Inspectable depth rewards learning.** Exact thresholds, components, and forecasts are available on demand. Players use that knowledge to improve their decisions under the unchanged rules.
- **Build-first deployment matches the player's intent.** Choosing a force and then positioning it gives fleet composition and spatial planning their own meaningful steps within one persistent workspace.
- **Local confirmation preserves attention.** Research, fitting, rewards, and funding keep the consequence and commitment beside the object.
- **Draft continuity encourages experimentation.** Inspection and reversible edits let players compare options confidently while retaining explicit commitment.
- **Functional catalogs support ship design.** Parts are found by their role; stored discovery/Ancient parts visibly retain unique inventory semantics.
- **Separate forecasts answer different questions.** Affordable future actions explain economic room; remaining activations explain the current action's capacity.
- **Combat feedback makes uncertainty and agency tangible.** Authoritative dice become editable allocations and then impacts. The presentation preserves deterministic results and all existing combat choices.
- **Spatial explanations connect strategy to the board.** Opponent inspection, colonies, territory, scoring, and history point to the ships and places involved.
- **Accessible feedback belongs in every slice.** Touch, keyboard, silent, reduced-motion, and fast-play paths communicate the same meaningful state.

General post-commit undo, strategic auto-play, combat balance changes, battle win-probability simulation, a new tutorial campaign, and a visual rebrand are outside this iteration. Contextual learning is part of every flow; it does not require a separate tutorial campaign.

During implementation, tune tray grouping, panel layout, motion timing, and sound through the playtests above. Record consequential choices here with their rationale, validation, and effect on player experience. Continue with the next incomplete slice, documenting a product or rules conflict if one arises.

### 2026-09-18 — First P1 implementation

Research now has a local purchase surface, explicit atomic funding, inspectable saved drafts, visible blockers, and ownership-confirmed acquisition feedback. The header leads with affordable ordinary actions and a disclosure of its assumptions; action previews use projected resources and influence. Movement remains open after accepted commands while capacity remains, keeps its departure context, shows remaining moves, and offers receipt-driven `Done moving`. Split destinations currently use consecutive commands within the same action; full multi-route batching remains P2.

This bounded slice builds on the existing draft provider and engine. No engine, RNG, save-schema, privacy, or deployment configuration changed. P0 human observation was not available, so engineering proceeded from the documented code baseline; P0/P1 experiential acceptance is deliberately still pending. The supported cloud browser could not reach the local preview (`ERR_BLOCKED_BY_CLIENT`). No browser, device, newcomer, or expert-playtest pass is claimed.


### 2026-09-18 — Integrated P2–P5 implementation

The full engineering implementation is documented in [the integrated release record](ux_integrated_release.md). P1 now includes contextual end-action labels across the board. Public inspection uses separate modal camera state, and per-workflow drafts remain in the existing receipt-aware provider. Optional combat metadata is backward-compatible, but its richer live playback requires an authenticated Convex rollout and is not implied by a successful frontend deployment. Human experience validation remains outstanding.

### 2026-09-18 — Ambassador inspection and trackpad zoom

Incoming and post-combat ambassador choices retain their response, partner and population cube while inspecting the galaxy. Explore/View galaxy and mobile navigation open the shared sector inspector; returning keeps the choice. Native map-scoped Mac pinch events support anchored zoom. [Release evidence](second_dawn_diplomacy_map_release.md) records failing-first tests, independent review fixes, browser screenshots, and physical-device follow-up. Rules and saved-game state are unchanged.

### 2026-09-18 — Endgame flow, visual scores, and exploration context

Finished games now offer Home, Play again, and final galaxy inspection; completed saves move to collapsed history. Scores use faction emblems and inspectable point-source tiles, with public reputation hidden and exact final ties preserved. [Scoring evidence](second_dawn_visual_scoring_release.md) and [launcher evidence](second_dawn_finished_game_navigation.md) distinguish regression/browser results from human testing. Exploration now reuses the actual galaxy and sector inspectors to reveal drawn contents and neighboring faction fleets while retaining saved placement legality.

### September 18 — Advanced population research opportunities
Advanced Labs/Economy/Mining and Metasynthesis now show eligible empty controlled planets on available and owned cards, with current colony ship/cube capacity in selected detail. Gray squares are counted once and existing unlocks are explained. See [implementation and review](second_dawn_advanced_population_release.md). Eight new behavior tests, four viewport reviews; production build and changed-file lint passed. Human playtest pending.

### September 18 — Save drafts without acknowledgements
Removed the draft-review prompt and revision-age blocking per explicit user direction. Choices continue to save and restore; current legality and server revision enforcement remain active. [Evidence and cause](second_dawn_draft_autosave_no_review.md). Combined release: 621 bounded Second Dawn tests passed, final production build and changed-file lint passed.

### September 18 — Empire identity, full-screen 3D dice, faction fleets and connections
Replaced the plain player table and mobile Empire links with a shared visual overview of economy, planets, fleets, faction abilities, research and relations. Added contextual faction effects, 24 original class/faction SVG designs, saved 3D dice settings, and nonblocking whole-screen authoritative dice animation. Normal map edges hide unmatched openings; placement retains all printed openings and Generator connections remain explicit. [Combined release](second_dawn_empire_dice_release.md) records decisions and evidence. 661 bounded tests across 134 files pass; production build and 43 changed-code-file lint checks pass. Five-size overview/map/settings and Chromium/WebKit combat reviewed. Human playtest feedback pending.

### 2026-09-19 delivery ledger — Inspect freely during a required choice

Implemented named persistent returns and a minimizable, mounted choice workspace across discovery, placement, combat, diplomacy, and other persisted decisions. Desktop sector details start collapsed and release board space; selection/spatial actions and History reopen them. Same-ID updates preserve minimized/draft state, and new decision IDs reopen automatically. Local Research/Upgrade/Trade mobile controls no longer point to redundant Details sheets. Thirteen focused tests plus related regression batches pass; actual Chromium screenshots reviewed at 1366×768, 1440×900, and 390×844. Found and fixed placement map sizing during image review. See `second_dawn_minimizable_choices.md` for decisions, source files, logs, screenshot artifacts, and limits of emulation evidence. Parent retains final integration/release gates; human newcomer/expert playtests remain distinct from these checks.
