## Plan Entry — Outpost Blueprint Panel Extraction

- Outcome: Refactor the Outpost blueprint grid into a dedicated component with reusable card rendering so the page stays readable while preserving the info toggle UX.

- Acceptance criteria:
  - `OutpostPage` renders a new `<BlueprintPanel>` (or similarly named) component instead of inline blueprint markup.
  - The panel owns a blueprint card subcomponent that handles the question-mark info toggle and Sell button.
  - Toggling info still reveals the part description and resets when switching frames.
  - Lint, targeted tests that import the new component, and build all pass.

- Risks & rollback:
  - Risk: Prop threading mistakes break blueprint info toggles. Mitigation: unit-style render via existing Outpost smoke tests.
  - Risk: Missing exports/import loops. Mitigation: co-locate the card inside the new component file.
  - Rollback: Revert the new component file and restore the previous inline markup in `OutpostPage`.

- Test list (must fail first):
  1. `outpost_dock_roster_smoke.spec.tsx` covers rendering the blueprint grid.
  2. `dock.spec.tsx` exercises Outpost interactions and ensures blueprint actions mount.
  3. `mp_blueprint_first_render.spec.tsx` ensures blueprint ids map correctly before Outpost mounts.

---

## Plan Entry — Public Multiplayer Lobby

- Outcome: Players can browse and join public multiplayer rooms; list shows host name, lives remaining, and starting ships; joining navigates to the room and removes it from the public list.

- Acceptance criteria:
  - The Multiplayer menu has an enabled "Public Matchmaking" option.
  - Public lobby view lists only rooms with `status = waiting` and `currentPlayers < maxPlayers` and `isPublic = true`.
  - Each list item displays: room name, host player name, host lives, starting ships, and player count (e.g., 1/2).
  - Clicking Join prompts for (or uses) player name, calls join mutation, navigates to the room lobby on success.
  - After join, the joined room is no longer returned by the public list API.
  - Polling/real-time updates reflect room disappearance when it fills.
  - Lint, tests, and build are green.

- Risks & rollback:
  - Risk: N+1 queries for host data. Mitigation: a single Convex query returns rooms with host info.
  - Risk: Race when two players join simultaneously. Mitigation: server maintains `currentPlayers` capacity check; UI shows error toast if full.
  - Rollback: Revert the UI page and the new Convex query; existing private-room flow remains unaffected.

- Test list (fail first):
  1. API: `getPublicRoomsDetailed` returns only waiting/public/not-full rooms and includes `hostName`, `hostLives`, `startingShips` (must fail first).
  2. Selector/UI: Renders host name, lives, starting ships for a mocked room list (must fail first).
  3. Join flow: Clicking Join calls `joinRoom(roomCode, name)` and invokes `onRoomJoined(roomId)` on success (must fail first).
  4. Integration (light): When a room reaches capacity, it no longer appears in the public list (mock Convex client).

---

### Implementation Steps
1) Add server query for public rooms + host
2) Create client hook for public lobby
3) Implement Public Lobby UI
4) Wire join flow + navigation
5) Add tests and docs

### Decision Log
- Chose a new Convex query `rooms.getPublicRoomsDetailed` to avoid client-side N+1 queries and to include host metadata in the payload.
- Kept data model unchanged (derive host fields from `players` where `isHost = true`).

### Follow-ups
- Add pagination or time-based pruning for stale rooms.
- Consider an optional Elo/MMR field for future matching.

## Plan Entry — Opponent Fleet Intel (Last-Faced)

- Outcome: Multiplayer-only. Reuse the existing `CombatPlanModal` to show the opponent’s fleet exactly as last faced in combat; for the very first shop, show their default starting configuration and starting ship count. Never update live during shop.

-- Acceptance criteria:
  - Outpost shows an “Enemy Intel” view in multiplayer using the same modal component (`CombatPlanModal`).
  - In multiplayer, the sector list is hidden; only opponent intel is shown.
  - Round 0/pre-combat shows defaults (frame(s) + starting ship count).
  - After each combat, the panel shows the fleet snapshot faced in that combat.
  - Opponent shop changes do not affect the panel until next combat starts.
  - Switching opponents resets to that opponent’s defaults.
  - Lint, tests, and build are green.

- Risks & rollback:
  - Risk: off-by-one round mapping. Mitigation: capture at `combat_start` and unit-test transitions.
  - Risk: stale cache after room switch. Mitigation: clear cache on roomId change.
  - Rollback: feature-flag the panel and selectors; hide the panel to revert.

- Test list (must fail first):
  1) Selector returns defaults pre-combat with correct count/frame.
  2) Selector returns stored last-combat snapshot even if `playerStates.snapshot` changes during shop.
  3) Integration: simulate `combat_start` → store snapshot → back to shop → panel renders stored fleet unchanged.
  4) Opponent swap resets to defaults for the new opponent.
  5) Fake transport path populates cache on `combat_start`.

---

### Implementation Steps
1) Add `LastSeenOpponent` client cache and types
2) Build `selectOpponentIntel` selector + tests
3) Hook snapshot capture on `combat_start`
4) Implement `OpponentIntelPanel` and wire to Outpost
5) Edge-case tests and docs update

