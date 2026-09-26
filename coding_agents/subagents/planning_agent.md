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

## September 18, 2026 — Advanced technology planet opportunity
- Outcome: before researching advanced population technology, see the number of empty controlled planets it supports and the population current supplies could fill.
- Acceptance: visual resource/advanced counter on market and owned research cards; selected detail separates eligible planets, newly enabled options, and colony ship/cube capacity. Include advanced gray squares once; exclude occupied, ordinary, and foreign planets. Update directly from authoritative views, including off-turn inspection.
- Risks & rollback: presentation only, no rule/command changes. Avoid claiming immediate legality or double-counting gray planets; revert isolated UI/helper if needed.
- Tests (must fail first): eligible planet filtering, gray/Metasynthesis overlap, supply limits, zero opportunities, market/owned integration and refreshed population state.
- Decision: capacity is hypothetical using current supplies after acquisition, not a command legality promise. Independent rules audit by mac_map_pinch confirmed catalog/colonization mechanics.

## September 18 — Automatic drafts, no acknowledgement
- Outcome: saved choices remain available without interrupting play with a draft-review prompt.
- User correction: “No, it shouldn't ask at all, just save.” Remove all revision-based acknowledgement; do not replace it with selective prompts.
- Acceptance: automatic save/restore, no draft-age blocking, receipt-safe cleanup; actual affordability/legality and authoritative expected revision still enforced.
- Tests: new revision/resource/receipt regressions failed first, then passed; changed draft tests preserve existing persistence coverage. Rollback is presentation-only and keeps saved draft schema unchanged.

## September 18 — Living empire overview and tactile combat dice
- Outcome: faction inspection feels like a civilization board, with actionable planets/fleets and abilities visible in context; combat gains optional real 3D dice whose faces match authoritative results.
- Acceptance: visual own/opponent overviews on desktop/mobile, public-only opponent data, location/blueprint/research navigation preserves drafts, faction effects near relevant actions. Dice use server values, do not reroll or add acknowledgement; saved off setting, reduced motion/fallback, responsive and skip-safe.
- Failing-first tests: overview selectors/privacy/navigation; faction applicability; persistent settings; exact die orientation/lifecycle, human/AI combat integration without repeated throws or rule changes.
- Delegation: mac_map_pinch overview/model; combat_destruction_feedback renderer; combat_casualty_provenance combat integration; supervisor settings, contextual faction markers, board integration and release gates.
- Risks/rollback: isolated presentation only; lazy WebGL resources, cap DPR, dispose on unmount, static fallback. Preserve existing RNG/commands/saves. Revert presentation modules independently.
- User steering: dice roll across the whole screen on a temporary transparent overlay, not in a dedicated tray. Keep controls usable and clear overlay automatically.
- User steering: original faction-specific SVG ship families, paired Terran variants share catalog-color family; each class distinguishable at small map size and large blueprint size. Wire same assets throughout map/overview/planning/combat. combat_casualty_provenance owns vectors after integration; supervisor wires noncombat consumers.
- User steering: normal galaxy shows only usable edge connections; unmatched openings remain visible during placement. Added read-only displayedWormholes projection, honors viewer Wormhole Generator on both sides; engine topology unchanged. Four failing-first regressions plus real browser edge-count assertions.
- Review fixes: selected empire map inspection preserves unfinished build drafts; desktop overview drops empty inspector column; mobile Players roster explicitly horizontal to prevent inherited 190px flex-basis becoming row height. Browser reproduced roster1182px/main0 before correction.


## September 18, 2026 — stronger AI assessment

Outcome: credible fleet threats and profitable conquest within bounded server think time. Read-only independent review by `ai_search_assessment` plus local warm profiling identified missing coordinated candidates, technology follow-through, economy opportunity costs and combat-model fidelity. Proposal and acceptance/test list: [stronger AI assessment](../second_dawn_stronger_ai_assessment.md). Targets: Normal 100–500 ms, Hard 1–3 s, Expert up to 30 s per strategic action, pending hosted benchmarking. Risk/rollback: versioned controller; keep previous AI; no authoritative rules changes. No gameplay implementation or deployment performed. Current tests/build were not rerun for this documentation-only assessment.

