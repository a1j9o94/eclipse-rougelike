# engine_agent

## Charter
Scaffold pure engine + controller + selectors with strong typing and zero business logic.

## Immediate TODOs
- [ ] Add `src/game/state.ts` with `GameState` and related stubs.
- [ ] Add `src/game/commands.ts` defining initial command union.
- [ ] Add `src/game/effects.ts` with `Capabilities` and no-op/convex stubs.
- [ ] Add `src/game/engine.ts` exporting `apply(state, command)` (identity for now).
- [ ] Add `src/controllers/controller.ts` and `src/selectors/index.ts` skeletons.

## Acceptance
- New files compile under strict TS.
- No external behavior changes; only scaffolding.

## Status Log
## 2025-09-06 09:00 — Ready
- Context: Waiting on test runner verification and branch confirmation.
- Next: Create files and run typecheck locally.
- Decisions: Keep engine pure; return `[state, Effect[]]` from `apply`.
## 2025-09-11 — MP/SP Reroll Unification
- Files touched: `src/hooks/useOutpostPageProps.ts`, `src/engine/commands.ts`.
- Change: Removed MP-only UI override of reroll label to `economy.rerollBase`; UI now uses authoritative `rerollCost` for both SP/MP. Unified engine to always use parameterized `*WithMods` paths with `economyMods || getDefaultEconomyModifiers()`.
- Effects: Reroll button label/disable in MP reflect server-synced cost; increments consistent across modes.

## 2026-09-06 — Local Eclipse demo entrypoints
- Outcome: Both Eclipse board previews load as local pages and link back to the original roguelike and each other; page copy explicitly states complete matches are unavailable.
- Entry fix: Extracted inline JSX from all three demo HTML files into TSX modules. Included the original app and three demos in Vite's production inputs.
- Failure reproduced before implementation: Building the Eclipse HTML entries failed with `PARSE_ERROR: Expression expected` at inline `<StrictMode>`.
- Regression coverage: `src/__tests__/eclipse_demo_navigation.spec.tsx` exercises real board rendering, selection, display toggles, variable player count and local navigation. Initial run could not resolve the declared but missing `react-hexgrid` dependency; supervisor is repairing installation.
- Interfaces/effects: No public interface changes or remote effects.
- Rollback: Revert the demo HTML/pages, new TSX entry modules, Vite build inputs and focused tests together.

## 2026-09-06 — Variable demo startup repair
- Outcome: Variable galaxy initializes in the browser through Vite's ESM imports, and its integration test renders the real zoom wrapper.
- Files touched: `src/lib/galaxy-setup.ts`, `src/__tests__/eclipse_demo_navigation.spec.tsx`.
- Red: Reproduced missing JSDOM ResizeObserver plus CommonJS `require('react-hexgrid')` module-resolution failure. Added a scoped observer stub; the real galaxy initialization still failed before the implementation change.
- Implementation: Replaced the runtime require with the existing module's named `GridGenerator` import. No interfaces or effects changed.
- Green: Focused navigation suite passes 3/3, including actual sector counts at two and six players, adding four guardians, selection, navigation and toggling zoom off.
- Result & Next Steps: Supervisor owns final lint/build and local server verification. Dependency sourcemap warnings are non-fatal.
# 2026-09-07 — Local startup completed
- Kept configured Convex client/provider enabled per user direction; no opt-out flag.
- Multiplayer and public-room hooks now check the actual provider, preventing isolated render crashes when an environment URL exists without React context.
- Main entry renders solo without a provider as a fallback and no longer dumps environment variables.
- Build with Convex codegen passed; configured read-only faction query succeeded. Existing backend data unchanged.
- Result & Next Steps: local server running on port 5173; board previews repaired. Full Eclipse match wiring and pre-existing lint errors remain separate work.

## 2026-09-07 — Second Dawn foundation result
New isolated shared/eclipse catalogs, contracts, deterministic random/supplies, protocol and rule primitives; hash-only Convex guest table/actions and browser credential storage; separate interactive fixture route. Full dispatcher, match persistence and AI are not implemented. Production build and strict domain typecheck pass. Details and remaining completion gates: coding_agents/second_dawn_status.md.

## Full-game integration result

Implemented setup/actions/decisions/round progression, authoritative guest matches, scheduled AI, live UI, source-audited catalogs and local startup. Public boundaries use explicit domain types. The engine clones and validates commands before commit; randomness, pending choices and continuation records persist in versioned snapshots. See `coding_agents/second_dawn_status.md` for module-level behavior and final evidence.

## 2026-09-08 — Research and upgrade explanations revision
- Outcome: players can read concrete technology and part effects before committing, and compare their current ship with the draft.
- Added exhaustive presentation helpers in `src/second-dawn-game/itemDescriptions.ts`. Every base technology effect uses the typed authoritative catalog; every part reports its real dice, damage, timing, energy, movement, hull, computer, shield and initiative. No generic unknown-effect fallback.
- Upgrade slots show the effective printed/installed part effects. Available choices include their effect in the option text. Current/draft table includes weapons and destruction threshold. Expanded glossary explains attack rolls and all key ship stats. Confirmation is grouped in an opaque sticky footer to prevent the prior button overlap.
- TDD evidence: `coding_agents/logs/second_dawn_effects_red.out` records missing-helper/missing-table failures; `second_dawn_effects_green.out` records 5 passing tests. Changed-code ESLint passed; full build passed (`second_dawn_effects_build.out`). Repo-wide lint still fails inherited debt (`second_dawn_effects_lint.out`).
- Visually inspected actual 1366×768 upgrade screen and scrolled comparison; screenshots `second_dawn_upgrade_effects_revision.png` and `second_dawn_upgrade_comparison_revision.png`. Effects/table are legible; footer no longer overlays table text. Root owns final multi-size combined design review.
- Integration: `describeTechnology(getTechnology(id))` returns full effect prose for research cards; `describeShipPart(id)` for inspectors. No engine/rule behavior changed.

