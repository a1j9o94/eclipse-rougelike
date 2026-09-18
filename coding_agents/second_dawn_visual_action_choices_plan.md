# Visual action-choice plan

Implementation status: published. See `second_dawn_visual_actions_release.md` for the completed controls, browser verification, reviewed screenshots, and inherited lint limitations. The inventory below records the original assessment; those action dropdowns are replaced in the current implementation.

## Outcome

Every consequential Second Dawn action should be chosen from the board, a
ship/technology/planet card, or a focused visual decision panel. A player
should be able to see the thing they are changing, its legal alternatives,
cost, and consequence before the one final confirmation. Native selects may
remain for non-game navigation and compact administrative setup.

This is a planning document only. It proposes no rule, persistence, or
production changes.

## What the audit found

The current action UI already has good visual patterns that should become the
standard:

| Existing pattern | What it establishes |
| --- | --- |
| Exploration placement | Select the drawn tile and rotate a rendered sector while seeing real connections. |
| Research and funded research | Select an illustrated technology, inspect its effect, choose an exchange plan, then confirm once. |
| Trade | Choose source/output icons and amount with a live balance preview. |
| Build | Select visual pieces with +/- counts; show supply, total, funding and upkeep in one modal. |
| Move | Select ship cards, then a highlighted destination on the galaxy and route preview. |
| Discovery | Choose between illustrated reward alternatives. |

The remaining action selects are below. `SecondDawnBoard` contains a generic
`Choose an option` select that currently covers whatever action has not yet
received a dedicated planner. `DecisionPanel` contains the rest of the
decision-specific selects.

### In scope: actions and decisions

| Surface | Current select | Visual replacement | Priority |
| --- | --- | --- | --- |
| Influence | Generic candidate list: refresh, remove, add, or transfer control. | **Influence map mode.** Show remaining discs in a small rack, highlight controllable sectors, select an owned disc to remove, then select a legal target. Render the resulting before/after ownership and population-return warning. A separate, explicit `Refresh colony ships` card replaces the empty command. | 1 |
| Colonize | Generic list of one-square placements; the colonization decision then uses checkboxes plus resource selects. | **Planet-board mode.** Use the existing visual planet squares in `SectorPlanets`: click an open compatible square, choose a colony ship/resource chip when a gray/orbital square permits alternatives, and show colony ships and projected income. Batch placements remain editable until confirmation. | 1 |
| Combat allocation | Per-die target select; split damage uses numeric inputs. | **Combat target board.** Each rolled die becomes a draggable/clickable damage token; legal target ship cards visibly show hull/damage and hit/miss status. For split dice, +/− damage counters live on each target card and enforce the die total. | 1 |
| Retreat and combat turn | Select a sector ID or `fight` from a menu. | **Battle escape map.** Keep `Fight` as an illustrated combat card. Render each legal retreat sector as a miniature adjacent hex with owner/fleet/connection facts; click a card or its highlighted galaxy sector. Forced retreat shows only legal exits and explains why staying is unavailable. | 1 |
| Blueprint upgrade | Each grid slot uses a part select. | **Blueprint canvas.** Keep visible current loadout. Click a slot, then click a visual part tile from a categorized parts tray; hover/selection previews replacement, energy, stats, and why unavailable parts cannot be installed. This is the same “show what is being replaced” interaction requested for ancient-part installation. | 2 |
| Diplomacy offer | Resource select on an otherwise visual opponent card. | **Population-chip choice.** On each eligible opponent card, present only legal Money/Science/Materials cube buttons, labeled with the income loss and ambassador exchange. The selected pair gets one final offer button. | 2 |
| Diplomacy response/window | Partner select, accept/decline select, and resource select in `DecisionPanel`. | **Offer cards.** Show each eligible partner as a faction-colored card, including public relationship state and available population chips. `Finish diplomacy`, `Accept`, and `Decline` are separate explicit cards/buttons rather than values in a list. | 2 |
| Control decision | Yes/no select after entering a sector. | **Sector choice card.** Render the sector tile, an influence disc, and two direct options: `Place disc` / `Leave uncontrolled`, with resources and follow-up effects. | 2 |
| Bankruptcy | Sector-ID select. | **Abandonment map mode.** Tint abandonable controlled sectors, click one to open the consistent sector inspector, and show lost population, structures, control value, and the exact remaining shortfall before confirmation. | 2 |
| Portal placement | Sector-ID select. | **Portal placement map mode.** Highlight only legal sectors and show the portal icon and resulting network links in the inspector. | 2 |
| Free technology | Technology select plus research-track select. | **Free-research market.** Reuse research cards, badge them `Free`, limit the visible set to legal discovery choices, and show only valid track lanes on selection. Confirm the resulting tech/track pair once. | 2 |
| Population return and resource reward | One resource select for each returned cube/reward. | **Resource allocation tray.** Each cube/reward is a draggable or click-to-assign token; three resource bins use the existing Money/Science/Materials icons and show resulting track/resource changes. | 3 |
| Bombardment | Raw square ID checkboxes. | **Planet target overlay.** Use the sector’s visual population squares; select hit squares directly, with occupied/advanced type, maximum hits, and remaining hits shown. | 3 |
| Initiative order | Raw group-ID buttons. | **Initiative queue.** Render group ship silhouettes and faction ownership; click groups into numbered firing slots and allow removing/reordering before confirmation. | 3 |