### Decision Log
- Use client-side cache keyed by opponent playerId to avoid live updates during shop.
- Capture snapshot at `combat_start` rather than using shop-time snapshots.
- Seed pre-combat defaults via `seedFleetFromBlueprints(..., startingShips)`.

### Follow-ups
- Consider small-history view (last 3 rounds) with tabs.
- Optional toggle to show compact summary vs. ship grid.

## Plan Entry — Help Menu Rules/Tech Modals

- Outcome: Players can open the Rules and Tech List modals from the bottom-right help buttons on all screens; Rules modal layers above floating UI and allows text selection.

- Acceptance criteria:
  - Clicking the “❓ Rules” button opens the Rules modal (“How to Play”).
  - Clicking the “🔬 Tech” button opens the Tech List modal.
  - Both modals can be dismissed via their internal buttons and do not interfere with each other.
  - The Rules modal overlays above floating help buttons (no overlap or click-through issues).
  - Lint, targeted tests, and build remain green.

- Risks & rollback:
  - Risk: Prop API change on `GameShell` breaks call sites. Mitigation: update `GameRoot` at the same time; changes are localized.
  - Rollback: Revert the `GameShell`/`GameRoot` prop changes and the test file.

- Test list (must fail first):
  1) UI: Clicking “❓ Rules” opens the Rules modal (help_menu_modals.spec.tsx).
  2) UI: Clicking “🔬 Tech” opens the Tech List modal (same test file).

---

### Implementation Steps
- Add `onOpenRules` and `onOpenTechs` props to `GameShell`.
- Wire them in `GameRoot` to `setShowRules(true)` and `setShowTechs(true)`.
- Update help buttons to call the open handlers (not the close handlers).
- Bump `RulesModal` z-index from `z-40` to `z-50` to match other modals.
- Add focused test: `src/__tests__/help_menu_modals.spec.tsx`.

### Decision Log
- Standardized modal layering at `z-50` to prevent overlap with floating help UI.
- Kept existing close handlers for internal modal buttons; only the external help triggers were incorrect.

### Follow-ups
- Consider adding backdrop click-to-close behavior for consistency across modals.

## Plan Entry — Homepage UI Redesign (Space Mobile Menu)

- Outcome: A mobile-first home screen with a single Launch CTA and a Battle Log modal; remove the game title and Single Player/Multiplayer headers; elevate a space-themed visual style.

- Acceptance criteria:
  - No game title or "Single Player / Multiplayer" headers on the home screen.
  - Centered `Launch` opens a bottom sheet with `Solo | Versus` tabs; Versus disabled if `!VITE_CONVEX_URL`.
  - `Continue` appears when a save exists, calls `onContinue`.
  - Faction selection available via Hangar card and inside Launch sheet; stays in sync.
  - Difficulty chips show counts and gating: Medium needs Easy win; Hard needs Medium win.
  - Battle Log opens in a modal from the top bar; shows entries from `progress.log` or an empty state.
  - Touch targets ≥ 44px; keyboard focus visible and trapped in modals; lint/tests/build green.

- Risks & rollback:
  - Risk: Layout change breaks tests; Mitigation: update targeted UI tests first.
  - Risk: Performance of background; Mitigation: lightweight CSS animation, reduced-motion path.
  - Rollback: Keep old structure behind a quick revert; props remain unchanged.

- Test list (must fail first):
  1) Start screen renders without title/SP-MP headers.
  2) `Launch` opens a sheet with `Solo | Versus` (focus trapped).
  3) Versus disabled when no server; enabled otherwise.
  4) `Continue` shows only with save; calls `onContinue`.
  5) Difficulty gating + counts.
  6) Faction selection sync (Hangar ↔ Launch sheet).
  7) Battle Log modal open/close + empty and non-empty states.

---

### Implementation Steps
1) Replace header area with top bar + primary CTAs
2) Add Launch Sheet (Solo), wire `onNewRun`
3) Add Versus tab, gate by env + `onMultiplayer`
4) Add Battle Log modal
5) Add starfield + polish + a11y
6) Add tests and update snapshots where appropriate

### Decision Log
- Preserve StartPage props; move complexity into new child components.
- Use a single modal component with Solo/Versus tabs for clarity.

### Follow-ups
- Profile avatar stub on top bar; richer Battle Log entries with metadata.

## Plan Entry — MP/SP Reroll Unification

- Outcome: Reroll behavior and pricing are identical in Single Player and Multiplayer. MP no longer shows/uses faction base (e.g., Industrialists 0¢) for the button label or enable/disable logic; instead it uses the authoritative rerollCost from state (server-synced in MP). Engine uses a single code path for reroll/research cost deltas.

- Acceptance criteria:
  - MP (Industrialists): First shop shows "Reroll (3¢)"; pressing Reroll reduces credits by 3 and increases cost to 6, 9, …; button disables when credits < current cost.
  - MP (Warmongers): First shop shows "Reroll (8¢)"; increments by 4 each action; behaviour matches SP.
  - SP unchanged; Research also increases reroll cost identically in MP and SP.
  - No UI path reads economy.rerollBase for the Reroll button cost or disable check.
  - Lint, targeted tests, and build are green.