## 2026-09-08 — Shipyard visual and icon-first revision
- Independently inspected actual research and upgrade at 1366×768 and 1440×900. Identified unrelated sector prompts in item workflows, repetitive research prose and incorrect owned-item track captions; sent root actionable findings. Root replaced workflow prompts.
- Added original native vector silhouettes for all four ship classes, a reactor readout, and numbered component panels. Silhouette is decorative identity, not a physical hardpoint map.
- Latest user steering prioritized icons over prose. Added reusable `ShipPartStats` and `StatBadge` with consistent SVG symbols, large numeric effects, short labels, colored weapon dice/damage and full accessible explanations. Selected upgrade parts now show these badges first; prose sits in expandable details.
- Verified shield is stored as positive magnitude; −1/−2 display is correct, not a double negative.
- Tests: 8 targeted tests pass. Added red/green accessibility tests for part-specific stat groups, Gluon +3 computer/−2 energy, missile timing and shields. Changed ESLint passes; full production build passes. Actual `second_dawn_shipyard_icons_1366.png` reviewed: badges large and immediately identifiable, no overlap. Full multi-screen review remains root-owned.

## 2026-09-08 — Running VP and frozen-score privacy
- Added typed `runningScore(view, seatId)` presentation helper, using exactly the authoritative `scoreSeat` inputs: printed sectors, monoliths, portals, discoveries, ambassadors, traitor, research, faction VP and resources. Own reputation is included; opponent reputation is omitted explicitly. Public discovery counts safely yield 2 VP each.
- Frozen eliminated scores are retained, and final published scores take precedence over recalculation. Opponent calculations do not access the viewer's private state.
- Audit uncovered an existing leak: `getPlayerView` published frozen eliminated scores with their private reputation while a match continued. Fixed server boundary to omit opponent reputation and subtract it from totals; own/final values stay exact and authoritative snapshots are unchanged.
- TDD: five new score/privacy cases; 42 related scoring/protocol/Convex/round tests pass. Production build and changed ESLint pass. Logs: `second_dawn_running_score_red.out`, `second_dawn_frozen_privacy_red.out`, `second_dawn_score_protocol_green.out`, `second_dawn_score_build.out`.
- StatBadge now uses role="img" so each icon + value has a reliable accessible name without adding tab stops.

### User correction — public VP excludes every reputation tile before game end
- Running score now excludes reputation for every seat, including the viewer, until final scoring. This keeps all public comparisons on the same basis. Own private reputation remains in the authorized private rack; it is not added to the public score.
- Own frozen reputation is also subtracted in the running-score helper. Final published totals include reputation normally. Six score/privacy tests pass after a new failing public-own-score test; changed lint is clean.

## 2026-09-07 — Explicit discovery reward preview
- Added `DiscoveryDecision.tsx`, a typed discovery-only decision component. It resolves the exact pending tile ID against the base catalog and displays its actual name, icon-first numeric reward and acquisition consequences before the player chooses reward versus 2 VP.
- All catalog effect kinds covered: immediate resources, free lowest-cost regular technology, cruiser placement using own blueprint, orbital plus materials and later colonization, monolith/portal final-controller points, ancient-part free installation or storage (including permanent outside-grid Muon Source).
- Neither side is silently selected. Player chooses a radio-style side, then confirms an authoritative resolve command. Honors pending options and disconnection. If Ancient Tech has no eligible market choice, the reward is disabled with a specific explanation.
- Eight targeted tests pass after missing-component red evidence. Changed-code ESLint and full production build pass. Logs: `second_dawn_discovery_ui_{red,green,build}.out`. Root owns DecisionPanel integration; rendered review follows integration.

### Discovery integration render review
- Root integrated the component into DecisionPanel. Captured and inspected actual seeded discovery (Conformal Drive) at 1366×768, 1440×900 and 1920×1080. Actual name and movement 4 / initiative +2 / energy −2 are immediately visible beside the 2 VP alternative. Both sides, all reward details and confirmation fit above the fold at all three sizes; no horizontal overflow.
- Native radio inputs supply non-color selection and correct keyboard behavior. Browser checks verified Space selection and ArrowRight/ArrowLeft switching at every size; confirmation is at y≈566 and remains fully visible. Evidence in `second_dawn_revision_screenshots/discovery-review.json` and `{size}-discovery.png`.
- Cruiser reward uses the Cruiser silhouette; orbital/monolith use distinct structure symbols. Changed-code lint and full build pass after final changes. These are agent browser checks, not a human playtest.

## 2026-09-07 — Real Ancient encounter fixtures
- Extended the existing deterministic seed-106 fixture generator. Same 841 real engine commands generate 22 fixtures; no alternate seed or fabricated combat state was necessary.
- `exploration-ancients`: command 14, round 1, Planta/p2 draws sector 204 with one Ancient.
- `ancients`: command 15, round 1, no outstanding choice, sector 204 has one surviving Ancient.
- `ancient-combat`: command 547, round 6, sector 303; Eridani/p0 Cruiser attacks one Ancient, with a persisted p0-owned combat-allocation decision.
- Metadata recorded in `second_dawn_review_fixture_targets.json`. Three new fixture-presence/behavior tests pass after red failures. Generator and changed tests lint clean. Existing fixtures are regenerated deterministically in the same playthrough; no React UI changed by this subtask.

## 2026-09-07 — Visual ancient-part installation
- Added `AncientPartDecision.tsx`. Player selects a ship class, sees every effective printed/installed part, and clicks a legal replacement slot. Preview names the replaced component, shows all resulting stats and weapons, and warns when replacing an ancient part destroys it.
- Uses exact commands from the authoritative candidate list; no synthetic install or Upgrade commands. Storage is an explicit choice/confirmation. Muon Source uses its legal outside-grid candidate and explains permanent placement without replacing a component.
- Four targeted tests pass after missing-component red failures: exact legal submission, class-specific loadouts, disabled unsafe placement plus storage, and Muon outside-grid installation. Root owns DecisionPanel integration.

