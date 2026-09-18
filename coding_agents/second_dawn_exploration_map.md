# Exploration on the galaxy

Outcome: place a revealed sector in its real galaxy location, inspect who controls its neighbors and what they contain, and recognize the new sector's planets, Ancient defenders and rewards before committing.

Acceptance: render the full public galaxy with only the already-revealed candidate added at the saved exploration coordinate; preserve all persisted legal rotations and Draco choices; show Ancient defenders, typed planets/advanced marks, VP/discovery/artifacts/portal features without opening a disclosure; allow neighbor inspection with faction names and typed fleet cards; keep rotation/place/discard usable on desktop and phone. Newcomers can identify the destination and contents; experienced players can inspect neighboring forces and choose their wormhole orientation under unchanged rules.

Implementation:

- `createExplorationMapView` returns a new public view containing the candidate sector and its printed Ancient defenders. Original sector/ship arrays, ownership, population, decisions and game state are untouched. It accepts only a saved drawn tile and an integer orientation.
- `ExplorationDecision` uses the production `GalaxyBoard` with a persistent candidate outline, pointer/touch/trackpad camera behavior, full-map Fit and a Focus new sector control. Neighbor selection opens shared `SectorFleet` and `SectorPlanets` inspection. Faction names/emblems replace numbered player descriptions.
- A compact visible contents strip uses planet/resource icons, advanced stars, neutral ship silhouette/count and reward symbols. The detailed inspector remains available without a planets/features disclosure.
- Saved legality remains authoritative. Source ownership/sector are named in the verdict; connection details retain paired/generator/portal/closed status. Rotation inspection remains possible offline; commitment remains disabled.
- Camera framing runs once after the SVG is measured, fits candidate/neighbor hex extents and caps intended tile size/zoom. Later pinch/pan is never overridden. The helper has an explicit framing regression test.
- Parent integration gives exploration the full desktop workspace and removes its redundant location callout/outer inspector. Desktop footer controls stay in the available height; phone controls stay above bottom navigation.

TDD and verification:

- New immutable-view/content/neighbor tests failed before implementation. A later camera-fit regression also failed before its helper was implemented.
- `npx vitest run --maxWorkers=1 src/__tests__/second_dawn_exploration_map.spec.tsx src/__tests__/second_dawn_exploration_visual.spec.tsx src/__tests__/second_dawn_exploration_preview.spec.ts`: 12 passed. Includes all six rotations, exact commits, disabled/offline behavior, both Draco draws, faction fleets and immutable preview.
- Changed exploration components, helper, tests and browser script pass ESLint.
- `node tools/second-dawn-exploration-map-review.mjs`: passed at 1366×768, 1440×900, 1920×1080, 390×844 and 360×800. Six rotations, visible placement/rotation/discard controls, no horizontal overflow, visible contents strip, actual map selection and neighboring faction/ship inspection.
- Captures and machine-readable results: `coding_agents/second_dawn_exploration_map_review/`. Reviewed rendered 1366, 1920 and 390 Ancient captures for candidate/neighbor framing, icon readability and footer overlap. Initial review exposed a clipped desktop footer, obscured phone map and excessive zoom on tall desktop screens; final captures reflect the corrections.

These are automated browser and agent image-review findings, not physical-device or human newcomer/expert playtests. On compact maps the contents strip and full inspector provide detail while the galaxy retains zoom-dependent symbols; pinch/Fit/Sectors remain available.

Risks/rollback: this is presentation-only and uses a derived public view; it never mutates the authoritative game or commits while inspecting. Reverting exploration rendering and its parent layout restores the prior diagram without a migration or save change. Legacy browser scripts expecting the old static `img` role should target the new `region` named `Exploration placement preview`.