## September 19 — Action flow and Second Dawn-only cleanup
Outcome: remove exhausted-action bookkeeping, make mobile ship fitting a continuous slot/picker workflow, and remove the legacy roguelike. Acceptance, failing-first tests, risks/rollback and ownership: [delivery plan](../second_dawn_action_flow_cleanup.md). User explicitly supersedes earlier preserve-legacy and mandatory Done behavior. Feature branch after clean fetch/pull; npm ci passed. Full-suite runs remain memory bounded.

## September 19 — visible turn order
Outcome: fair initial live starter and readable upcoming clockwise roster. Acceptance, fail-first tests, ownership and rollback: `coding_agents/second_dawn_turn_order.md`. Engine agent owns live seeded setup/scheduling; supervisor owns visual roster and release. Existing saved matches stay intact.

## 2026-09-19 — Command-center build shortcuts
Outcome: own fleet cards expose priced build shortcuts with clear blockers and conversion warnings. Acceptance: add exactly one unplaced ship to preserved draft, no immediate command; opponent inspection unchanged; desktop/mobile readable. Fail-first helper and UI cases cover costs, gates, conversion, draft retention and final authoritative build. Risk: shortcut availability drifting from engine; reuse existing analysis/funding and retain final engine validation. Rollback feature commit only; published build-panel fix remains intact. Plan: `coding_agents/second_dawn_command_center_build.md`.

## September 19, 2026 — Dice sound
Outcome: tactile combat dice with synchronized clatter and persistent mute/volume. Acceptance, failing tests, risks and rollback: [dice sound plan](../second_dawn_dice_sound.md). Independent audio helper and settings work; supervisor owns animation integration and release verification.

## September 19, 2026 — Faction registry foundation

- Outcome: make existing faction behavior data-driven and ready for reviewed roster expansion without changing the base game or persisted matches.
- Acceptance: canonical typed IDs/query APIs; registry-owned setup, capabilities, blueprints, provenance and visual identity; engine/AI/public consumers use capabilities; all twelve base factions and color constraints remain exact; saved shape and pinned versions remain exact.
- Risks & rollback: behavior drift while moving conditionals; guard with characterization and capability tests. No migration is introduced, so a normal feature revert is sufficient.
- Tests (failed first): new registry API/metadata/capability/blueprint checks failed four cases before implementation. Existing setup, rules, scoring, reputation, AI, UI, room/match and protocol suites preserve behavior. Full record: [faction registry implementation](../faction_registry_implementation.md).
- Deferred: independent seat/player color needs an additive persisted seat field and coordinated room/view/UI compatibility defaults; explicit emblem and ship design fields prepare that separate slice.

### September 19, 2026 — Drive faction research and archive

Outcome: let the user choose new factions from source-backed ability/difficulty research, preserve all creator materials on GitHub, and prepare the existing engine without altering current matches. Acceptance: 24-option matrix, Drive authority/version decisions, all 190 originals archived and hashed, README credits, AI heuristic assessment, and behavior-preserving registry validation. Archive tests failed before implementation and now pass (4); registry tests also followed fail-first. Risks: conflicting source sheets and the broader ten-round variant must not silently change base saves. Rollback: ordinary code revert; no migration. Decisions and follow-ups: `coding_agents/faction_research/README.md` and `faction_registry_implementation.md`.

### September 19, 2026 — Two-finger map scroll

Outcome: pan the galaxy using ordinary trackpad scroll while preserving pinch zoom and panel scrolling. Acceptance, failed-first tests, browser checks and rollback are recorded in `coding_agents/second_dawn_trackpad_pan.md`. Both new pan tests failed before implementation; 14 relevant tests plus Chromium/WebKit, lint/build now pass.

### September 19, 2026 — Plan A opt-in sound expansion

Outcome: optional quiet interaction/result sounds and an original ambient match soundscape make play tactile without changing rules or existing dice preferences.