### Ancient installation browser and layout verification
- Added reproducible browser harness `tools/second-dawn-ancient-part-review.mjs`. Actual discovery → use Conformal Drive → install in Interceptor succeeds at 1366/1440/1920. Storage succeeds separately. All four ship classes expose the actual 4/6/8/5 slots; Starbases have zero legal drive destinations, and energy-invalid Nuclear Source replacement is disabled.
- Initial 1366 render placed confirmation below the fold. Changed the preview to show only changed statistics first, with full statistics expandable, and tightened spacing. The final harness confirms the complete confirmation button is above the footer at every size.
- Inspected screenshots at all three sizes plus Dreadnought at 1366/1920. Selecting its seventh slot scrolls the larger grid while the result preview and confirmation remain visible. Dreadnought installation also completed through the actual engine. Disabled slot names were given full-opacity readable text and dashed borders.
- Final focused tests (4 UI + 3 fixture tests), changed lint and production build pass. Evidence: `logs/second_dawn_ancient_part_{browser,ui_green,ui_build}.out`, `second_dawn_revision_screenshots/ancient-part-review.json`, `{size}-ancient-part.png`, and `{size}-ancient-dreadnought.png`. No human playtest claim.

## 2026-09-07 — Visual decisions and game-stage review

Root integrated ExplorationDecision, DiscoveryDecision, AncientPartDecision and BattleOverview into the shared saved/preview board. Added SectorFleet with owner/type grouping, silhouettes/counts and per-ship damage details; exact public engine states now have visible stage shortcuts and direct links. Domain commands, persistence and rules are unchanged. Reviewed planet baselines explicitly; fixed exploration confirmation clipping and compacted combat allocation. Engine fixture generator captures actual Ancient exploration/defense/combat. Functional verification: 301 tests across 53 files plus 17 focused post-integration tests pass. Remaining release work: finish reviewed screenshot closure and publish the latest stage/install/fleet changes.

### Follow-up: clipped current-part row on laptops
Root review correctly identified that the lower interceptor row was still below the footer even after confirmation became visible. Reduced slot-card padding and repeated unavailable wording while retaining 24px symbols and readable numbers. Reinspected 1366: all four complete slots now end at y≈669, before footer y≈687; confirmation ends at y≈679. Browser harness now checks every slot rectangle against both the actual scroll workspace and footer, not merely the confirmation rectangle. `allSlotsVisible` passes at 1366/1440/1920. Four UI tests and changed lint pass after this fix.

## 2026-09-07 — Owned technology collection in Research
- Added `ResearchedTechnologies.tsx` with `seat` and optional `onInspect(TechnologyId)` props. Own technologies appear immediately in a compact, initially open collection with Military/Grid/Nano placement, current counts, names and effect symbols. Rare tiles appear in their actual selected track. Empty tracks explicitly say no technologies yet.
- Collection collapses to its total for longer late-game lists. Every tile is a keyboard-operable inspect button; it calls the main inspector callback or renders its own full effect text when used independently.
- Three focused tests pass after missing-component red evidence: actual rare placement/track grouping, empty tracks/counts, and inspectable rules without callback. Changed-code lint passes. Root owns Research-tab integration and final UI review.

## 2026-09-07 — Visual research price and science budget
- Added `ResearchCost` and `ScienceBudget` components. The same science flask identifies both the player's available budget and each effective discounted price, with large numeric values and a short budget/shortfall indicator. Each card prints its full price once; owned/unavailable states omit a spurious price.
- Optional `from` marks rare technologies when actual track choices have different discounted costs. Base/minimum catalog prices remain inspector material.
- Provided root precise integration instructions to remove the duplicated candidate-description price line while preserving distinct action/turn restrictions. Root owns board markup.
- Three new TDD cases pass for a single visible cost, numerical shortfall, budget identity, researched/unavailable states and variable-track minimum. Changed lint passes.

### Research collection and price browser review — 2026-09-07

Outcome: owned technology effects and available research prices are visible together, with a matching science budget and one effective price per market card.

Reviewed six actual browser images at 1366×768, 1440×900 and 1920×1080 after the layout fixes. The collection initially showed excessive margins because generic tabletop details/tile styles overrode component spacing; component-specific selectors and compact laptop spacing resolve this. A generic card strong selector also reduced price numerals; effective science prices now render at 22.4px at every reviewed size. Root compacted the surrounding Research header and market gaps. At 1366×768, all four first-row market cards end at y673 before the footer at y687, including Gluon Computer +3 computer / −2 energy. The owned three-track collection, budget, persistent resources, upkeep preview and roster remain visible without overlap. Subsequent market rows deliberately scroll.

Selecting an owned Plasma Cannon opens its actual effect. Root fixed market selection's prior unintended sidebar scroll; selecting Gluon now keeps its heading and complete effect at the top at all sizes. On the shortest viewport the research command selector remains farther down the scrollable inspector, while the chosen technology effect and upkeep preview are visible. One minor selection-state issue was reported to root: the previously inspected owned tile can retain its internal pressed highlight when a market tile becomes selected.

Evidence: `tools/second-dawn-research-review.mjs`, `coding_agents/second_dawn_revision_screenshots/research-review.json`, and the six `*-research-owned.png` / `*-research-selected.png` images. Automated browser bounds verify owned and entire first market row visibility, unique price badges, inspector scroll reset and no horizontal overflow. Six focused component tests pass; changed TypeScript/test/script files pass ESLint. Earlier production build passed; root owns the final integrated build gate. This is agent image and workflow review, not human aesthetic approval or a timed human playtest.

### Visual trade draft and controlled research selection — 2026-09-07

Outcome: choose received and spent resources by icon, adjust the received quantity without committing, inspect spend/gain and every remaining resource, then explicitly confirm. Acceptance: faction ratio comes from reviewed catalog, legal supplied command pairs authorize trading, integer quantities stay within budget, reconnect/disabled/stale views cannot submit an invalid draft. Resource swaps neither consume an action disc nor end the turn.

Implemented `TradePanel.tsx` and `tradePanel.css`, exporting reusable `TradeResourceIcon`. Pure `tradeResources` validates quantity and computes the preview; candidate generation's unit trades establish pair legality while the engine accepts a positive whole received amount. Four focused behavioral tests cover multi-unit draft/confirmation, input and output switching, budget cap, Terran 2:1 / standard 3:1 / Orion 4:1 ratios, stale candidate removal, and disconnection. Initial missing-component failure is preserved in `logs/second_dawn_trade_panel_red.out`. A test initially mislabeled Mechanema as the 4:1 faction; catalog inspection corrected that test to Orion before completion.

