# MP Outpost View Gaps — Why Current Tests Miss Regressions

Date: 2025-09-06
Branch: feature/multi-faction-loss

## Context
- Live logs show server seeding and client applying blueprint ids correctly:
  - `[init] seeded … frameId:"cruiser"` for warmongers
  - `[MP] applied class blueprints from ids { interceptor:0, cruiser:6, dread:0 }`
- Yet the Outpost UI screenshot shows:
  - Focused ship: Interceptor (t1), not Cruiser
  - Header: `Class Blueprint — Interceptor ⬛ 0/6`
  - Capacity: 14 (warmongers cap), Used: 3 (suggests 3× interceptor tonnage)
  - Reroll (0¢) as industrialists for P2 is correct

Conclusion: server and blueprint state look correct; the Outpost view still renders Interceptor in at least one client.

## Why Current Tests Don’t Catch This

1) Test asserts mapping, not the real view
- `mp_blueprint_first_render.spec.tsx` mocks OutpostPage and reads its `blueprints` prop.
- It verifies that App mapped blueprintIds → parts before OUTPOST, but it does not render the real Outpost view.
- The real OutpostPage uses `focusedShip?.frame.id` to choose which class blueprint to show:
  - `const currentBlueprint = blueprints[focusedShip?.frame.id as FrameId]`
  - Header text derives from `focusedShip.frame.name` (e.g., Interceptor vs Cruiser)
- If the focused ship remains an Interceptor (for any reason), the header will say “Class Blueprint — Interceptor” even though `blueprints.cruiser` is populated. Our test wouldn’t catch that because it bypasses focus/fleet rendering entirely.

2) No assertions on fleet frames or tonnage in the UI
- We don't assert that the fleet cards read “×3 Cruiser (t2)” or that the first ship's frame label is `Cruiser`.
- If a later effect resets `fleet` back to interceptors (race/timing), this would only be visible in the real UI, not in our mocked OutpostPage test.

3) No assertions on header copy and class label
- We do not assert for visible text like:
  - `Hangar (Class Blueprints)` section contains `Class Blueprint — Cruiser` for warmongers
  - For a forced variant (e.g., startingFrame = 'dread'), that it says `Class Blueprint — Dreadnought`

4) Local vs server fleet validity mismatch
- The Start button disabled state uses local computed `fleetValid` (client-side tonnage + parts):
  - `const fleetValid = fleet.every(s=>s.stats.valid) && tonnage.used <= capacity.cap;`
- Our readiness test set `gameState.playerStates.P1.fleetValid = false` in the mock, but didn't make the client fleet invalid; UI disabled state derives from the local `fleetValid`, not server's flag.
- Result: Start button wasn't disabled in the test, so the expectation failed.

5) Persistence hygiene test trips SP StartPage
- App renders StartPage first. StartPage calls `evaluateUnlocks(loadRunState())` to compute SP progress.
- Our hygiene test expected zero calls, but StartPage legitimately invokes `evaluateUnlocks` before we switch to MP.
- We should refine the assertion to ensure no subsequent calls occur during MP (or stub StartPage for this test).

6) Repeated effect runs not asserted
- Logs show repeated `[MP] applied class blueprints from ids` lines.
- We don't assert the order-of-operations: “apply server state (research, economy, blueprints) THEN set mode=OUTPOST THEN seed only if server has no fleet”.
- If any effect re-seeds interceptors later or overwrites fleet/blueprints, our current tests won't catch it.

## Hypotheses About The UI Discrepancy
- Focus defaulting to an interceptor:
  - If the client's first computed `fleet` still contains interceptors at any point before Outpost renders, `setFocused(0)` points at an interceptor; header shows Interceptor and tonnage used looks like 3.
- Late overwrite of `fleet`:
  - A later effect (e.g., seed fallback) could set the local fleet to interceptors after server fleet is briefly applied. Our code guards against this by only seeding if `serverFleet.length===0`, but we should verify in the DOM that final rendered cards are cruisers.
- Grouping vs indexing nuance:
  - `groupFleet` might still group interceptors if fleet mapping didn't apply correctly on this client.

## Where To Add High‑Value View Tests (do not add yet; design only)

1) Warmongers first render — class and fleet
- Arrange: mock useMultiplayerGame with playerStates.A having `startingFrame: 'cruiser'`, `blueprintIds.cruiser` ids, and a fleet of `ShipSnapshot` where `frame.id='cruiser'`.
- Assert (DOM):
  - `getByText(/Class Blueprint — Cruiser/i)` appears
  - The first fleet card shows `Cruiser (t2)` (or frame name with t2) and group label shows `×3` if stacked.
  - Capacity used reflects cruiser tonnage (e.g., 6 of 14 for 3× t2) not 3 of 14.

2) Dreadnought variant — header phrase
- Arrange: startingFrame 'dread' and `blueprintIds.dread` non-empty + fleet of dreads.
- Assert (DOM):
  - `getByText(/Class Blueprint — Dreadnought/i)`

3) Industrialists vs Scientists cost labels (UI costs, not just helpers)
- Arrange: two separate MP contexts where `getCurrentPlayerEconomyMods()` returns 0.75 vs 1.0.
- Assert (DOM):
  - Build button reads `Build Interceptor … (3🧱 + 30¢)` for 1.0 and cheaper values for 0.75
  - Dock panel reads `Expand Capacity — Need …` with discounted vs full prices
  - Reroll button label shows `Reroll (0¢)` only for Industrialists, not for Warmongers

4) Seed fallback guard
- Arrange: server fleet empty & `roundNum=1` ⇒ seed locally from blueprint ids/hints
- Assert (DOM): first fleet cards match seeded class and ids; later when server returns snapshots the UI stays consistent (no revert to defaults).

5) Ready/Validity button behavior
- Arrange: local fleet lacks Source/Drive or exceeds capacity ⇒ `fleetValid=false`
- Assert (DOM): `Start Combat` button has `disabled` attribute; clicking does not toggle readiness nor submit snapshots.
- Arrange: `fleetValid=true` ⇒ button enabled; clicking toggles readiness and submits snapshot.

## Additional Instrumentation (optional)
- Log local vs server validity on Start click: `{ localFleetValid, serverFleetValid }`.
- Log focused frame id on Outpost mount: `{ focusedFrame: fleet[focused]?.frame.id }`.

## Actionable Next Steps
- Update tests to render the real OutpostPage (no mocking), asserting visible text:
  - “Class Blueprint — <Frame>”
  - Fleet card frame name and tonnage
  - Group count `×N`
  - Cost labels & reroll text
- Refine persistence hygiene test to ignore the initial StartPage call; assert no persistence once MP game view is active.
- Add a test capturing focus behavior after applying server fleet snapshots: focused index 0 is a Cruiser for warmongers.

## Principle
The only intended MP differences are the source of opponent fleet and the server‑authoritative state feed. The Outpost UI (hangar, costs, labels) should match SP for the same faction effects. Our tests must validate rendered text, not only state mapping.