Acceptance: new effects OFF/35%, music OFF/15%; saved independent settings and previews, shared audio context; authoritative receipt/public-visible-event confirmation; bounded/deduplicated playback; hidden/history/reconnect/leave cancellation; independent animations. See `coding_agents/second_dawn_sound_expansion.md` for test and browser evidence.

Risks/rollback: autoplay is a silent fallback, no sound backlog; browser route departure must stop audio even if lazy React loading retains a mounted tree. Cosmetic code revert, no migration or backend change.

Fail-first tests: new settings/API absent; invalid preview gain suppression; failed audio synthesis must not block the game; route departure must fade before delayed unmount. Additional focused coverage verifies receipt/deduplication/visibility, voice bounds, dice ducking and original dice behavior.

### September 19 — Influence selection clarity
Outcome: select an uncontrolled map sector and explicitly take control, with withdrawal separated to prevent accidental territory loss. Acceptance: own map selections never stage removal; named claims/transfers, visible VP/population/upkeep consequences, exact candidate submission, recovery/disabled guards and desktop/mobile clarity. Four behavioral tests failed first; 19 planner/draft and 31 engine action/auto-advance regressions now pass. Changed-file lint and diff checks pass. Browser: four Chromium/WebKit desktop/mobile walks accepted real preview-engine claims after proving own-sector clicks are safe. Rollback is UI-only; parent owns integrated release gates. See `coding_agents/second_dawn_influence_clarity.md` for decisions, reviewed images, limitations and human playtest follow-up.

### September 19 — Optional public movement win estimate
Outcome: game-enabled approximate combat odds beside a selected movement destination, with clear uncertainty and responsive input. New tests failed before implementation. Public-only independent simulations, four-trial yields, bounded fleet/dice/round/sample/compute work and cancellation preserve rules/RNG. Thirty-nine focused estimator/UI/movement/simulation tests pass; shared TS and changed-code lint pass. Reviewed Chromium/WebKit desktop/mobile component runs include a twenty-ship stress case: 95–116ms total with 6–9ms largest input heartbeat gaps. Parent owns room/setup persistence, integration and release. Audit: `second_dawn_movement_win_estimates.md`.

### September 19 — Full history and deliberate turn attention
Outcome: rewind through the remaining game history with agreed truncation; draw attention centrally when a turn/upkeep needs input and remove routine save popups. Acceptance, user correction, fail-first tests, risks and verification are in `coding_agents/second_dawn_full_history_rollback.md`. Root owns cache/presentation integration and release; focused agents own truncation queries and recovery/modal verification. Existing match data is preserved; discarded timelines are inaccessible to game APIs.

### September 19 — Wooden galaxy and paper play-area asset studies
Outcome: give the user concrete reusable art references for carved sector tiles, three-dimensional ship figurines and paper actions, plus full-board/combat/research/blueprint compositions. Six built-in image generations and their exact prompts are saved in `coding_agents/art_direction/wood-and-paper-v1/`. Acceptance and visual review are in its README; read-only PNG integrity/alpha checks and hashes are in validation.json. No app code/rules changed. Lint/build pass. Production sprite slicing, camera/edge verification and live state overlays remain a later integration task; no approval of these studies is assumed.

## 2026-09-19 — Rift Cannons and printed dice
Outcome: new matches include the official Rift mini-expansion and combat dice show actual Eclipse faces. Acceptance, source references, fail-first coverage, rollout isolation and rollback are recorded in `coding_agents/rift_cannons_plan.md`. Engine/catalog/UI/AI work was delegated in separate file scopes. Additional Drive heuristics and wooden-atlas redesign use separate worktrees/branches and are excluded from this release.

## Sector decks and neutral fleet recognition — 2026-09-19
Outcome and acceptance: see ../sector_decks_neutral_fleets.md. Fail-first coverage for count-only public piles, draw updates, UI details/fallback and neutral identification. Additive optional projection; revert presentation/projection to roll back. Existing gameplay rules and atlas branch unchanged.

## Research market order — 2026-09-19
Outcome: available technology in each market group is ordered cheapest first. Acceptance: current science cost ascending, stable base-price/name tie breaks, duplicates grouped, draw state unchanged. Risk/rollback: presentation only; revert ResearchWorkspace ordering. Fail-first test: shuffled market across all four groups, duplicate count and view immutability; then research/discount regression batch.