Added optional `selectedId` to `ResearchedTechnologies`, retaining internal behavior for standalone use. A failing-then-passing regression verifies switching to a market technology clears the prior owned selection when root passes the current inspector selection. Root owns integration and final build gates. Browser review follows integration; rollback is isolated component replacement with the prior trade form.

Trade integration review: root placed the panel in the main workspace. Added a bounded 900px two-column layout pairing received/payment resources, amount/swap preview, and balances/confirmation. Actual screenshots at 1366×768, 1440×900 and 1920×1080 show all controls and every projected resource balance above the footer, with no horizontal overflow. Resource icons are 30px in choices; selection uses a check as well as color. `tools/second-dawn-trade-review.mjs` exercises increment/decrement, output switching and actual engine confirmation (3 materials → 1 money) at all three sizes; `trade-review.json` and `*-trade.png` contain evidence. Screenshot capture waits for button color transitions to settle. Four Trade tests and four owned-selection tests pass, changed files pass ESLint, and `tsc -b` passes. Minor root-owned inspector label still says Sector Inspector on the Trade screen; its exchange explanation is correct. Agent review only, without human aesthetic or playtest approval.

### Galaxy ownership emphasis and quieter sector IDs — 2026-09-07

Outcome: territory reads by faction at a glance while sector catalog numbers become secondary. Acceptance: darker faction-tinted sector faces and stronger owner borders; unchanged non-color owner badges and full sector identity in accessible controls/inspector. Neutral territory remains distinct. Keep existing artwork, geometry, wormhole pairing and selection behavior.

Implemented six dark radial territory gradients in `GalaxyBoard.tsx`, based on existing faction color assignments. Owned border width increases from 1.2 to 2.4 with stronger inner outlines; selected tiles retain a brighter 3.5 outline. `galaxy.css` reduces sector IDs from 17px overview / 13px detail to muted 9px, while owner numbers remain 14px / 11px respectively. White territory uses steel gray and black territory dark charcoal with a restrained violet tint, preserving their numbered badges for unambiguous ownership.

TDD: new ownership fixture test failed on neutral face reuse, then passed after implementation. All four galaxy tests pass, including rotated wormhole direction and physical-connection checks. Changed files pass ESLint and `tsc -b` passes. No snapshot baselines changed.

Browser evidence: `tools/second-dawn-ownership-review.mjs`, `ownership-review.json`, and 18 `*-ownership.png` / `*-ownership-fit.png` captures under `second_dawn_revision_screenshots`. Inspected all nine initial images (opening/midgame/late ×1366×768,1440×900,1920×1080) plus the three midgame Fit images. Territory boundaries and numbered badges remain distinct; ownership colors have stronger area coverage without obscuring fleets or wormholes. Full Sector 222 identity is verified through one selection at all nine size/position combinations. Initial camera remains player-focused and crops distant southern territory; Fit shows the complete galaxy. At 1366 Fit the intentionally small overview requires zoom or inspector selection for detailed component facts. This review is agent evidence, not human aesthetic approval.

Movement coordination: added optional `legalTargetIds?: string[]` to GalaxyBoard. Legal destinations show a cyan dashed inset ring, retaining faction fill and border; accessible tile labels append “legal move destination” with a descriptive tooltip. Normal sector names remain unchanged. Failing-then-passing fixture test verifies exactly the requested destination is marked and its owned face remains tinted; all five galaxy tests and changed-file ESLint pass. Movement integration/actual rendered target review is coordinated by root with the movement agent.

## 2026-09-07 — Visual Influence and Colonization planners

Outcome: Influence and Colonize no longer need the generic command selector. `InfluencePlanner` stages a return-disc source and a legal destination as mini hex cards; it emits only the exact authoritative candidate command, has a separate colony-ship refresh card, shows the action/upkeep preview, and reports legal target IDs for galaxy rings. Parent map selection is consumed as source then destination without a callback feedback loop.

`ColonizationPlanner` renders legal empty population spaces with printed planet icons, advanced markers, cube resource chips, colony-ship supply, and the sector inspector. It stages multiple squares locally, checks colony-ship and matching population-track capacity, and sends one multi-placement `colonize` command. The same component accepts the persisted colonization decision and sends one `resolve` choice with all selected placements, or an explicit empty finish choice. Domain commands, rule state, and Convex schemas are unchanged.

TDD evidence: `second_dawn_influence_colonization_planner.spec.tsx` began with missing component imports and now has six focused passing cases: direct source/target influence, disabled refresh, map-first selection, free colonization, no-options explanation, and multi-square persisted choice. Changed component/test files pass ESLint. The root integrates the parent board and DecisionPanel; the full build was temporarily blocked by a concurrent DiplomacyPanel narrowing error, reported to root.

### Visual Build sector choice

Replaced BuildPlanner’s remaining controlled-sector native select with compact owned-sector mini-hex buttons. Each is named `Build in sector N`, exposes its selected state, and shows population/fleet counts before any component draft begins. Selecting a different sector resets the local ship counts and conversion plan, so an order cannot silently apply to the prior sector. A new failing-then-passing Build test verifies no combobox remains, draft reset, and exact target sector in the submitted command. Five BuildPlanner tests and changed lint pass.

### Influence and Colonization sidebar review

Root integrated the planners beside the full galaxy, so the map remains the primary target surface while the inspector stages and confirms the choice. Compact inspector overrides stack source/destination cards and planet facts, constrain long sector lists to their own scroll area, and lay population chips in two readable columns. Confirmation uses `scrollIntoView` with a footer margin after either map or card selection. A direct-add map regression now proves a legal uncontrolled map target stages the corresponding Influence candidate even when no source disc is selected.

Reviewed the actual `workflow-influence` and `workflow-colonize` engine fixtures at 1366×768, 1440×900, and 1920×1080. Confirmations were fully above the fixed footer at every size, page horizontal overflow was false, and browser errors were empty. At 1366 visual inspection found a clipped third resource chip in the Colonization sidebar; two-column chips fixed it while retaining the resource names/icons and visible confirmation. Evidence: `second_dawn_revision_screenshots/influence-colonize-review.json` and `*-influence-planner-compact.png` / `*-colonize-planner-compact.png`. Twelve focused Influence/Colonization/Build tests pass; changed TypeScript and test files pass ESLint.

