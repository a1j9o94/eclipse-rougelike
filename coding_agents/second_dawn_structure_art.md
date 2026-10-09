# October 9 — Sector structure art

Outcome: Warp portals, Monoliths and civilian Orbitals look like physical Eclipse pieces and are recognizable across the galaxy, Build, rewards and inspection.

Acceptance: distinct shared vector silhouettes; navy/metal palette with restrained highlights; legible at map and card sizes; Exiles keep their armed Orbital; tooltips, population, scoring, legality and commands remain unchanged. Draft builds use their actual component identity.

Tests: failing-first Build civilian/Exiles identity and galaxy/draft rule-label integration; existing galaxy, mobile galaxy, Build, discovery and Exiles regressions; lint and build gates; desktop/mobile browser renders.

Risk/rollback: UI-only assets and call sites; revert the commit. No engine, schema or backend changes.

Decision log: use code-native SVG geometry consistent with existing ship silhouettes. Keep abstract stat/resource/navigation icons. Audit identified Lyra's plain diamond Shrine and inconsistent advanced-planet star badges; the user authorized both fixes and deployment on October 9.

Validation: 31 tests across six focused suites passed after the three new integration tests failed first. Lint and build:vercel passed. The vector lineup was rendered and visually reviewed at card and 16–32px marker sizes. Static desktop/mobile component fixtures are reproducible with tools/second-dawn-structure-art-review.mjs. Local browser installation was blocked by unavailable downloads; cloud browser cannot access local files. Live release verification follows.

Independent review identified a nested SVG viewport mismatch for Exiles and planned ships; normalized these wrappers to the shared 96-unit frame before release.

Final review: shared BuildPieceSilhouette removes duplicated civilian/Exiles decisions across Build, rewards, discounts, summaries and map drafts. Portal and Monolith footprints are separated; context CSS can size the shared stat silhouettes normally. React review: typed public props, no new state/effects or network fetches, decorative SVGs inherit accessible labels from their containing UI.

Release gates: final 53 tests across 11 bounded suites passed, lint passed, full npm run build (including Convex codegen) passed before the final shared-piece refactor, and final build:vercel passed after it. No backend/schema changes.

## Shrine and advanced-planet follow-up

Outcome: Lyra's Shrine is a rose crystal on a layered pedestal, using the same physical-piece silhouette system in the galaxy and Research. Advanced planets share a gold SVG star in inspectors, colonization, influence, empire overview and exploration/market previews. Existing accessibility labels and rule text are retained; multi-Shrine sectors display their count.

Acceptance: the Shrine remains distinct from other structures at marker size; its base has separation from population dots. All six advanced-star consumers use the shared SVG rather than font glyphs or duplicate paths. No gameplay changes.

Validation: the added Shrine and advanced-star tests failed first, then all 54 tests in eight relevant suites passed. Independent integration review found no blocking issues and suggested the applied two-unit Shrine spacing adjustment. Updated five-piece lineup reviewed at card and 16–32px sizes. After the spacing adjustment, both art suites passed again (5 tests), lint passed, and the full build including Convex codegen passed. Production release is explicitly authorized; live verification follows the main push.

Follow-ups: no additional asset replacement is included in this slice. Existing abstract resource and navigation symbols remain consistent with their UI role.

Release integration: the concurrent science-fiction faction release reached main before publication. Rebased onto 8b87eed, preserving faction-specific component supplies, Guild portal detection/toll text, and reserved technology-market behavior. The merged release passed lint, full build and 70 tests across nine suites; galaxy/mobile and discovery tests also passed. Updated the existing Research regression assertion to match the upstream "No unreserved market copy remains" wording; its disabled purchase check is retained.

Production: 607939e deployed successfully to the intended obleton-adrian project (96BSum1fJR4heC9qX8tbHTNVfNBY). Live Lyra Research showed shared Shrine SVGs at 22×24 / 28×30 and the shared advanced badges, with no page overflow; Build showed civilian Orbital/Monolith art. Live review prompted a small CSS refinement to align the Shrine heading and separate button identity from placement cost.

New-faction audit: Bobiverse's factory marker is a flat Materials square attached to its interceptor. A shared faceted cube attachment badge is a useful subsequent polish item; SectorFleet lacks factory status, while movement/combat use text. Guild portals now share the portal piece, and new faction emblems/ships, reservations and reverse-engineering use the existing visual systems. No factory artwork replacement is included in this release.