## Less Random mode — 2026-09-20
Outcome: opt-in ten-round Régis variant, fully saved and available to humans/AI. Acceptance, source decisions, risks/rollback and failing-first tests: [plan](../less_random_mode_plan.md). Terra owns core and UI; Sol owns combat and ban audits; supervisor integrates source catalog, developments, protocol tests, browser review and release.

## September 20, 2026 — Rules setup, discovery reference, and compact header
- Outcome: players can comfortably choose rules, browse all Less Random discovery rewards in Command Center, and read resources alongside long faction names.
- Acceptance: separate touch/keyboard-friendly rules rows in solo and room setup; read-only Less Random discovery catalog with canonical effects and public stock; no catalog/private supply leakage in standard mode; resource symbols with accessible names and faction text constrained to its own header space.
- Risks & rollback: inaccurate reward descriptions or stock, inaccessible icon labels, responsive overflow. Reuse canonical definitions/public view; UI-only changes can be reverted independently.
- Tests (must fail first): rules description association and selection/save behavior; header named resource symbols and faction identity; discovery availability/effects, exhausted supply, standard-mode absence, and no command submission.
- Verification: bounded related suites, lint/build, desktop/mobile browser screenshots. Human newcomer/expert playtests remain pending; suggested tasks are choosing a ruleset and comparing discovery rewards without instructions.
- Decision log: use existing resource icons; retain full faction identity through its accessible title; show a read-only discovery reference rather than issuing a reward command while browsing.
- Follow-ups: record actual validation and delivery evidence after integration.
- Result: all requested UI changes complete; 60 related tests, lint and build passed. Reviewed actual desktop/mobile browser images and measured an 8px timer/resource gap. See coding_agents/second_dawn_ux_clarity.md and the updated delivery ledger; human playtests and deployment remain outside this delivery.

## September 20 — Independent custom game rules
- Outcome: players configure game length and rule groups independently, or apply the complete Standard/Less Random presets in one click.
- Acceptance: 1–20 rounds; independently open technology/public discovery/public reputation/exploration/combat Jokers/variant technology inventory/variant discovery inventory/faction rules; solo and room settings persist with readiness invalidation, visible summaries, AI support and correct endgame round; historical saves retain preset defaults. Deploy after passing gates per user preference.
- Rules contract: optional `ruleOptions` overrides resolved by `gameRules`; `rulesMode` stays backward-compatible. Rift Cannons unavailable with combat Jokers or variant technology inventory; full preset disables portals/Rift. Custom public discoveries use the selected discovery inventory, not implicitly the variant inventory.
- Failing-first tests: standard 10-round finish; independent setup supply/decisions/privacy; public-view and AI reconstruction; backend validators/save/readiness; UI preset/custom callbacks and display.
- Risks: mixed configurations leaking hidden supply or diverging AI, partial backend rollout. Additive optional schema; deploy backend before frontend. No migrations of existing games.
- Follow-ups: bounded regression batches, lint/build, local/live browser verification and release audit.
- Result: independent settings and upkeep scroll fix complete. Final integrated gate: 175 tests in 29 bounded suites, full lint, codegen/typecheck/build passed. All 256 option configurations pass setup/privacy/legal smoke; custom seeded AI games finish. Browser settings and native upkeep scrolling verified on desktop/mobile. Backend-first main-only release follows automatically; see custom_game_rules_release.md.

## September 20, 2026 — Proactive action confirmation
- Outcome: when a player has filled a valid action plan, a centered notice surfaces its final confirmation without submitting automatically.
- Acceptance: completed upgrade drafts prompt Apply upgrades/Keep editing; full build/move plans use the same notice when all placements/destinations are chosen; incomplete, invalid, blocked, stale, or pending-choice plans stay quiet; dismissal preserves drafts and does not repeat for the same plan. Existing turn/upkeep attention remains intact.
- Decision: exhausted committed actions usually advance automatically in the engine, so readiness belongs to the unsubmitted planner, not an unconditional remaining=0 turn notice.
- Risks/rollback: avoid interrupting part selection, hiding funding/diplomacy consequences, or submitting twice; revert this UI-only commit if needed. No engine/protocol/save changes intended.
- Tests (must fail first): complete upgrade prompt and explicit submission; dismissal/no-repeat; partial/invalid/disabled drafts; build/move readiness. Run bounded adjacent attention/draft/planner regressions, lint/build, desktop/mobile browser checks, then deploy via main.