### Visual faction board picker — 2026-09-07

Added reusable `FactionPicker` and typed `factionPresentation` for setup, with
no catalog, command, persistence, or setup-rule changes. It pairs the alien
and Terran sides of each physical board by color, disables an entire claimed
board with the provided reason, and expands only the selected side. The detail
shows colored resource icons and counts, actual starting technology-stat
cards, starting ship/permanent blueprint summary, prominent advantage values,
and the faction's practical constraints. Controls are native pressed/disabled
buttons with color-independent labels.

Copy is based on the local source audit, `BASE_FACTIONS`, blueprint definitions,
and exact relevant engine branches. A late audit corrected three misleading
shortcuts before integration: Planta has two Explore activations and loses
population at end-of-combat only to an occupying opponent; Draco chooses one
of its two drawn sectors or discards both; Mechanema's Upgrade allowance counts
part installations, while removals are free. Primary faction choices are 14px;
effect labels/support and resource labels are 13/12/11px, respectively.

TDD began with the missing component import. Four focused tests now cover board
pairing/selection, selected-only detail, claimed-board behavior, and the
catalog/engine exception facts. Changed-file ESLint and `tsc -b` pass. Design,
source, API, and follow-up evidence are recorded in
`coding_agents/second_dawn_faction_selection.md`. Root owns `SecondDawnGame`
integration. After that integration, actual local solo setup was reviewed at
1366×768, 1440×900 and 1920×1080 with Planta selected; no browser errors or
horizontal overflow occurred. Faction names/effect labels/rule support/resource
labels measured 14/13/12/11px. Tech cards now include the exact plain-language
effect from `describeTechnology` alongside their existing icon-first stats,
which made the Starbase and part unlocks understandable without prior rules
knowledge. Eridani's three starting technology cards were also inspected at
1366×768 and fit on one row without clipping. Evidence:
`tools/second-dawn-faction-picker-review.mjs` and
`second_dawn_revision_screenshots/faction-picker-review.json`, the three
`*-faction-picker.png` captures, and `1366x768-faction-picker-eridani.png`.
### Visual blueprint slots and diplomacy population cubes — 2026-09-07

Outcome: component and ambassador choices now show the concrete game pieces being changed before the existing final command confirmation.

`BlueprintEditor` no longer uses a native part selector. Its keyboard-operable hardpoint canvas shows the present loadout; selecting a hardpoint opens a visual part tray grouped into Standard, Researched, and Ancient components. Each component tile carries its combat/energy symbols and plain-language effect. A persistent current → draft replacement strip makes the overwritten component explicit. Locked technology and undiscovered Ancient parts are available in an explanatory disabled tray. The underlying local draft, `upgrade` command, validation, capacity, preview, and confirmation behavior are unchanged. Existing outside-grid component handling remains intact.

`DiplomacyPanel` now presents Money, Science, and Materials population cubes as accessible pressed buttons on the relevant faction card. Each choice uses `incomeForPopulationAway(track + 1)` to show the viewer's exact income before → after moving that cube off their own population track; it makes no claim about the partner's resource selection. Unavailable cube types are disabled with a reason. The existing supplied legal `offer-diplomacy` command is still the only value submitted.

TDD: updated selector-dependent shipyard tests before replacing the controls, then added coverage for absence of native selectors, slot/tray semantics, locked-part explanations, visually selected population cubes, inaccessible cube explanation, disconnected state, and exact submitted commands. Focused verification passes: 10 tests across blueprint editor, shipyard navigation, and diplomacy panel; `tsc -p tsconfig.eclipse.json --noEmit`; ESLint on each changed implementation/test file.

Browser review: captured the real local preview at 1366×768, 1440×900, and 1920×1080 after selecting interceptor hardpoint 4 and installing Hull. The slot's current → draft state and the final confirmation remained visible at every size; the 1366 image showed that card focus can scroll the hardpoint canvas above the viewport, so the sticky confirmation now repeats `Slot 4: Empty → Hull`. The parts tray uses bounded responsive grids and leaves further researched parts scrollable rather than shrinking them. Evidence: `coding_agents/second_dawn_revision_screenshots/*-blueprint-visual-tray.png`. This is implementation-agent visual review, not human playtest evidence.
### 2026-09-07 — visual actions and multiplayer delivered

Implemented specialized visual action/decision controls and the shared visual faction selector; added RoomLobby and TurnClock to the full-game flow. Convex room/seat/timer storage is additive. Existing command validation, private views, journal, and Normal AI process multiplayer and timeout actions; timer reconciliation is atomic with commands. Public timeout markers identify AI actions without exposing private choices. Production release and exact deployment IDs: `coding_agents/second_dawn_multiplayer_release.md`.

### 2026-09-08 — persistent identity backend

Added typed player profiles, independent recovered device sessions, PIN/recovery login, authorized recovery-code replacement, and atomic guess throttling. Existing guest IDs stay canonical so old solo/multiplayer ownership survives registration. Shared resolver is wired through guest, match, and room endpoints; public display names are projected without identity secrets. Node actions use PBKDF2-HMAC-SHA256 at 600,000 iterations and cryptographic randomness. Independent review caught a recovery-rotation/login race, now guarded again at final session insertion. Implementation and source audit: `coding_agents/second_dawn_player_identity_backend.md`. TDD: 10 identity tests plus 11 existing guest/match/room adapter tests pass; scoped lint and production build pass. Supervisor owns deployment and browser verification.

### 2026-09-08 — readable AI scheduling

Ordinary AI decisions and chained takeover/retry decisions now use a shared 1,200-millisecond scheduling delay. Initial multiplayer timeout remains at the actual human deadline, and the expired seat remains locked during takeover pauses. No rules, schema, identity, or deadline changes. Three new failing-first scheduled-delivery tests and 16 existing adapter/solo/completion tests pass; scoped lint and build pass. Audit and timing caveats: `coding_agents/second_dawn_ai_pacing_backend.md`.

