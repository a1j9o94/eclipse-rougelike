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