## September 20, 2026 — Decisions on the shared galaxy
- Outcome: exploration placement, control/influence choices, upkeep abandonment, and other sector decisions use the main map with existing desktop inspector/mobile sheet, preserving spatial context.
- Acceptance: exactly one galaxy map during these choices; preview rotation/portal placement and eligible targets rendered there; sector taps drive the active choice; inspection/navigation preserves drafts; explicit confirmation and existing rules remain; non-map choices use an appropriate popup rather than a duplicate galaxy.
- Risks & rollback: preview must never mutate authoritative state; retain legal validation and no accidental submits, avoid stale map callbacks after decision changes. Revert UI slice if needed; no schema/engine changes planned.
- Tests (fail first): shared-map board integration for exploration/control/bankruptcy/portal, same map identity/camera, target selection and valid exact commands, draft preservation and mobile inspector access. Run relevant tests, lint/build, browser verification then deploy.

## 2026-09-24 — Public spectator mode
Outcome: room-link visitors watch all players and freely inspect only public game information.
Acceptance, failing-first test list, decisions and rollback: [spectator plan](../second_dawn_spectators.md). Backend and UI implementation assigned independently; supervisor owns routing, integration and release gates. No seat takeover or puzzles.

## 2026-09-25 — Reddit feedback and missing factions
Outcome: make legal colonization visible before Pass, simplify action finding, and add the missing official expansion factions through separate complete releases.
Acceptance: the [feedback plan](../reddit_feedback_2026_09_25.md) defines desktop/mobile opportunity cues, newcomer/expert action discovery, truthful exploration information, Exiles and Lyra rules/AI/UX, and versioned faction roster preservation.
Risks & rollback: avoid false colony opportunities, nagging prompts, lost drafts, hidden deck leakage and faction save incompatibility; retain one-click Pass and release each shell/faction slice independently.
Test list (must fail first when implementation begins): legal/no-legal/pending/mobile pre-pass cues and one submission; action reachability/draft preservation; deck privacy and variant odds; Exiles Orbital lifecycle/combat/scoring/recovery; Lyra Shrine/research/row-bonus/combat/scoring/recovery; AI full matches for each faction.
Decision Log: plan the observed colony and navigation fixes first; keep probability claims limited to public facts; add Exiles then Lyra under a new pinned profile instead of changing `expanded-v1` membership.
Follow-ups: implement and verify each slice, record actual human playtests and release evidence in the UX ledger.

## 2026-09-25 — Upkeep colony review and current ring odds
Outcome: give players the last available colonization choice before upkeep is finalized, and show the five requested next-sector feature percentages with icons in Explore.
Acceptance: Finish upkeep opens the existing planner only when legal colony placements remain; Colonize submits only placements, Finish upkeep anyway submits only upkeep, and Pass/End action stay quick. The Explore card shows science, money, materials, Ancient and artifact chances from the actual next draw pile (or upcoming reshuffle), with gray planets counting as all resource options and accessible labels for icons.
Risks & rollback: avoid duplicate commands, false legal planets, incorrect ring/reshuffle odds, revealing tile identities, and cramped popup layout. Revert the upkeep UI and optional aggregate projection independently if needed.
Tests (must fail first): desktop/mobile upkeep review and no-legal cases; in-popup colonization and one command; next-pile aggregate/privacy, boxed/variant/reshuffle odds, icon labels and Explore board integration. Relevant suites, lint, build and browser review before release.
Decision Log: user clarified the reminder belongs before finalizing upkeep, not before each Pass; the explicit Finish upkeep anyway option preserves agency. The user requested icons rather than printed resource names in the odds chips.
Follow-ups: record final test/build/browser/deployment evidence and human playtest observations in the UX ledger.
Result & Next Steps: 25 bounded tests across five suites, full lint and build passed. Desktop Explore and desktop/mobile upkeep dialog were visually checked locally with no page errors or overflow; the mobile first pass exposed and fixed below-fold choices. Publish the additive Convex projection to the established deployment before the Git-triggered frontend release, then verify the live odds. Human experience validation and factions remain follow-ups.
Release: Convex `dev:ideal-nightingale-55` reported Ready after an authenticated local `convex dev --once` push; `8e1e2da` reached Vercel production successfully. A public guest game's Explore card displayed all five live icon odds with no page errors. Human playtest and the Exiles/Lyra branches remain in progress.