- Risks & rollback:
  - Risk: UI regressions in MP display. Rollback: revert `useOutpostPageProps` change to previous behavior.
  - Risk: Engine refactor touches shop actions. Rollback: keep `doRerollAction` and `researchAction` as shims delegating to new unified functions.

- Test list (must fail first):
  1) UI (MP Industrialists): Outpost renders "Reroll (3¢)" when `playerState.economy.rerollBase=0` and `playerState.rerollCost=3`.
  2) UI (MP Industrialists): Clicking Reroll with credits ≥ 3 calls handler, and follow-up render shows cost 6 and credits reduced by 3 (simulate via handler + state update).
  3) Engine: `applyOutpostCommand({ type:'reroll' })` increments cost by 3 when econ mods `{ credits:0.75 }` provided; by 4 when `{ credits:1 }`.
  4) Guard: `useOutpostPageProps` does not override `rerollCost` with `economy.rerollBase` in MP.

---

### Implementation Steps
1) UI fix: remove MP-specific override in `src/hooks/useOutpostPageProps.ts` that set `displayReroll = economy.rerollBase`.
2) Engine unification: in `src/engine/commands.ts`, always use the parameterized path for costs by calling the `*WithMods` variants with `economyMods || getEconomyModifiers()`; or introduce a single `rerollAction(resources, rr, research, mods)` and `researchAction(track, resources, research, mods)` and route both SP/MP through them.
3) Tests: add targeted unit tests for `applyOutpostCommand` deltas and a lightweight UI test for the MP Industrialists cost label + button disable logic.
4) Hygiene: run `npm run lint && npm run test:run && npm run build`.

### Decision Log
- UI should always show authoritative `rerollCost` (server-synced in MP), not `economy.rerollBase`.
- Favor a single parameterized engine path; keep legacy exports as shims to minimize churn.

### Follow-ups
- Consider surfacing both "current cost" and "base (for tooltips only)" in VM if design wants to explain faction perks.

## Plan Entry — Combat Firing Bounce Cue

- Outcome: During combat, the ship currently firing performs a small forward bounce in the direction of fire (player: up, enemy: down) synchronized with the shot SFX. This replaces the pulsing/glowing outline as the primary focus cue.

- Acceptance criteria:
  - Fleet rows still render unchanged otherwise (grouping/stacking preserved).
  - When `activeIdx` points at a ship in `FleetRow`, that ship’s visual wrapper gets a bounce class (`fire-bounce-up` for P, `fire-bounce-down` for E) and animates once or twice during that turn.
  - Reduced‑motion respected: no bounce when OS setting prefers reduced motion.
  - Outpost/Modals do not show bounce (they pass `active={false}`).
  - Lint/build stay green; only targeted tests run.

- Risks & rollback:
  - Risk: Added motion could be distracting. Mitigation: small amplitude, short duration, reduced‑motion guard.
  - Rollback: Remove `fire-bounce-*` classes and keep existing static glow only.

- Test list (must fail first):
  1) `combat_bounce.spec.tsx`: Player side applies `fire-bounce-up` only to the active ship.
  2) `combat_bounce.spec.tsx`: Enemy side applies `fire-bounce-down` only to the active ship.
  3) (Optional) Smoke: existing `frameSlots` and `combat_intro` tests stay green.

---

### Implementation Steps
1) Add CSS keyframes/classes in `src/index.css` with reduced‑motion guard.
2) Wire classes in `CompactShip` based on `active` and `side`.
3) Remove pulsing outline from `ShipFrameSlots` to avoid duel cues.
4) Add tests `src/__tests__/combat_bounce.spec.tsx`.

### Decision Log
- Chose a vertical translateY bounce to communicate “forward” across rows without changing layout.
- Bound the cue to FleetRow’s `activeIdx` (already synced with shot SFX timing via `useCombatLoop`).

### Follow-ups
- Consider a muzzle flash or projectile trail in a future pass for extra clarity.

## Plan Entry — Tutorial Onboarding (Guided Run)

- Outcome: First-time players complete a short, skippable tutorial that teaches core systems (combat basics, outpost blueprints, buying parts, dock capacity, tech tracks, Enemy Intel, and frame upgrades). Completion is remembered.

- Acceptance criteria:
  - Tutorial auto-starts on first run (or via StartPage button) and can be skipped or reset from Settings.
  - Overlays appear in a fixed order and advance when the related action is performed (buy part, expand docks, research once, view Enemy Intel, etc.).
  - Starting state (tutorial only): single Cruiser with Spike Launcher + Source/Drive; curated shop appears at key steps.
  - No engine behavior changes; only UI overlays and small event taps in handlers.
  - Disabled in multiplayer.
  - Lint, targeted tests, and build stay green.

- Risks & rollback:
  - Risk: Players get stuck on a gated step due to resources. Mitigation: stipend on entry and “Skip step”.
  - Risk: Anchors break after UI changes. Mitigation: use `data-tutorial` attributes with tests.
  - Rollback: feature-flag the tutorial; overlays can be turned off.

