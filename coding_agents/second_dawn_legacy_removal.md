# Retired roguelike removal

Outcome: the repository and application expose only the current Second Dawn game, with a clean full-repository lint run and no old executable gameplay to maintain.

## Acceptance and tests first

Changed the existing route regression before implementation: retired `#legacy` and `#second-dawn-design-archive` bookmarks must open the current game menu. Both tests failed against the old app (`coding_agents/logs/legacy_removal_routes_red.out`), then passed after removing the old imports/routes. Current preview still renders the actual shared board and active-combat fixtures. Added a launcher regression: an unconfigured backend offers the shared playable preview and no roguelike link.

## Removed

- Old `GameRoot`, application views, roguelike engine/controllers/selectors, old multiplayer/outpost/tutorial code, obsolete components and their tests.
- Unused root `shared/` roguelike types/catalog/effects. `shared/eclipse/` remains intact.
- Retired backend queries/mutations/engine/seed/helper modules and `.old_roguelike` backups; regenerated API types expose only `eclipse*` modules.
- Standalone demo HTML/build entries and the obsolete pre-engine design-archive prototype/harness. Current `SecondDawnReview`, deterministic JSON fixtures and browser workflows stay.
- Old audio/demo assets, unused `react-hexgrid` and `react-zoom-pan-pinch` dependencies, line-count scripts for removed roots and old design/delivery entry documents. README/deployment/backend documentation now describe the current project.
- Dead global animation CSS and stale audio type declarations. Tailwind scans frontend sources explicitly, avoiding generated `[file:line]` CSS from historical prose.

A dependency closure was traced from the current frontend, all Second Dawn tests, the pure engine and `convex/eclipse*.ts` before deletion. The remaining reusable old-root utilities are the error boundary and canvas starfield used by `main.tsx`; the error-boundary regression remains. A post-removal TypeScript/build check verifies that no required imports were deleted. File manifest: `coding_agents/logs/legacy_removal_files.json`.

## Deliberately preserved

`convex/schema.ts` is byte-for-byte unchanged from the branch's base: every historical table definition and index remains compatible with existing deployment data. No data deletion, migration, table drop or deployment was performed. Old executable endpoints are gone; old stored data is inert compatibility data. Current `eclipse*V1` saves and credentials are untouched.

`shared/eclipse/aiLegacy.ts` and `aiLegacySimulation.ts` are frozen current-game benchmark opponents, not the retired roguelike. They and AI regression evidence remain. Existing journal backward compatibility and browser-storage preservation tests remain. Historical plans/evidence under `coding_agents/` are audit artifacts, not executable old gameplay.

## Verification

- Full `npm run lint`: zero errors and warnings after removal; no lint rules disabled to achieve this.
- `npm run build`: Convex codegen, TypeScript and production build pass. Generated backend API lists only current modules.
- Focused route/saved-games/error-boundary tests: 8 passing; separate launcher regression: 1 passing.
- Follow-up Vite build passes with the invalid `[file:line]` CSS warning eliminated. Remaining advisory output concerns Browserslist age and the existing lazy renderer/fixture chunk sizes.
- Parent owns the final combined full-game test batches and browser acceptance after its simultaneous action/upgrade work.

## Risks and rollback

Removed source and old assets remain recoverable through Git history. Do not restore old endpoint modules as an incidental rollback of a current UI change. Dropping old database tables or deleting historical user data would require a separately scoped migration. No runtime compatibility promise remains for the retired game; its bookmarks lead to the current menu.
