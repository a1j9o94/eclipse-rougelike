# Identify neutral defenders

Outcome: players can distinguish Ancient, Guardian and Galactic Center Defense System ships and read their weapons before or during a battle.

Audit: `shared/eclipse/battleEngine.ts` and `fleetInspectionModel.ts` select the standard blueprint for each neutral class. Advanced neutral definitions exist in the catalog but no active match field selects them. This change explicitly labels **Standard defender blueprint**; it does not imply that advanced variants are active or change combat statistics.

Implementation:
- Battle overview and fleet inspector keep their distinct neutral ship silhouettes and class names. GCDS uses its full Galactic Center Defense System name.
- Neutral armament shows one colored Eclipse die face for every actual die, with weapon type, dice per ship and damage per hit. This replaces small numeric weapon badges in both views.
- Existing authoritative hull/computer/shield/initiative values and per-ship damage remain intact. Player ship loadouts and engine rules are unchanged.

Acceptance and tests: all six new cases first failed for the missing standard-blueprint label. They now pass for each of the three neutral classes in battle and inspection, asserting actual catalog die counts, remaining damaged HP and computer values. Together with existing fleet and battle regressions: **15 tests passed**. Scoped eslint and final `tsc -b` passed. The initial typecheck encountered the parent agent's not-yet-created `SectorDecks` module; rerun after its creation passed. Parent owns repository-wide gates and release.

Browser: used the existing local server with an isolated agent-browser session. `?position=ancient-combat#second-dawn-review` shows an actual Ancient engagement. `?position=opening-three#second-dawn-review` → select sector 001 → Inspect fleet shows the actual GCDS; sector 272 shows a Guardian. Captures in `screenshots/neutral-identification/` include Ancient battle and GCDS inspection at 1440×900 and 390×844, plus Guardian desktop inspection. Opened and reviewed the saved PNGs: names wrap cleanly, dice count/damage stay legible, and no controls clip. No browser runtime errors. These are agent inspections, not human playtest evidence.

Rollback: revert the presentation components, name formatting and scoped style file. No saved state or rules migration is involved.