- Test list (must fail first):
  1) `tutorial_state.spec`: `event('bought-part')` and `event('post-combat')` advance steps.
  2) `tutorial_shop.spec`: curated shop seeding applied on step entry.
  3) `outpost_handlers.spec`: buy/upgrade/dock/research call tutorial events.
  4) `newrun_seed.spec`: tutorial start seeds Cruiser + Spike starting config.
  5) `tutorial_overlay.spec` (smoke): overlay anchors render for `shop-grid` and `expand-dock` steps.

---

### Implementation Steps
1) Add `src/tutorial/state.ts` + `script.ts`
2) Add `CoachmarkOverlay` component and anchor attrs
3) Tap events in `useRunManagement`, `useOutpostHandlers`, `useRunLifecycle`
4) Seed shop per step; add stipend helper
5) Add tests and Settings toggle/Reset

### Decision Log
- Chose overlay-first approach to avoid engine changes; only event taps and curated-shop injection on outpost return.
- Starting with a Cruiser + Spike to support the requested “hits on 6” intro while keeping a valid, powered ship.

### Follow-ups
- Tooltips for Enemy Intel minis and a short glossary modal.
## Plan Entry — Outpost Redesign (Phase 0b)

- Outcome: A cleaner Outpost page that prioritizes decisions over data. Replace the card grid of ships with a compact Dock roster, make the Class Blueprint the single edit surface, convert long research text to a tech bottom sheet, and keep a single clear CTA.

- Acceptance criteria:
  - Dock roster shows one token per ship group with count badges and power status; tapping selects the group and opens the blueprint panel below.
  - No individual “ship cards” grid is shown; blueprint is the only place to add/sell parts.
  - Reroll button remains visible with cost, and increases label after research/reroll.
  - Research area shows three track chips + a “Tech” bottom sheet with full details; no persistent multi‑sentence paragraphs on the main view.
  - Start Combat bar unchanged functionally; Restart/Resign unchanged for this slice.
  - Tutorial anchors updated (ship-card → dock-roster, plus tech open/close).
  - Targeted Outpost tests green; lint/build green.

- Risks & rollback:
  - Risk: Tutorial or tests reference removed anchors. Mitigation: update `src/tutorial/script.ts` and keep IDs stable via `data-tutorial`.
  - Risk: Accessibility regressions from new tokens. Mitigation: 44px targets, ARIA labels carried over.
  - Rollback: feature branch; revert OutpostPage changes to prior layout.

- Test list (fail first where changed):
  1) `dock.spec.tsx` updated to not depend on ship cards; still validates build/upgrade/dock visuals.
  2) `outpost_economy_labels_isolated.spec.tsx` stays green (discount labels).
  3) New smoke: rendering Outpost with Dock roster exposes `data-tutorial="dock-roster"` and blueprint header.

---

### Implementation Steps
1) Add Dock roster tokens section; remove ship-card grid.
2) Keep build/upgrade/dock controls; maintain accessible names/labels used by tests.
3) Add Tech bottom sheet (open/close buttons with `data-tutorial` hooks).
4) Update tutorial script anchors and copy for the ship selection step.
5) Run targeted tests and lint/build.

### Decision Log
- Chose a single blueprint edit surface to reduce redundancy.
- Bottom sheet for tech details preserves context and reduces on‑page text.

### Follow-ups
- Overflow/pause menu for Restart/Resign (separate slice).
- Resource HUD compaction (separate slice).

## Plan Entry — Outpost No-Slot Price Display

- Outcome: Disabled shop buttons show the part cost even when no slot is available.
- Acceptance criteria:
  - ItemCard renders `No Slot (X¢)` when slotOk is false.
  - A test fails first verifying price included in disabled button.
  - Lint, targeted test, and build stay green.

- Risks & rollback:
  - Risk: longer button label may wrap. Mitigation: compact card still fits.
  - Rollback: revert ItemCard label change.

- Test list (must fail first):
  1) `itemcard_no_slot_price.spec.tsx` ensures price is visible alongside `No Slot`.
## Plan Entry — Tutorial Enabled by Default

- Outcome: First-time players see the tutorial enabled automatically.

- Acceptance criteria:
  - With no existing tutorial state in localStorage, `isEnabled()` returns true.
  - Settings modal shows the tutorial toggle as "On" on first visit.
  - Lint, targeted tests, and build stay green.

- Risks & rollback:
  - Risk: Corrupt or missing localStorage could cause unexpected tutorial prompts for returning players.
  - Rollback: Revert the default state to disabled.

- Test list (must fail first):
  1) `tutorial_state.spec`: `isEnabled()` returns true by default (must fail first).
# 2026-09-06 — Resume local demo

- Outcome: local solo play and Eclipse board previews load while retaining the configured Convex connection.
- Acceptance: configured provider remains enabled; isolated renders without a provider do not crash; demos render and controls work; local Vite server remains available.
- Tests first: reproduce startup regression, add entrypoint and provider availability coverage, repair browser API test setup and reproduce variable galaxy module failure.
- Risks & rollback: preserve saves and game rules; revert this slice to undo startup gating. No backend deployment or seeding.
- Decision log: reuse the existing feature/local-playtest branch; targeted single-worker tests only; record existing lint/build failures separately. Delegate variable demo repair while supervisor handles startup and verification.
- Follow-ups: verify local URLs and document commands and any remaining limitations.