### 2026-09-08 — one confirmation for repeated ship movement

Movement planning now searches routes across multiple available Move activations and emits existing sequential move segments for the same ship. Shared fleet activation budgets, range, connections, and pinning remain authoritative. Cards show sectors per activation, route rows group each unique ship, and confirmation shows actual activation cost. Public history counts unique ships and identifies repeated activations. Five new planner/engine regressions and one history regression bring the focused movement/history/actions/rules batch to 37 passing tests. Scoped lint, TypeScript, and build pass. Source audit and review handoff: `coding_agents/second_dawn_multi_activation_movement.md`.

### 2026-09-08 — typed public action results for AI panels

Added optional `PublicHistoryEntry.presentation` references for accepted research, upgrades, construction, moves, influence, colonization, and publicly placed explored sectors. Sector/ship IDs are filtered against public context; hidden draws and private decisions receive no metadata. Existing journals remain compatible. Six new failing-first projection tests plus existing history/Convex tests pass (14 total); scoped lint, TypeScript, and build pass. Repository lint stays at inherited 88 errors/12 warnings. Audit: `coding_agents/second_dawn_public_action_presentation.md`.

## Fleet cards and civilization emblems — result
Implemented bounded owner/class map cards with reusable ship silhouettes, ×counts, all-group inspector cards, original shared alien/Terran emblems, and optional public GalaxyActivity pulse/move trails with reduced-motion support. Added FactionSymbol, factionColors and GalaxyActivity contracts; presentation-only. Updated FactionPicker, GalaxyBoard, SectorFleet and CSS. 13 focused tests + TypeScript + scoped lint pass. Browser-reviewed three desktop sizes; fixed actual nested SVG viewport interception. Root coordinates final suite/build/deployment and AI turn pacing integration.

## Public AI action inspector — result
Added AiActionPanel.tsx and aiActionPanel.css with read-only research, current changed-class blueprints, build quantities, public movement/sector context and generic history details. Typed public presentation from history agent; no private field access or editable AI controls. Five TDD tests green, scoped lint/TypeScript pass. Eight deterministic real-board browser captures at two laptop sizes reviewed; root owns pacing/integration/deployment.

## Mobile resume and final integration — 2026-09-08
Added optional ownership read markers, authenticated monotonic markMatchSeen, per-visit public recap boundaries, foreground/reconnect revalidation, mobile launcher/profile/faction access and live/preview receipt integration. Shared domain rules and deployed game snapshots remain unchanged. Shell/draft/map agents completed their bounded scopes; root fixed exploration connection sizing, trade width and mobile AI retry after actual review. Feature branch: feature/second-dawn-mobile. Result and evidence: second_dawn_mobile_release.md; physical Android/iPhone feedback remains separate from browser verification.

## Combat casualty provenance — 2026-09-18

- Outcome: destroyed player and neutral ships retain their public class and owner for visible casualty feedback, including after reconnect.
- Added optional `shipType`/`owner` to public volley targets and additive `PlayerView.battle.id` to distinguish successive engagements in one sector. Target references are captured before ship removal; history contains their identity after removal.
- TDD: two new player/Ancient destruction and public projection cases first failed on missing battle identity, then passed; complete battle/history batch: 30 tests green. Existing private-event exclusion tests remain green.
- Backend deployment is required to produce new journal metadata; old persisted entries remain valid because new fields are optional. No rules, random draws, or hidden state added.

## 2026-09-18 — Map context and endgame UI
Implemented persistent ambassador inspection, native Mac map pinch, Home/Play again and completed-save grouping, visual score cards, and shared-map exploration previews. Engine/Convex state unchanged; preview sectors and neutral fleets are immutable presentation copies. Review and release evidence: `coding_agents/second_dawn_map_endgame_release.md`.

## September 18 — Advanced research preview
Added typed, read-only advancedPopulationOpportunity selector and visual resource/star/count component. Research market, selected detail and owned cards share the same view-derived values. No engine commands or effects changed.

## September 18 — No draft-review acknowledgement
Removed revision comparison and review callback from the shared draft provider/context, so all planner consumers cease blocking on draft age. Notice only reports actual storage failure. Automatic save/restore and authoritative validation unchanged. Implementation and tests by mac_map_pinch, reviewed by supervisor.

## September 18 — Empire and combat identity delivery
Integrated public empire overview/navigation, saved presentation settings, contextual faction badges, original SVG faction ship families throughout screens, full-screen lazy Three.js combat effects, and actual-edge connection display. Explicit inspection mode prevents empire navigation from modifying saved builds. Fixed desktop inspector width and mobile roster direction found during real screenshot review. No engine, Convex schema, RNG or authoritative save changes.

### 2026-09-18 — Public combat estimator for strategic AI

Outcome: the AI evaluates duels with the right remaining weapon phase and distinguishes winning from an unresolved simulation.

Implemented in `shared/eclipse/aiSimulation.ts`: separate attacker/defender/unresolved probabilities; compatibility `winProbability` remains attacker victory; surviving fleet counts for both sides; explicit unsupported multi-owner/non-opponent results instead of invented alliances; matching ongoing battles never refire spent missiles; independent bounded simulation RNG; Antimatter Splitter applies only to red cannons; forced unarmed retreat follows public connectivity/ownership and accounts for destruction when no retreat exists. A proposed attack evaluates retreat routes from the destination sector, not its original staging sector. Optional cannon horizons stop at 0–32 rounds. No authoritative rules changed.

Decision log: voluntary retreats, tied initiative choice, and partial engagement firing order remain approximations. A current cannon fight restarts a cannon engagement using current damage; it does not restart its missile phase. Caller must model multi-owner battles as successive duels, not invert unresolved probability into defender success. No full state or authoritative RNG enters the estimator.

Follow-ups: calibrate mixed-fleet hit assignment and voluntary-retreat choices if benchmark errors justify further complexity. Parent owns search/runtime integration, overall lint/build and independent review.

## September 18, 2026 — bounded strategic AI worker
Implemented optional match/room difficulty and version, exclusive leased dispatcher → filtered query → scheduled search action → atomic commit mutation, watchdog/retry and cumulative action budgets. Timeout takeover shares the safe worker and keeps solo waiting semantics. Visual difficulty cards and actual thinking status integrated. No authoritative game rule changes. See `coding_agents/second_dawn_ai_runtime.md`.

