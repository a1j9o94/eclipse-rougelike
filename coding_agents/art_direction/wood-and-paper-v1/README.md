# Wooden galaxy, paper actions — first asset studies

User outcome: establish specific, reusable visual references for a carved wooden galaxy with sculpted spaceship figurines and an illustrated-paper interface on a captain's desk.

Accepted direction: the board is wood; actions and management areas are paper. Ships are three-dimensional figurines. The user requested sprite-sheet-like studies, one or two whole-board views, and multiple play areas with particular attention to combat. This set provides three component sheets, one whole-board view and combat plus research/blueprint workspaces. No game renderer or existing assets were replaced.

## Images and exact prompts

| Study | Contents | Prompt |
| --- | --- | --- |
| [Sector tiles](sector-tiles.png) | Six carved planetary/environmental hexes in a 3 × 2 grid | [Exact prompt](sector-tiles.prompt.md) |
| [Ship figurines](ship-figurines.png) | Twelve miniatures in three material/silhouette families, four classes per row | [Exact prompt](ship-figurines.prompt.md) |
| [Paper actions](paper-actions.png) | Six illustrated action cards, 3 × 2 | [Exact prompt](paper-actions.prompt.md) |
| [Whole board](whole-board.png) | Carved galaxy and figurines surrounded by paper controls | [Exact prompt](whole-board.prompt.md) |
| [Combat](combat.png) | Physical fleet confrontation, dice, paper fleet sheets and Roll/Retreat | [Exact prompt](combat.prompt.md) |
| [Research and blueprint](research-blueprint.png) | Illustrated technology cards and modular paper part installation | [Exact prompt](research-blueprint.prompt.md) |

All six images were generated using the built-in image tool. The wooden tile sheet was the material reference for figurines and paper; the workspace compositions reuse those references for consistency. Originals remain in the image tool's output directory; these copies are the repository references.

## Visual review and limits

All six rendered images were inspected. Wood relief, miniature volume, restrained faction markings, ivory paper, charcoal technical drawings and upper-left lighting read consistently. The combat scene makes opposing ships and the two choices prominent; the blueprint example keeps installation choices next to the ship. The overall board demonstrates the material split, rather than adding paper textures to the existing navy panels.

The inline image previews displayed painted RGB backgrounds, but the exported component PNGs contain genuine alpha. Read-only PNG scanline decoding verified transparent margins and substantial fully transparent regions for all three sheets, with alpha ranging from 0 to 254. **These are alpha-bearing asset studies, not yet sliced production sprite atlases.** Preserve the originals; a production pass still needs individual sprite bounds, edge/halo review, consistent camera/scale and compositing checks. The three full-workspace concepts are opaque PNGs.

Generated names, faction emblems, fleet groupings, dice faces, connections, population symbols and interface numbers are illustrative. They must never become catalog or rule data. In particular, the three figurine rows explore visual families, not approved official faction-class mappings. The whole-board inspector includes invented world descriptions; the production inspector must use actual public game state. The Improved Hull and Gluon Computer example effects were checked against `shared/eclipse/parts.ts`, but costs and all interactive labels remain engine-driven in production.

Before integration: reduce excessive carving where it competes with miniatures/population, test ownership and wormholes at normal map zoom, provide clean paper surfaces without baked labels, and verify the complete six-player board at desktop and mobile scale. Camera and spacing in these compositions are artistic references, not browser usability evidence. No human approval of a particular sheet is assumed.

## Acceptance and verification

- Delivered all six requested studies, including a whole board and three play areas (combat, research, upgrading).
- Confirmed PNG signatures, chunk CRCs, image-data decompression, dimensions and unique SHA-256 hashes using Python standard-library read-only checks. See [validation.json](validation.json).
- Artifacts and prompts are preserved separately; no live app assets or rules changed.
- Full repository lint, TypeScript and production build passed. Existing large-chunk and stale Browserslist advisories remain. No gameplay tests are appropriate to a documentation/raster-only change.

Rollback: remove this study directory; production code and deployed game behavior are unaffected.
