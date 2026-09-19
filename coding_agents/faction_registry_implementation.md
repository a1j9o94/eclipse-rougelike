# Faction registry foundation — September 19, 2026

## Outcome

The base twelve faction sides now come from one typed registry that owns setup data, printed blueprints, provenance, presentation identity, gameplay capabilities, and AI policy hints while preserving every current rule, ID, save field, version, trade rate, and picker constraint.

## Acceptance criteria

- `BASE_FACTIONS`, the twelve IDs, their order, and `getFaction` remain compatible; `listFactions`, `isFactionId`, and `factionHasCapability` provide the new discovery/query surface.
- Registry entries identify their content pack, official/unofficial status, edition, source authority, rules source, blueprint source, emblem, and ship design family. Current entries are publisher-authority base content; the metadata type can distinguish later user-supplied Drive variants. Emblem and ship design identity are explicit fields rather than calculations from player color.
- Printed player blueprints live in registry data. Public blueprint helpers return copies so upgrade validation and saved blueprint overlays behave as before.
- Ancient coexistence, Draco's second exploration draw, Planta's sector scoring and population loss, advanced home population, reputation/ambassador spaces, and AI faction preferences read typed capabilities rather than faction IDs.
- Convex faction validation uses the canonical ID tuple. Server room color lookup uses the registry.
- Existing snapshots continue to persist faction IDs and the existing `second-dawn-base-2021-04-27` / `second-dawn-catalog-0.1` versions; registry data is not embedded into a match.
- Current faction selection still reserves one physical board color per seat and presents the same twelve choices in the same order.

## Fail-first test record

`src/__tests__/second_dawn_faction_registry.spec.ts` was added before the APIs and metadata. Its first focused run produced four failures: missing `listFactions`, missing provenance/visual fields, missing `factionHasCapability`, and missing registry blueprints. The existing scoring assertion remained green. Implementation then drove the suite green and added a snapshot-shape compatibility case.

Characterization coverage also includes the existing catalog, setup, blueprint, Ancient interaction, exploration, combat/reputation, rounds, AI, faction presentation, room, match, and protocol suites. Their unchanged expectations guard the behavior moved behind registry lookups.

## Decisions

- `FactionId` is derived from exported `FACTION_IDS`; this removes the duplicated literal list from the Convex validator without changing the accepted wire values. `FACTION_REGISTRY` is canonical while `BASE_FACTIONS` remains a reference-identical compatibility view; `listFactions` can filter by content pack.
- `color` remains the physical base-game board/piece constraint. `emblem` and `shipDesignFamily` are separate registry fields. Base entries intentionally assign the same visual families as before.
- Capabilities are concrete data for behavior the engine already supports. The registry does not include a generic rules interpreter or speculative hooks for unofficial factions.
- AI preference values were moved as policy hints because they already existed as faction-ID branches. They do not authorize or execute actions.
- Registry and rules/catalog version strings remain unchanged because game behavior and persisted schema remain unchanged.

## Deferred picker / player-color separation

The picker still groups mutually exclusive faction board sides by `color`, and saved `Seat` objects still contain only `faction`. Rendering, room uniqueness checks, component supply, and board ownership color all derive the physical piece color from that faction. Letting arbitrary factions choose a player color therefore requires an additive persisted seat field (for example `pieceColor`) plus validators, room conflict checks, snapshot compatibility defaults, public view projection, and UI controls. Adding only a picker control now would create clients and servers that disagree about component identity. That schema/UI slice is deferred until the first larger roster is enabled; the new explicit emblem and ship design fields remove those presentation concerns from that future migration.

## Risks and rollback

The main risk is a registry value drifting from the previous branch logic. Exact blueprint fixtures and the targeted rules/AI suites cover the moved values. The compatibility aliases (`BASE_FACTIONS`, `source`, `color`) remain available, so callers can migrate incrementally. A normal feature revert restores the previous conditionals; no data rollback is required.

## Validation

- Fail-first: `NODE_OPTIONS=--max-old-space-size=4096 npx vitest run --pool=threads --maxWorkers=1 src/__tests__/second_dawn_faction_registry.spec.ts --reporter=dot` — 4 failed, 1 passed before implementation.
- Focused foundation: registry, catalog, blueprints, setup, and rules — 42 passed.
- Behavior-preservation batch: 18 suites covering registry/catalog/blueprints/setup/rules/actions/rounds/combat/legal AI/AI simulation and strategy/faction UI/public inspection/Convex rooms and matches/protocol — 152 passed.
- Final registry contract run after adding the complete alien blueprint snapshot and source-authority metadata — 7 passed.
- Type check: `npx tsc -p tsconfig.eclipse.json --noEmit` — passed.

- Quality gate: `npm run lint && npm run build` — passed. Build ran Convex code generation, both TypeScript checks, and the Vite production bundle; only the existing Browserslist-age and large-chunk advisories were emitted.

## Supervisor verification

- Reviewed the registry value moves, blueprint copies, scoring/Ancient/population capability consumers, server validator, and visual-family mapping against the previous code. No behavior changes found.
- Memory-bounded full Second Dawn regression: `NODE_OPTIONS=--max-old-space-size=4096 npm run test:second-dawn` — **944 tests in 169 files passed**, one worker, 149.47 seconds.
- Final `npm run lint && npm run build` passed; existing bundle-size/Browserslist advisories remain.
- Archive-builder integrity checks: four passed. `git diff --check` passed.
- Chromium rendered all six alien ship families at card and fleet-marker sizes; reviewed `.second-dawn/faction-research/visuals/all-families.png`, with no missing silhouettes or clipping. No styling or layout changed.

## Release verification

- Code/research commit `c41405a` merged by fast-forward and pushed to `main`.
- Existing Convex development deployment `ideal-nightingale-55` updated successfully; no schema migration.
- Vercel Git deployment `dpl_CzgseHoTULGMcbjY884RYs6hRfYN` reports READY, source `git`, ref `main`, exact commit `c41405a9cf955d8ddec8841aad50bf88897ee26e`.
- Canonical live preview loads `/assets/index-ClVw4O2g.js`, renders the galaxy, 12 emblems and 7 fleet markers, with no browser page errors. Reviewed the 1440×900 screenshot under `.second-dawn/faction-research/visuals/live-opening.png`.
- Source archive published separately with verified remote digest; see the archive audit.