## 2026-09-18 — Stronger fair AI fast policy and coordinated candidates
- Outcome: opponents prepare mobile fleets, execute combined attacks, invest in useful technology/refits, and avoid spending the next action into an unseen upkeep shortfall.
- Frozen the exact old controller and estimator in `shared/eclipse/aiLegacy.ts` and `aiLegacySimulation.ts` for comparisons. No authoritative rules or hidden-state access added.
- Added `generateAiCandidates(view)` with multi-ship convergence, repeated movement activations, affordable/funded batch construction, paired refits and power-source + weapon combinations; capacity, sequential pinning, finite ship supply, technology, funding ratio and legal install order reuse existing rules.
- Added optional `legalCommands(view, { perFamilyLimit })` for AI. Existing callers retain the old global 500 limit. AI preserves action families on crowded boards; regression first failed with Upgrade missing, then passed.
- Policy now values early Improved Hull, neighboring populated targets for Neutron Bombs, nonlinear marginal sector income/upkeep, weapon/computer synergy, meaningful defense and useful mobile shipbuilding beyond seven ships. Safe homes no longer accumulate useless starbases. An old scoring defect that preferred removing the last cannon for computers now has a failing-first regression.
- Updated queued population-return candidate filtering: a saved destination track can fill while earlier returns resolve; stale impossible choices are excluded.
- Validation: 23 tests across new strategic cases, existing legal AI cases and existing old random-baseline tournament pass. Scoped ESLint and eclipse TypeScript pass. Parent owns whole-slice lint/build/test gates.
- Held-out evidence: `coding_agents/second_dawn_ai_strategy_holdout.json`, 60 improved games plus 30 all-legacy references, all finish, seeds 901–906 cover all six faction families at every 2–6 seat count; details and limitations in `second_dawn_ai_strategy_validation.md`.
- Result & next steps: fast policy frozen after held-out run. Parent integrates bounded search and scheduled runtime. Search superiority is a separate gate; no claim that deeper search automatically beats this stronger fast policy.

- Follow-up correctness fix: funded continuation at zero influence now uses its already-spent action disc for upkeep preview, with bounded track indices. A failing-first regression caught the search rollout crash; 13 strategic tests now pass.

### 2026-09-19 — Retired roguelike source cleanup

Traced the current frontend/engine/backend/test dependency closure, removed 344 obsolete files in the initial manifest and retained only actually used root error-boundary/starfield utilities. Removed all retired gameplay endpoints while leaving schema tables/indexes byte-for-byte unchanged. Removed unused hex/zoom dependencies and standalone demo entries; rewrote README/deployment/backend entry docs. Full-repository lint is now clean without rule suppression; codegen/build and nine focused route/launcher/saved-game/error-boundary tests pass. Details and safe data distinction: `coding_agents/second_dawn_legacy_removal.md`. No commit/deploy.

## 2026-09-19 — Automatic exhausted-action completion
Implemented one central authoritative completion boundary for all six Second Dawn actions, shared by humans and AI. Existing queued decisions finish first; another seat's response cannot change the originating turn order. Optional free operations remain available before the final activation/later turns/upkeep where legal, without a new confirmation prompt. Final Move preview includes automatic betrayal and respects peaceful transit. Legacy exhausted saves retain explicit finish support. New24behavioral tests + focused36-test engine/preview batch pass; scoped ESLint and eclipse TypeScript pass. Full Second Dawn batch753pass/1newUIcapitalizationfailure, corrected by parent and10/10mobile rerun pass. Seeded2–6seat full matches finish validly. Details: `coding_agents/second_dawn_action_auto_advance.md`.

## September 19, 2026 — slot-first upgrade picker
Replaced the inline parts tray with an accessible slot-triggered dialog while preserving the existing BlueprintEditor API, saved drafts, validation, installation planning and final Apply. Mobile/landscape/enlarged text styles reviewed in Chromium/WebKit; Ancient inventory restrictions and outside-grid parts retained. Details: `coding_agents/second_dawn_upgrade_picker_release.md`.

## 2026-09-19 — Visual fleet intelligence

Replaced the plaintext ship inspector with grouped public blueprint cards and reusable read-only `BlueprintLoadout`, catalog part icons, faction identity, per-ship damage pips and visual attack-face comparisons. No commands, rules or private data interfaces changed. Six component tests and twelve integrated focused tests pass; repository lint and Vercel production build pass. Reviewed actual desktop/mobile/Ancient renders and preserved movement drafts across five browser viewports. See `coding_agents/second_dawn_visual_fleet_intelligence.md` and its screenshot directory for evidence and limitations.

### September 19 — Inline Research commitment
ResearchWorkspace now expands the chosen market card in place with a sibling exact-price purchase button, visible conversion/upkeep consequences and local rare/funding choices. Phone cards use full width. No Board API or game rule changes. Focus no longer scrolls the workspace to the top. Detailed evidence: `coding_agents/second_dawn_inline_research.md`.

### 2026-09-19 — Persistent choices and collapsible board details

Implemented `ChoiceWorkspace`, named desktop/mobile returns, stable same-ID mounted decision drafts, and collapsible desktop inspector in SecondDawnBoard. Preserved parent changes and authoritative rules. Fixed revision-induced reopening, hidden dice playback, choice casualty visibility, History access, and keyboard return focus. Added 13 focused passing tests; related browser/flow/hand-off/combat batches green; scoped lint and TypeScript pass. Three viewport browser captures reviewed and a discovered desktop exploration height defect fixed. Full evidence: `coding_agents/second_dawn_minimizable_choices.md`. No commit or deployment performed.

### 2026-09-19 — Restore intentional Follow AI presentation after inspector collapse

Reproduced final-suite regression, then restored one-time automatic opening for fresh public AI action entries on Galaxy. Manual close/inspection remains respected across revisions and different AI seats; explicit Follow does not open empty details during the human turn. Added four behavior regressions, retained existing Follow test. Final related batch 37/37; scoped ESLint/TypeScript pass; two-size browser walkthrough and screenshot review pass. Full follow-up recorded in `second_dawn_minimizable_choices.md`. Board implementation handed back; no commit/deploy.