### Explicitly out of scope

These are selects but not an in-game tactical or economic action choice:

- New-game civilization and AI-count setup in `SecondDawnGame`.
- The preview fixture selector used only for demos/review.
- Blueprint-civilization inspector selection. This may later become player cards,
  but it does not submit a game command.

The Build sector selector is also not a priority: the player can already choose
a sector on the board before opening Build, and the modal selector is a useful
recovery path. In the visual Build milestone it should become a compact row of
owned-sector mini-hexes, not be removed until the board-selection flow works
with keyboard navigation and narrow laptop layouts.

## Delivery sequence

### 1. Replace the generic action dropdown first

Split `SecondDawnBoard` action handling into dedicated planners. Do not make a
new generic visual list; it would recreate the same ambiguity with different
styling.

1. Add `InfluencePlanner` with map highlights, disc rack, staged remove/add
   selection, legal-target explanation, and `ActionEconomy` preview.
2. Add `ColonizationPlanner` which composes `SectorPlanets` and a visual colony
   ship/resource allocator. It must support both free colonize commands and
   the persisted multi-square colonization decision.
3. Remove the generic select only after all actions that can enter it have a
   dedicated visual surface. Until then, keep it as an internal development
   fallback behind a clearly marked incomplete-action guard, never as the
   default human UI.

### 2. Replace high-frequency combat decisions

Create a `CombatDecisionBoard` shared by allocation, combat-turn, retreat,
initiative, and bombardment. It should consume only `PlayerView` and the
persisted `PendingDecision`, and submit the existing `resolve` commands.

- Reuse `BattleOverview`, `ShipSilhouette`, `SectorFleet`, and galaxy geometry
  rather than creating alternate fleet or sector representations.
- Use sector IDs only as accessible labels and inspector detail, never as the
  primary choice label.
- Preserve editable drafts until confirmation; dice rolls and draws remain
  committed and cannot be undone.

### 3. Finish player-board decisions

Replace blueprint part selects with a visual slot + part-tray editor and
replace diplomacy resource/response selects with faction and population-chip
cards. Both must retain public/private information boundaries: opponents'
blueprints stay public; reputation values remain hidden until final scoring.

### 4. Finish uncommon persisted choices

Add the focused map/tray interfaces for control, bankruptcy, portal placement,
free technology, resource rewards, population returns, bombardment, and tied
initiative. These can share primitives from the first three milestones:

- `ResourceChoiceChips`
- `SectorTargetMode`
- `PlanetSquareSelector`
- `FactionChoiceCard`
- `ShipGroupQueue`

## Architecture guardrails

- Keep `GameCommand`, `PendingDecision`, the command processor, and Convex
  journal format unchanged. UI drafts derive from `PlayerView`; only the final
  existing command is submitted.
- Legal highlights come from existing candidate commands or a pure public-view
  selector tested against those candidates. The UI must not recreate hidden
  game state or predict private deck information.
- Every visual chooser needs an equivalent keyboard interaction, visible focus,
  accessible name, and non-color marker. Cards and hexes use buttons/radio
  groups/checkboxes where their semantics fit.
- Keep a single confirmation for editable drafts. Direct actions stay direct;
  warn only where an irreversible stated consequence exists, such as taking the
  traitor card.
- Every replacement includes cost, legal-target reason, and projected upkeep in
  the current action surface. Conversion planning continues to use the existing
  atomic `trade-and-act` command; it never executes an interim trade.

## Test and review plan

Write failing tests before each planner. For each replacement, cover:

1. Visual selection produces the exact existing command/decision choice.
2. Disabled/illegal targets explain why and do not mutate a draft or submit.
3. Changing a choice updates cost, resources, upkeep, and legal targets.
4. Cancel abandons only local draft state; refresh restores an outstanding
   persisted decision exactly.
5. Keyboard operation and accessible labels are equivalent to pointer use.

Add targeted authoritative scenarios for pinning, forced retreat, split damage,
advanced planets, gray/orbital resource choice, traitor/diplomacy constraints,
bankruptcy, and faction exceptions. Run the bounded Second Dawn suite,
changed-code lint, production build, and save/reconnect tests after each
milestone.

Capture and inspect deterministic 1366x768, 1440x900, and 1920x1080 screens
for Influence, Colonize, each combat state, Blueprint editor, Diplomacy,
Bankruptcy, Portal placement, and Free technology. Review confirmation
visibility, overlays, target clarity, ownership, keyboard focus, enlarged text,
and whether any vital fact requires reading a raw ID. Only after review should
the screenshot baseline change.

## Acceptance criteria

- No game action or persisted decision uses a native select as its primary
  choice UI.
- A player can answer “what am I changing, what can I choose, and what will it
  cost?” from the current visual workflow.
- Sector, ship, part, resource, technology, and population choices use their
  consistent visual representations throughout the game.
- All submitted commands remain authoritative, legal, replayable, private-view
  filtered, and resumable.
- The complete action/decision browser walkthrough, focused rule tests, and
  reviewed desktop screenshots pass without visual regressions.

## Risks and rollback

Combat and Influence have the largest combinatorial surface, so their planners
should be introduced behind their existing command candidates and retain the
current controls in development until parity tests pass. The production rollback
is component-level: restore the existing action/decision component while
leaving domain state, saved games, and journals untouched.