## 2026-09-25 — Faction profile preservation and action-layout concept
Outcome: preserve the exact sixteen-faction `expanded-v1` roster while preparing a separately versioned collection for Exiles and Lyra; show the owner a desktop/mobile action layout before changing the game UI.
Acceptance: existing base and `expanded-v1` games retain their roster and version pins; `expanded-v2` has a distinct save version and is valid in room settings; no faction becomes selectable in an existing profile by registry growth. The [static concept](../mockups/second_dawn_action_layout.png) shows six ordinary actions together, separate Colonize/Trade options, and a fixed turn-control position on each viewport. No production UX code changes until owner review.
Risks & rollback: new catalog entries could leak into existing saved profiles or an expanded room could lose independent piece colors. Revert the scaffold independently before either new faction ships if those checks fail. The concept is a nonfunctional visual and may need adjustment after actual playtest.
Tests (failed first): `second_dawn_faction_profile_v2.spec.ts` version pin and room validation. Run expanded engine and room regressions, lint and build. Before exposing the new collection, add Exiles/Lyra acceptance tests for selectable rosters, persistence and recovery.
Decision Log: `listFactions()` without a profile remains the original compatibility catalog; the explicit `expanded-v2` profile takes the full registry. The owner asked to see the action layout before UX implementation, so the concept is kept under `coding_agents/mockups/` only.
Follow-ups: reconcile each faction agent's tests with `expanded-v2`, wire picker and launcher only after rules/AI/UX are complete, and validate the action concept with the owner before coding it. No human newcomer/expert playtest yet.
Result & Next Steps: the new profile test failed on the old version pin as intended, then 25 targeted tests, lint and build passed with the scaffold. Agent branches are still in progress; this branch remains separate from main.
## 2026-09-25 — Fixed action layout and pass-order turn variant
Outcome: players find normal actions and turn-ending controls in stable places, and hosts may choose whether next round follows first-pass order or the existing clockwise seating.
Acceptance: desktop has a fixed six-action rail, separate Colonize/Trade choices, and a phase-aware turn area; the mobile action sheet groups the same options and its footer keeps turn control beside Choose action. After passing, auto-pass occupies that footer/rail area while reaction turns remain available. The creation rules checkbox works in solo and room setup, room summary names the selected turn order, current games default to clockwise, and the variant uses each seat's first pass exactly once for the next round. First-pass +2 money, reaction turns, AI, saves and reconnect survive.
Risks & rollback: a layout shift can hide a command or crowd the mobile galaxy; a turn-cycle change can misorder AI or passed reactions. Keep the action UI and optional rules field independently reversible; old snapshots omit the field and stay clockwise.
Tests (must fail first): new `second_dawn_pass_order_variant.spec.ts` rejects the old validator/versioned cycle, desktop rail and mobile grouping/footer tests reject the old layout; room/solo form and Convex persistence; existing quick-turn, handoff and auto-pass regressions; bounded AI full match; browser desktop/mobile at 1280×800 and 390×844.
Decision Log: the product owner approved the static rail/sheet concept and explicitly required the pass-order checkbox alongside existing Less Random game-creation options. We keep physical seat arrays unchanged and persist a separate action cycle; passing first still grants +2 money and begins the next round. Mobile retains Galaxy/Empire/Players/Activity navigation as a second footer row.
Follow-ups: verify final browser layout and relevant regressions, update the UX ledger and release evidence; human newcomer/expert action-search playtests remain outstanding.
Result & Next Steps: 39 bounded tests across nine suites pass, including an eight-round AI match with pass-order turns. Lint and build pass. The isolated local backend accepted a new game with the variant; desktop and mobile browser checks found no page errors or horizontal overflow. The first mobile footer check caught reversed controls caused by a later flex rule; the corrected 390-pixel screen now has Choose action left and Pass right, and after Pass the checkbox occupies the turn row. Final integration/release gates remain.

