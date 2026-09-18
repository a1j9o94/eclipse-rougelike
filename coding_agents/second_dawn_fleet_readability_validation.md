# Fleet cards and civilization emblems

## Outcome
Each owner/ship class gets its own map card with the same ship silhouette used by the blueprint and inspector, plus a simple ×count. Sector inspection shows full colored fleet cards and all individual damage details. The six original SVG civilization emblems are shared by alien and corresponding Terran faction boards and appear in faction selection, map ownership and inspector cards (the root agent also added roster emblems).

## Decisions
- Reuse original interceptor/cruiser/dreadnought/starbase and neutral silhouettes to keep blueprint, combat and map vocabulary consistent. Remove radar/cockpit detail at map scale.
- Bound map fleets to four card positions. Five or more owner/class groups show three cards plus an explicit `+N types`; selecting the sector always exposes every group in the inspector.
- Emblems are original UI identifiers, not claimed reproductions of publisher faction artwork. Color remains the civilization color and is reinforced by shape and accessible faction name.
- Keep sector details outside cards: printed planets lower on the tile, decoration and ownership above fleets.
- Optional `GalaxyActivity` contains only public affected sector IDs and move endpoints. Recent sectors pulse; movement gets a moving dashed trail. Reduced-motion replaces animation with static emphasis. No activity prop means no animation.

## Verification
- TDD red: `coding_agents/logs/second_dawn_fleet_red.out` records missing per-class cards and activity behavior before implementation.
- Green: 13 tests across galaxy, sector fleet, faction symbol and faction picker pass (`second_dawn_fleet_green.out`). Covers class separation, counts, bounded overflow, ownership identity, optional activity, neutral inspector fleet and shared alien/Terran emblems.
- TypeScript and changed-code lint pass (`second_dawn_fleet_types.out`, `second_dawn_fleet_lint.out`). Final full bounded suite/build are coordinated by root.
- Browser script: `tools/second-dawn-fleet-browser-review.mjs`. Captured 37-sector late-game Fit and detail views at 1366×768, 1440×900 and 1920×1080 under `coding_agents/second_dawn_fleet_review/`. No horizontal overflow; real map sector selection works.
- Actual image review: all three Fit images and 1440×900 detail inspected. Faction identity and inspector class/count hierarchy are clear; ship cards do not overlap. Fit is a whole-galaxy overview, particularly small for a tall galaxy at 768px height; zoom and one-click inspector provide ship details. Detail zoom centers existing player territory, so distant selected sectors can leave the viewport; existing pan controls remain available.
- Browser review found a real SVG embedding defect: CSS sizing alone left nested emblem SVGs with the map viewport and intercepted neighboring-sector clicks. Explicit width/height attributes fixed it; actual click now passes at all three sizes.
- Review is agent visual inspection, not new human playtest evidence. AI pacing/turn labels and deployment are owned by root.
