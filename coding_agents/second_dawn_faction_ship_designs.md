# Distinct faction ship designs

Outcome: identify fleet ownership and ship class from its silhouette, including small galaxy/fleet markers, without needing to decode a player number or rely on color alone.

Implemented six original SVG families with four class hulls each:

| Family | Visual identity | Paired human faction |
| --- | --- | --- |
| Eridani | Swept attack wedges | Terran Directorate |
| Hydran | Twin fork hulls | Terran Federation |
| Planta | Rounded organic petals | Terran Union |
| Draco | Hooked crescent wings | Terran Republic |
| Mechanema | Rectangular modular machinery | Terran Conglomerate |
| Orion | Armored central spine and narrow outriggers | Terran Alliance |

All ships point forward/up. Cruiser and dreadnought outlines add width, structure, or secondary prongs within their family; stations have a fixed radial footprint. Large card art adds plating, cockpits, and engine detail. Tiny markers retain the silhouette and hide fine plating. These are original vector drawings, not traced physical components.

`ShipSilhouette` accepts optional catalog `faction` and retains its prior generic art when faction identity is absent. Its existing accessible class label remains unchanged; `data-ship-family` identifies family for tests/review. Family mapping is by verified catalog color, so paired Terran choices share the same physical family. Combat firing groups, targets, split allocation, initiative groups, fleets, and casualty cards pass public faction identity.

Acceptance and validation:

- TDD: original component failed new family metadata expectations; new design tests pass all 24 unique hulls and all six Terran pairs.
- Existing accessible class identity and factionless legacy rendering preserved.
- Bounded combat/design/dice batch: 22 tests passed.
- Scoped lint and app TypeScript pass.
- Generated actual browser component sheet using `node tools/second-dawn-faction-ships-review.mjs` against local Vite. Reviewed `coding_agents/visuals/faction-ships/all-families.png`: six family shapes remain distinct at 130px and 34px; no clipping or overlap; all 24 classes fit their cells. Monochrome review deliberately checks silhouettes without color.
- This is engineering visual review. No independent human playtest is claimed.

Risks/rollback: presentation only; factionless fallback remains available. No game engine, counts, blueprints, save schema, or rules changed. Reverting the art/component changes restores previous presentation without touching saves.
