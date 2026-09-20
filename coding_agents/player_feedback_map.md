# Map and exploration clarity — 2026-09-19

## Outcome
Players can distinguish actual routes from unpaired sector exits, identify sector ownership and rewards, and rotate an explored sector while viewing its neighbors.

## Acceptance / implementation
- Selecting, focusing or hovering a sector reveals every printed exit on it and all adjacent placed sectors. Unmatched exits elsewhere remain hidden.
- Paired wormholes have solid gold edge gates; unmatched printed openings have white dotted edge gates. Wormhole Generator connections retain a distinct cyan dashed treatment. Geometry and movement legality are unchanged.
- Exploration shows all printed openings and a persistent connection legend. Its verdict and confirmation still use the authoritative legal placement list.
- Frontier targets display Ring I / II / III before the hidden draw, including an accessible ring label.
- Removed decorative planet orbs and map VP numbers. Filled influence discs contain the owner's faction emblem. Population/resource icons remain visible at overview scale when tile size permits.
- Discovery rewards use a compass-star marker; artifacts use a crystal marker and count. `SectorFeatureIcon.tsx` and `sectorFeaturePaths.ts` expose the same artwork to other interfaces.
- Enlarged placement to a minimizable viewport overlay. Resize-aware camera fitting keeps the candidate and adjacent sectors visible. Phone rotation and commit buttons remain together at the bottom; detailed contents remain scrollable.

## Test evidence
Fail-first: four failures for neighbor exit reveal, frontier ring labels, and map component identity/removed decoration. After implementation: **23 / 23 passing** across `second_dawn_map_clarity`, `second_dawn_visible_connections`, `second_dawn_exploration_visual`, `second_dawn_galaxy`, and `second_dawn_exploration_map`.

Scoped ESLint passed. Parent runs final repository lint/build and integration tests.

## Rendered review
Used a temporary local-only harness mounting the real `SecondDawnBoard`, public fixture views and engine command processor. The intentionally removed public preview route was not restored. Harness files were removed after review.

Reviewed actual images:
- `player_feedback_map_desktop.png`: 1440×900, crowded midgame at Fit; ownership discs and component markers visible without planet decoration.
- `player_feedback_selected_desktop.png`: 1440×900, selected Hydran sector plus adjacent printed exits; legend and inspector visible.
- `player_feedback_explore_desktop.png`: 1440×900, drawn Ancient sector, all openings and adjacent sources visible; candidate roughly 133 px tall.
- `player_feedback_explore_mobile.png`: 390×844, candidate roughly 88 px tall, exits visible, rotate and commit controls unobscured.
- `player_feedback_frontiers_mobile.png`: 390×844, Ring I/II/III shown before draw.

Browser checks: rotation switched a legal orientation to illegal with explicit feedback; confirmation stayed in view; no horizontal page overflow; no browser errors. Initial screenshots exposed an overly short placement viewport and mobile feedback overlay obstruction; expanded placement and corrected its stacking before final captures.

These are agent visual/interaction checks, not independent human playtesting. Population labels and small artifact counts intentionally require zoom or inspector on a crowded board. No claim of a full game walkthrough in this slice.

## Risks / rollback
Presentation only, no saved state migration or rule changes. Rollback these component/CSS changes if desired. Revisit very short screens and unusual browser text enlargement in subsequent accessibility review.