# Exiles faction slice — 2026-09-25

Outcome: Play The Exiles with their starting Orbital, combat defender, and end-game Orbital points.

Acceptance criteria: Official setup constants, sector 234, station defense and loss, Starbase restriction, Orbital VP, base-save compatibility. Details: `coding_agents/exiles_faction_design.md`.

Risks & rollback: The stationary Orbital reuses the otherwise unavailable Starbase blueprint; revert this feature branch if its lifecycle integration is incomplete.

Test list: `second_dawn_exiles.spec.ts` (setup and scoring failed first, then passed); bounded registry, setup, actions, and blueprint tests. Deterministic combat and full AI match remain follow-ups.

## 2026-09-25 — Enlightened of Lyra base species
Outcome: players can choose Lyra, place nine Shrines through optional Research action steps, earn row rewards, spend colony ships on single-die combat rerolls, and score controlled Shrines.
Acceptance: publisher setup and costs match the archived Seekers rules/boards; each planet holds at most one Shrine; completed rows grant permanent wormhole ability, discovery, or one influence disc; Shrines remain after lost control; AI and saved games handle all choices.
Risks & rollback: adding Lyra changes a public roster and persistent command shape. Preserve `expanded-v1` via the separately pinned `expanded-v2` scaffold; revert this feature commit before release if faction tests, lint, or build fail.
Tests (failed first): faction setup, legal/illegal Shrine placement, optional placement after technology, scoring, row reward, combat reroll, recovery, bounded AI match. Then run adjacent faction/combat/protocol tests, lint, and build.
Decision Log: Shrine placements are explicit typed records on the seat, with sector and planet identity. A Shrine opens or continues Research but consumes no technology activation; Lyra's only technology activation leaves the action open until Shrine placement or explicit End action. The combat reroll uses the volley review and spends one available colony ship per chosen die.
Follow-ups: complete `expanded-v2` integration and human playtest before release; add the separately sourced anti-missile variant only after base Lyra is accepted.

## 2026-09-25 — Integrated action controls, pass-order setting, Exiles and Lyra
Outcome: ship the approved action layout, the creation-menu turn-order variant, and both missing expansion factions as a complete playable collection.
Acceptance: the game-creation rules list offers “Next round follows pass order” for solo and rooms; the setting persists, orders the following action round by first passes, and preserves the first-pass money bonus. The desktop rail and mobile sheet/footer keep turn control fixed, including auto-pass after passing. New games default to `expanded-v2` with all eighteen factions, while base and `expanded-v1` saves retain their original rosters. Exiles Orbital lifecycle and Lyra Shrine/research/reroll/scoring work with AI and multiplayer recovery.
Risks & rollback: new shared engine and snapshot fields require the Convex backend to be published before the Git-triggered frontend release. Preserve v1 data and release the integrated branch only after the relevant tests, lint, build, and browser smoke checks pass; revert the release commit if production verification fails.
Test list (failed first): action-layout and pass-order tests in the isolated branch; Exiles and Lyra engine tests in their branches; integrated `expanded-v1` picker test failed when it exposed the new factions and passed after profile filtering. Relevant faction tests 48/48, layout/variant/rooms tests 37/37, custom rules/Convex tests 20/20, bounded AI gameplay tests 20/20 pass. Lint and build passed before final room-label edit; final gates and release verification follow.
Decision Log: restore the original no-argument registry API, explicitly filter the picker by profile, and default only new solo/room forms to v2. The older expanded profile remains selectable for compatibility. Distinguish the v2 collection in the room summary. The pass-order option stays with Individual rule options beside the Less Random checkboxes, independent of the rules preset.
Follow-ups: human newcomer and expert playtests for action finding and faction balance; separately source and implement Lyra’s anti-missile variant if desired.
Result & Next Steps: integrated release `c8dd0d5` passed final lint/build plus bounded faction/profile, layout/variant, room/Convex, and AI suites. Convex functions were ready before the Git-triggered Vercel production deployment, which reached Ready and acquired the public alias. Live solo and mobile room creation exposed the pass-order checkbox and selected v2 roster with no page errors. Collect newcomer/expert action-finding and Exiles/Lyra balance playtests as follow-ups.