## 2026-09-07 — Full Second Dawn
Outcome: complete base game with authoritative guest saves and fair AI. Acceptance criteria, failing-first test list, risks/rollback, decisions and follow-ups: `coding_agents/second_dawn_implementation.md`. Preserve pre-existing local-playtest changes. Fresh branch `feature/second-dawn-full-game`. Initial parallel work: verified catalog and interactive fixture prototype; supervisor handles engine/persistence and gates.

## 2026-09-07 — Continue complete Second Dawn
Outcome: carry the existing foundation through a real setup-to-scoring human/AI game. Acceptance remains the full original plan, not a prototype checkpoint. Parallel bounded work: sector faces, ship/blueprint catalog, and Convex match transactions. Root owns setup, dispatcher, round/decision state and integration. Failing-first tests: deterministic setup/conservation, real six-action state transitions, durable choices, exact transactions and seeded full-match completion. Preserve all existing work; remain on feature/second-dawn-full-game. Risks: source-backed component transcription and compatibility of the provisional contracts. Rollback: isolated new full-game modules/tables; legacy saved data unchanged.

## Continuation decision log — complete game integration

Outcome: the default desktop entry now creates and resumes a full Second Dawn match against fair AI; legacy roguelike saves remain separate.

Implemented the action dispatcher, persisted choices, complete combat/round flow, live Convex saves and AI scheduling. Independent rules review and seeded full-game conservation/replay tests guide corrections. Build passes; the inherited lint baseline remains 88 errors/12 warnings. Cloud dev CLI authentication was unavailable, so real integration uses an isolated anonymous local Convex backend, preserving existing environment files and deployment data.

Acceptance still requires resolving actual rendered UI review findings and completing browser workflow/scoring evidence. Prototype screenshots are not counted as proof of integrated gameplay. Rollback remains isolated new modules/tables and the default route; no destructive schema migration was performed.

## Delivery result

Full local implementation and verification are recorded in `coding_agents/second_dawn_status.md`. All four implementation checkpoints progressed through integrated gameplay and reviewed visual corrections. Local play starts with `npm run second-dawn:local`; complete server restart restores guest saves and pending decisions. Reviewed baselines are protected from automatic updates. Cloud authentication and human playtesting are separate external follow-ups, not claimed as performed.

## 2026-09-07 — Exploration, population, and discovery choices

Outcome: players can judge a sector placement, read population spaces visually, and understand a discovery reward before accepting it.

Acceptance: actual neighboring tiles and rotating wormholes show each connection; placement legality matches the persisted decision; population cubes/open slots and advanced stars replace repeated status prose; discovery shows its catalog name and effect beside the 2 VP alternative. The live preview uses the same components and engine states as real matches.

Tests first: exploration rotation/legality/submission and disconnected controls (red then green); planet accessibility and absence of repeated status prose; discovery effects and legal choices. Validate at all three desktop sizes, targeted memory-bounded game tests, changed-code lint and production build. Keep inherited lint debt separate.

Decision log: reuse public rule helpers and persisted options; no backend schema or engine rule changes. Capture exploration/discovery positions from the existing deterministic engine playthrough. Delegate planet rendering and discovery component while root integrates and verifies exploration, browser workflows, and deployment.

Risks & rollback: choices must retain their original persisted IDs and legality. Revert only these view components to roll back; guest saves remain compatible. Follow-up: publish verified changes to the existing Vercel public preview using the Convex development environment.

## 2026-09-07 — Game stages, Ancient encounters, and visual part installation

Outcome: the public preview visibly demonstrates opening, developed and final-round galaxies, active combat and Ancient encounters; installing a discovered ship part shows the blueprint and replacement before confirmation.

Acceptance: obvious stage shortcuts and direct links open real engine fixtures; Ancient examples include an actual drawn defended sector and surviving neutral fleet/combat; battle fleets show recognizable ships and public stats; part installation selects an actual legal blueprint/slot, previews replacement and resulting stats, and retains store/offline behavior. Existing live and preview views stay unified.

Tests first: direct preview link/stage shortcuts; battle public stats; visual part installation replacement/legality. Review actual desktop screenshots and run targeted tests, changed lint, production build, public deployment smoke. Root owns stage navigation/integration, effects agent captures exact engine fixtures then implements part placement, board agent implements compact fleet battle overview. Risks: preview shortcuts must never modify guest saves and part placement must submit authoritative candidates. Rollback limited to components/fixtures; no schema changes.

## 2026-09-07 — Owned research, history, and understandable action economy

Outcome: players see their researched tiles on Research, can review fast AI actions at their own pace, and understand current/next-action round-end costs before committing.