### 2026-09-19 — Fair live-match initial starter

Audited why solo humans/room hosts always began: both creators assign host slot1, setup hardcoded slot1. Added opt-in `GameSetup.randomizeStartingPlayer`, enabled at both live Convex creation paths. Selection consumes the existing unbiased persisted RNG after component setup and changes only initial active/start seat plus RNG cursor. Documented random selection as digital adaptation of publisher's youngest-player convention; confirmed next-round first-pass +2/start behavior.

Fail-first new tests:8red/2green; final domain/setup35pass and live adapter62pass across14files. New integration cases execute initial AI in wait-for-me solo and multiplayer rooms. Existing host-first adapter scenarios pin setup seed32 only via test fixture module; randomized integration remains unmocked. Lint and TypeScript pass. Evidence `second_dawn_random_starter.md`; parent owns roster display/final gates. No commit/deployment or saved-game migration.

## Auto-pass unless attacked — September 19, 2026

Added optional persistent seat preference and paused-round status, revisioned authenticated settings command, pure bounded reaction skipping, hostile-entry/betrayal interruption, explicit resume, public log descriptions, and action-turn serial for independent timer/budget integration. TDD recorded 10 initial failures and separate explicit-resume failure. Adapter cross-device/ownership/duplicate/stale/handoff tests pass. Implementation preserves saved decisions, open actions, initial pass bonus and transaction rollback. See `coding_agents/second_dawn_auto_pass.md` for decisions and validation artifacts. No commit/deploy performed.

## 2026-09-19 — Auto-pass timer and AI budget boundaries

Independent review found same-owner turn wrap reused the old timer and could keep timeout AI active. Added optional persisted serial metadata to existing timer/job rows and used the engine action-turn serial in atomic reconciliation, recovery synchronization, timeout validation/completion and AI budget renewal. Five new Convex cases plus existing bounded batches pass (22 + 26 tests); full lint, TypeScript and Vercel build pass. See `coding_agents/second_dawn_auto_pass_scheduling.md`. No Board/engine changes in this slice; no commits or deployment.

## Automatic reputation — September 19, 2026

Fresh combat draws now settle the highest-value legal reputation holding without a manual choice, preserving at most one newly drawn tile, faction/ambassador capacity, finite supply and draw order. Added optional owner-only ReputationSummary and backwards-compatible omitted-kept resolution for saved decisions. Initial 19 behavior cases failed first; expanded 29 cases pass. Bounded engine/conservation/replay batch 95/95 and Convex restore/privacy/idempotency batch 13/13 pass. Details/source link: `coding_agents/second_dawn_auto_reputation.md`. Parent owns UI notice/legacy auto-submit and final release gates. No commit or deployment.

## Rift Cannon AI integration — 2026-09-19

Outcome: opponents and optional movement odds understand Rift damage/backfire while using only public information and independent randomness.

Implemented: public combat simulation groups firing ships by owner/class, rolls the entire volley, bypasses computers/shields for magenta dice, applies variable Rift damage and pooled friendly backfire using authoritative combat helpers. Historical baseline simulation delegates only Rift-containing views to this model. Main AI build/upgrade/fleet evaluation uses an expected-damage heuristic that includes backfire and grants no computer multiplier to Rift weapons. Hypothetical search worlds retain the public Rift expansion flag and corresponding finite technology/discovery inventory; absent flags preserve base inventories.

Tests first: new six-face simulation cases failed on faces 4, 5, 6 before simulation edits; the new heuristic test initially failed because its module did not exist. Added full-volley simultaneous backfire, destruction of a larger later-firing Rift ship, public expansion inventory/old-view regression, computer/shield independence and unchanged view assertions. Five focused files passed, 57 tests total: second_dawn_ai_simulation, second_dawn_ai_rift_value, second_dawn_ai_search, second_dawn_movement_battle_estimate, second_dawn_ai_strategy. Changed AI/test files pass ESLint. Supervisor owns full lint/build gate after integration.

Decision: Rift heuristic treats expected enemy damage (1) minus expected backfire (1/3), normalized against existing base-cannon heuristic (1/3), for value 2 without computer scaling. This is a bounded ranking heuristic; displayed odds continue using actual dice simulation. No hidden deck or authoritative RNG access added.

## 2026-09-20 — Independent settings AI/protocol slice

Files: `shared/eclipse/protocol.ts`, `ai.ts`, `aiWorld.ts`, `aiEvaluation.ts`, `aiMinorSpecies.ts`. Public views carry rule overrides and redact disabled public supplies/maps even if bookkeeping contains values. Opponent frozen Ancient Might contribution stays hidden with private reputation. AI world sampling resolves each feature, retains options, and reads chosen round limits; previews value actual faction trades and own private reputation. No new public boundary types or emitted effects. Audit: `coding_agents/custom_rules_audit.md`.

Result and next steps: focused tests green; parent owns shared integration and release gate.

Follow-up: `runningScore.ts` now independently includes exploration, Quantum Labs and artifact VP while hiding reputation-derived Ancient Might, including own eliminated snapshots. `publicInspection.ts` explains the hidden portion and uses a mode-neutral Variant bonuses title.

Final review: `factionPresentation.ts` accepts full RuleConfiguration while retaining historical RulesMode calls. `FactionPicker.tsx` accepts optional ruleOptions; `EmpireOverview.tsx` supplies full view. Reputation/exploration/faction explanations resolve independently. React best-practices checklist applied to these TSX updates (derived state only; no new hooks/effects). Parent addresses preset-reset and setup component-state synchronization findings.

## September 20 — Action confirmation notices
Implemented reusable ActionConfirmationNotice with session-only turn-scoped acknowledgments and existing GameDialog focus/escape behavior. BlueprintEditor, BuildPlanner, and MovementPlanner surface full valid plans with exact command confirmation and material consequences. No engine, API, or save-schema changes. Read-only rules review confirmed ordinary spent actions already advance and cautioned against treating Midas/Ragnarok continuation choices as automatic finish.