## 2026-09-25 — Affordable actions open economy tracks
Outcome: selecting the affordable-action number takes the player to their Command Center’s income and upkeep tracks.
Acceptance: desktop and mobile indicator navigate to the player’s own Command Center, scroll the resource tracks into view, and keep the existing forecast disclosure available; no command is submitted or draft discarded. The old breakdown remains accessible through the This round disclosure.
Risks & rollback: avoid nested interactive controls, scrolling before the target mounts, and navigation to another player’s overview; revert the UI-only commit if navigation fails. No game state or backend changes.
Tests (must fail first): desktop and mobile Board click reaches own Command Center and track, scroll call; direct summary disclosure still reveals forecast; no command submitted. Run bounded adjacent UI tests, lint and build, then live desktop/mobile smoke verification.
Decision Log: give the prominent affordable-action count a direct navigation action, while keeping the adjacent This round control for the compact forecast explanation.
Follow-ups: verify browser focus/scroll on both layouts and record release evidence in the UX ledger.
Result & Next Steps: the count opens the player’s own economy tracks and keeps the forecast disclosure separately accessible. Three new interaction tests failed before implementation, then the focused 23-test batch, lint, and build passed. Local Chromium desktop and mobile checks reached the tracks with no errors or overflow. Release and live verification follow.
Release: `fbafec4` merged into `main`; Vercel production reported Ready and the public guest game’s affordable-action button reached Income & upkeep tracks without page errors. Human playtest remains pending.

## 2026-09-26 — Declined AI diplomacy and explicit response
Outcome: declining an AI ambassador offer lets play continue without repeated requests from that AI during the same round, and the response screen clearly names both choices.
Acceptance: a rejected action-turn offer is remembered for the round; normal/hard/expert AI avoid proposing again to that seat until next round; existing human diplomacy remains legal; post-combat Finish diplomacy still advances. The incoming screen requires an explicit Accept or Decline choice, labels the rejection confirmation “Decline and continue,” and the proposer’s finish option says it ends further offers this round. Drafts survive galaxy inspection and no command is sent before confirmation.
Risks & rollback: avoid changing persisted old-save interpretation or blocking voluntary human offers; use an additive optional round-scoped record or AI-only policy filter. Revert engine and UI slices together if loop tests fail. No deployment until relevant tests, lint and build pass.
Tests (must fail first): ordinary action offer → decline → AI chooses a non-offer to that seat in the same round, including a repeated turn; next round offers legal again; post-combat decline/finish unchanged; response choice unselected by default, explicit decline confirmation, disabled handling and mobile inspection draft retention.
Decision Log: the reported loop appears to be action-turn AI re-offering; post-combat windows already track a declined seat for AI scoring. Keep rule legality for humans and solve the AI policy. The UI retains editable choices and a separate confirmation, avoiding an accidental one-click commitment.
Follow-ups: verify the Git-triggered production deployment and collect live player feedback on the offer flow.
Result & Next Steps: incoming offers require a deliberate response and label the reject commitment “Decline and continue.” Rejections remain round-scoped AI memory; humans retain normal offer legality. Hard-AI search worlds now carry proposer-only rejection memory. A new hard-search regression failed first; 78 focused tests across eight suites passed, plus 43 initial AI/diplomacy tests and 71 adjacent checks with one expected test adaptation. After restarting in an unrestricted workspace, 74 relevant tests across eight suites, lint, and build passed. Convex `dev:ideal-nightingale-55` reported functions ready. A local Playwright home-page check loaded without page errors or a Vite overlay; the diplomacy choice is covered by component tests.