Acceptance: owned technologies grouped by actual tracks with inspectable effects; a single visual science price per market tile plus science budget; a scrollable saved public history that survives refresh and loads older entries without exposing private reputation/discoveries; header shows actual upkeep and next-disc forecast, action drafts show the income/cash/upkeep equation and immediate costs. The screenshot's 2 cash +3 income −1 bill leaves4; next disc makesbill2 andleaves3, which the UI must explain correctly.

TDD: new owned-tech/cost components, history projection/ownership/pagination, history panel, upkeep summary and reconnect cache tests fail first. Reuse pure command preview and authoritative persisted journal. Root handles UI integration/economy; effects agent handles research components/review; board agent handles public journal query, exact fixture histories and cache recovery. Risks: journal privacy, legacy rows lackinground, and live query gaps during fast AI turns. Rollback: optionalround metadata and additive query are backward-compatible; UI can revert independently, preserve saves. Deploy backend explicitly to requested development environment before shipping the querying frontend.

### Continued player feedback — economy, quick turns, and direct board actions
Outcome: players see owned research and AI history, understand their next action's upkeep, and purchase, build, and move through visual decisions.
Acceptance: single science price with icon; owned track tiles inspectable; persistent public history; visual trades; atomic warned research/build conversions; one-click ordinary End action/Pass/Finish upkeep; subdued sector IDs and stronger owner fills; visual sector Build order with quantities; fleet selection followed by highlighted Move destination.
Tests must fail first: funded UI requires explicit atomic confirmation, source mix changes do not submit, illegal funded candidates excluded; quick turn one command and betrayal warning retained; visual build quantities/conservation/affordability; movement range/pinning/path/group limits. Relevant bounded suite, changed-file lint, production build, browser workflows, reviewed screenshots at three desktop sizes follow.
Risks/rollback: new wrapper command is additive to versioned tables; backend deploy precedes UI. All drafts remain local until commit; no existing saves deleted. AI still uses the same authoritative commands, without added budget or hidden information.
Decision log: funded candidates derive affordable ceilings from the public view and pass ordinary action legality before deriving actual exact conversions. All conversion plus purchase commands validate and commit atomically. User requested Build popup and direct galaxy Move controls while earlier refinements were being verified; included in this release.

Result: all acceptance criteria for this feedback release implemented and published to the existing live/preview alias. Final one-worker Second Dawn batch: 353/353 tests, 69/69 files. Changed-code lint and production build pass; repository baseline remains 88 errors/12 warnings. Explicitly reviewed v4 baseline 21/21 matches. Eleven actual-engine workflows pass; live converted build, atomic research preview, public human/AI history, save/resume, offline/reconnect, pending exploration recovery, and one-click End action pass. No follow-ups remain for this feedback slice. Human playtest evidence remains the user's feedback, separately from agent browser review.

## 2026-09-07 — Visual action-choice assessment (plan only)

Outcome: remove native selects as the primary UI for every consequential action and persisted decision, using the visual language already established for sectors, ships, technology, resources, and population.

Scope and acceptance: audited all action-related selects; prioritized Influence, Colonize, combat allocation/retreat, blueprint parts, diplomacy, and persisted sector/resource choices. The complete staged plan, interaction contracts, tests, screenshot review, risks, and exclusions are in `coding_agents/second_dawn_visual_action_choices_plan.md`. No game code, commands, Convex schema, saves, or deployed behavior changed for this assessment.
### 2026-09-07 — Visual actions followed by multiplayer

Outcome: players choose actions through the actual board/components, then invite friends through shareable rooms with visual faction effects and temporary AI timeout control.

Acceptance: visual action plan published first; 2–6 room seats, ready/host start, guest ownership/privacy, persistent 30-second–48-hour clock, same-owner deadline preservation, and full-game completion retained. Plans: `second_dawn_visual_action_choices_plan.md`, `second_dawn_multiplayer_plan.md`.

Risk/rollback: additive room/timer tables; legacy and solo snapshots preserved. Independent agents reviewed rendered controls, faction details, and multiplayer behavior. Timeout/public history metadata never reveals private tiles.

Tests: failing behavioral tests preceded the visual planners, economy decisions, room contracts, ownership, and timer changes. Final bounded suite: 398 tests across 79 files; scoped lint/TypeScript/build green. Existing repository lint: 88 errors, 12 warnings.

## 2026-09-08 — Recoverable players and solo rooms result
Outcome delivered: one-human rooms wait indefinitely; persistent profiles restore original guest saves and multiplayer ownership across devices. Plan/release: `coding_agents/second_dawn_player_identity_plan.md`, `coding_agents/second_dawn_player_identity_release.md`. Additive schema rollback must retain recovered-session resolver for already-issued device credentials. TDD, 427 bounded tests, scoped lint, TypeScript/build, deployed three-browser recovery and multiplayer timeout checks passed. Repository lint debt remains 88 errors/12 warnings. Vercel Ready; approved development Convex backend retained.

## 2026-09-08 — False offline browser flag
Outcome: working Convex connections enable play even with navigator.onLine=false; actual socket loss still disables commands. Failing unit and actual browser reproduction recorded before fix. Plan, source rationale, rollback and verification: `coding_agents/second_dawn_false_offline_fix.md`. Frontend only; saved credentials/state unchanged. Relevant 11 tests, lint and build passed. Vercel rollout underway.

## Fleet readability and AI map activity
Outcome: distinguish each ship class and faction at a glance while seeing where AI activity occurred.
Acceptance: map cards group owner/type and show matching hull + ×count; civilization emblems distinguish all six colors and their Terran variants; crowded stacks expose additional groups through one sector selection; activity highlights/move trails respect reduced motion. Inspector retains every group and damage facts.
Risks & rollback: map density at fit zoom; constrain cards to four slots and show explicit overflow. Changes are presentation-only and reversible.
Tests (fail first): separate classes/counts, bounded overflow, faction symbol parity, optional activity pulse/path, inspector owner symbols.

## 2026-09-08 — Fleet cards, AI action following and movement shortcut
Outcome implemented: per-class fleet cards and shared faction emblems; paced AI with visible public action interfaces, map feedback and explicit human return; two-sector speed-one movement using two activations in one confirmation. Plan `second_dawn_fleet_ai_presentation_plan.md`; release/decisions `second_dawn_fleet_ai_release.md`. 463 bounded tests pass, changed lint/typecheck/build clean, inherited lint 88 errors/12 warnings unchanged. Independent browser reviews found and fixed nested SVG hit areas, effect lifetime on status refresh, offscreen AI feedback via Watch AI, and short-screen blueprint/combat visibility. Development backend updated; Vercel rollout and live walkthrough finishing.

## Portrait-first mobile implementation
Outcome: play the complete shared game upright, with resumable action drafts, touch galaxy controls and cross-device catch-up.
Acceptance criteria and decisions: see `coding_agents/second_dawn_mobile_plan.md`. Root coordinates shell, touch-map and draft agents; root owns authenticated activity markers, foreground recovery and launcher integration. Branch `feature/second-dawn-mobile` inherited existing full-game work; preserve all prior dirty/untracked files and data.
Tests failing first: seen-marker Convex tests (missing metadata), activity recap tests (missing hook/component), foreground recovery tests (missing hook). These now pass locally. Risks/rollback: optional metadata outside GameState; compact UI isolated; no migration/destructive reset. Physical Android/iPhone evidence remains separate from emulated browser review.

## 2026-09-18 — Commit approved work and restore main-only releases
- Outcome: all approved Second Dawn work is committed on main; GitHub pushes to main deploy the existing Vercel site.
- Acceptance: clean working tree, remote main equals local main, production deployment identifies the new main commit, non-main automatic deployments disabled, existing development Convex endpoint retained.
- Risks/rollback: preserve current deployment until new build is ready; use Vercel rollback if verification fails. Do not commit local credentials or transient runtime logs.
- Validation: bounded Second Dawn tests, full build, lint debt comparison, secret/artifact audit, Git and Vercel deployment metadata.
- Decision: no gameplay changes. Configure deploymentEnabled for main only and a project-level non-main ignored-build guard; align dashboard build settings with the already deployed vercel.json.

## 2026-09-18 — Consolidated Second Dawn UX iteration (plan only)

- Outcome: players choose, preview, commit, and see results without panel hunting, unnecessary planner reopenings, or lost drafts.
- Canonical plan: [Second Dawn UX iteration](../second_dawn_ux_iteration_plan.md). Covers research, movement, build-first multi-sector deployment, functional ship fitting, affordable actions, tactile dice allocation, opponent/neutral inspection, colonization, exploration/rewards, influence/diplomacy, funding, turn boundaries, scoring, and return recaps.
- Acceptance criteria: complete system contracts, delivery slices P0–P5, source seams, fail-first behavioral tests, browser/human tasks, accessibility, deterministic combat, public-information boundaries, rollback, and a progress ledger are in that one plan.
- Decision: the user's build-first correction supersedes the earlier sector-first proposal. Choose pieces, deploy them to legal sectors with a persistent tray/map, then commit once.
- Risks & rollback: preserve rules, saves, atomic commands, unique-part conservation, and draft/reconnect behavior; presentation changes should be independently reversible. Documentation-only change can be reverted normally.
- Tests: documentation/path/content checks for this commit only; no gameplay implementation or application-test claim. Required fail-first tests for future implementation are enumerated in the plan.
- Status: all implementation slices not started by this plan. Reviewed source baseline ca764d429e4fe2ead0bba37eda6bf5fb83bb6879. Future agents should audit current main, start P0, and update the ledger with remote commit SHAs and evidence.

## 2026-09-18 — Standalone UX brief and player-experience acceptance

- Outcome: a self-contained plan centered on fun, tactile, delightful play, accessible option discovery, and rewarding strategic mastery.
- Plan: [Second Dawn UX](../second_dawn_ux_iteration_plan.md). Its product goal, layered information model, system experience statements, delivery criteria, and newcomer/expert playtests can be understood without earlier conversation or proposals.
- Decisions: explain available options and consequences while preserving strategic tradeoffs; include tactile feedback in each functional slice. Assess discovery, comprehension, agency, satisfaction, pace, and strategic expression alongside click/navigation diagnostics.
- Acceptance: all 13 systems and build-first deployment remain covered; obsolete proposal comparisons are removed from the canonical brief; the root agent entry point states the product goal.
- Validation: documentation content, coverage, retained engine constraints, and changed-file checks. No application code or implementation status changed; no application tests claimed.
- Risks/rollback: documentation-only; normal revert restores the preceding brief. Future agents retain the shared rules, privacy, deterministic RNG, save compatibility, and draft/recovery contracts.


## 2026-09-18 — First playable UX implementation slice

- Outcome: local research purchase, understandable affordable-action capacity, and continuous movement planning on `feature/second-dawn-ux-foundations`.
- Scope/acceptance: canonical [UX plan](../second_dawn_ux_iteration_plan.md) P0 code audit and bounded P1 implementation. Sol handled research, Terra handled economy, another Sol performed independent review; supervisor handled movement and integration.
- Evidence: [execution record](../ux_p1_execution.md). Fail-first tests drove research, affordability, and accepted/rejected movement lifecycle. Final 84 targeted tests across 15 suites, full build, changed-file lint and diff checks pass. Repository lint retains exactly its baseline 100 findings.
- Risks/rollback: no engine, privacy, RNG, saved-game schema or deployment changes. Revert frontend slice normally. Wider draft/inspection lifecycle and human experiential acceptance remain open.
- Handoff: do browser/device/newcomer/expert review, then continue funding/turn-label consistency and P2 build-first deployment/multi-route movement. Browser localhost access was blocked; no visual or human result claimed.

## 2026-09-18 — Cross-device update and Vercel diagnosis
- Outcome: fast-forward local main and identify deployment delays using direct remote evidence.
- Acceptance: current remote code installed; exact live SHA confirmed; distinguish Git triggers, build waits, failures and status collisions; preserve production configuration.
- Risk/rollback: read-only remote investigation; no redeploy, integration disconnect, paid settings change or gameplay edits.
- Tests: existing deployment configuration/release guard tests, bounded Second Dawn suite, lint/build, live browser smoke. No new game behavior implemented. Existing failing fleet-inspection tests and TS1261 build error reproduced a case-insensitive import collision; rename the helper module without changing behavior.
- Findings and follow-ups: see vercel_deployment_diagnosis_2026-09-18.md. Duplicate workspace status collision confirmed; substantial pre-build delay confirmed; official Vercel trigger and initialization incidents overlap the delayed deployments and are now resolved.

## 2026-09-18 — Direct combat and visible ship losses
- Outcome: combat opens at the firing decision, with one-click rolling, an explicit retreat destination choice, and recognizable destroyed-ship feedback that survives the final kill.
- Acceptance: no Fight/Confirm staging before a roll; direct actions obey offline/busy/forced-retreat guards; legal retreat selection remains deliberate; public casualty art/identity/HP visible with reduced-motion support; matching fixtures and saved games use the same components. Push main and inspect all raw GitHub statuses to test the reinstalled Vercel app.
- Tests first: roll/retreat command serialization and guards, combat controls before fleet details, volley retention across non-volley history and battle end, destroyed-target metadata and rendered casualty cards. Bounded suite, typecheck/build, changed-code lint, desktop/mobile browser checks.
- Risk/rollback: additive optional public event metadata; no combat rule changes or automatic dice rolls. Keep old-event fallback. Preserve previous local Mac import/test fixes. Revert frontend commit/deployment if needed; no destructive backend changes.

## 2026-09-18 — Ambassador map inspection and Mac pinch
- Outcome: inspect the galaxy during an ambassador exchange without losing the response draft; Mac trackpad pinches zoom the map around the pointer.
- Acceptance: View galaxy and desktop Explore both open inspection; selecting sectors and returning preserve response/resource/partner; no exploration draw or other action commits while the decision is pending. Mobile Galaxy/Return to decision works. Native ctrl-wheel/Safari gesture support is map-scoped, bounded and does not interfere with touch pinches or ordinary scrolling.
- Tests first: map navigation/draft retention and no accidental commands; pinch anchor/clamping/event interception. Verify Chromium/WebKit browser gestures and desktop/mobile layouts; full bounded tests, build, scoped lint.
- Risks/rollback: UI only, preserve authoritative rules/backend and existing main-only Git deployment. Revert frontend commit if needed. Physical Mac gesture feedback remains separate from synthesized browser evidence.

## 2026-09-18 — Endgame exits, completed saves and visual scoring
- Outcome: finishing a game leads naturally to home/new-game setup; completed saves stop crowding active games; faction score cards communicate where points came from.
- Acceptance: explicit Home/Play again and read-only galaxy inspection after completion; active and collapsed completed history separated without deleting games; faction emblems, rank/VP medallions and category icons; hidden reputation stays hidden until final scoring; exact ties and resource tiebreaks use existing score rules; categories remain inspectable on desktop/mobile.
- Tests first: endgame callbacks/navigation, public hidden reputation, final totals/tied winners, score inspection; agent covers landing grouping and routing. Review rendered live/final score at desktop/mobile sizes and run bounded relevant tests, lint/build.
- Risk/rollback: UI-only, retain all saves and authoritative scores; revert slice independently. No auto-created replay, no invitations/messages sent.
