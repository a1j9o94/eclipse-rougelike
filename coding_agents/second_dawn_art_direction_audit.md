# Art direction discussion audit

Status: discussion only; no game components or shipped art changed. The user selected an illustrative, slightly fantastical charcoal direction, like an adventurer's or ship captain's guidebook. One generated concept study is preserved at [captains-atlas-study.png](art_direction/captains-atlas-study.png). It is an artistic reference, not a rules-accurate mockup or a production board. The generated annotations/hex contents are decorative. Preserve charcoal/graphite, limited washes and captain's field observations; keep live costs, stats and action labels in readable printed type. No broad app redesign starts before this concept discussion concludes.

## What the current game actually contains

Reviewed the current local Round 4 galaxy and active-combat preview at 1440×900, plus rendered faction-picker, empire/fleet and combat-ready review images. The feedback is supported by the asset inventory: `public/second-dawn/galaxy-atmosphere.png` is the only game raster illustration (1536×1024). The other public image is `ufo.svg`. There are no faction environment paintings, ship renders, planet textures or illustrated technology/discovery assets in the shipped asset tree. Downloaded faction source boards are reference material, not integrated game artwork.

The galaxy image supplies the landing background, galaxy backdrop and a very faint repeated sector pattern. Sector worlds are four radial gradients, chosen by tile number modulo four. Fleets are original vector hull outlines with flat plating, cockpit and engine marks. Six ship design families exist; the four expansion species currently alias those families. Combat has recorded firing/impact effects, but the ships remain small marks inside stacked rectangular panels. The 3D dice have much more physical presence than the fleets they represent.

This explains the gap: most of the illustration lives **behind** the game. The objects the player explores, builds and fights with still look like interface symbols. More portraits inside the same panels would leave that underlying problem intact.

## Highest-impact direction changes

1. **Make sectors places.** Give playable hexes environmental compositions: bodies with believable lighting, ancient installations, orbital silhouettes and restrained starfields. The board backdrop should recede so the explored galaxy carries the visual interest. Keep wormholes, ownership, population and fleets in a crisp independent layer; atmospheric details must not falsely imply resources or legal connections.
2. **Make ships collectible objects.** Retain the recognizable faction silhouettes but give them convincing volume, material, propulsion and scale. Eridani craft could share angular imperial construction; Mechanema could feel assembled and modular; Planta could feel grown. Use the same ship identity in Build, the map, blueprints and battle, with simpler silhouettes at distant zoom. Owner color remains a separate marking, not the entire hull material.
3. **Make combat a scene.** Put the opposing fleets in the same pictured space, using the sector environment behind them. Ships, weapon travel, impacts and wrecks should be the principal visual composition; roll/retreat and allocation controls support that scene. Existing manual tactical choices and authoritative outcomes remain intact. This is a presentation change, not automatic combat.
4. **Give each civilization a visual culture.** A coherent combination of architecture, ship construction, environments, emblem treatment and materials should identify a faction before its name is read. Faction selection can feature a small illustrated civilization scene with its fleet, rather than another grid of equal-size rectangles. Portraits may help later, but are not the core solution.
5. **Choose one physical graphic language.** The repeated navy rounded panels, thin gold outlines and generic controls currently make every activity look similar. A painted space-opera direction could pair rich art with restrained, tactile pieces: technology tiles, influence markers and blueprint sockets. Keep numeric information clean and untextured. Avoid mixing photographic backgrounds, flat clip-art fleets, decorative neon HUDs and unrelated portrait styles.

## Direction to discuss

**Painted space opera with tactile board-game pieces** is the strongest starting proposal: broad lighting and atmospheric color, tangible ships, distinctive alien cultures, with a clear playable layer. It supports the physical board-game feeling and remains readable on mobile. This does not mean worn parchment, fantasy ornament or fake wood everywhere.

**Cinematic realism** would emphasize plausible materials, restrained color and dramatic scale; it needs equally convincing ships and environments throughout. It could feel powerful, but a photographic backdrop alone is precisely the mismatch already present. Neither direction is selected by this audit; the user's discussion determines the next step.

## Smallest meaningful visual proof, after direction is agreed

Produce one coherent board-and-battle concept: a selected ancient sector, an Eridani cruiser and an Ancient ship, shown both as pieces on the galaxy and at battle scale. Include the actual wormhole/ownership layer and actual Roll/Retreat controls in the composition. This tests whether the art survives contact with the game, rather than approving a standalone attractive illustration. Review at desktop and mobile sizes before expanding the asset set.

If approved, that same vertical slice would integrate through:

- `GalaxyBoard.tsx` and `game.css`: environmental hex composition and quieter backdrop.
- `ShipSilhouette.tsx` / `factionShipDesigns.ts`: shared detailed ship art with the existing vector fallback for small marks.
- `BattleOverview.tsx`, `CombatTurnDecision.tsx`, `CombatDecisionVisuals.tsx`, `battleOverview.css`: the same fleet/environment art in the actual battle workflow.
- Proposed assets: `public/second-dawn/art/sectors/ancient-world.webp`, `public/second-dawn/art/ships/eridani-cruiser.webp`, `public/second-dawn/art/ships/ancient.webp`, with transparent ship cutouts and a small typed art manifest. These are proposed names only; no assets exist yet.

Acceptance for that proof: a newcomer recognizes a place, two different fleets and the available battle decision without reading a paragraph; ownership, legal connections and tactical numbers stay legible; an experienced player can still inspect exact capabilities; the board and battle look like the same game. Artistic appeal needs the user's review, separately from browser correctness. No wider redesign or asset production should begin before agreeing the direction.

## Further direction under discussion

The user preferred an illustrated atlas, then proposed a different main-board framing: a 3D blue holographic war table with generals/politicians around a model of the universe. Discussed low three-quarter perspective, volumetric planets/ships, restrained camera with overhead option, faction ownership accents within a blue projection, advisers as peripheral scenery, and combat expanding the same table sector. Atlas illustration could serve discoveries/records as separate in-world documents. Neither a hybrid nor a 3D renderer rewrite is approved or implemented; continue the art-direction conversation first.

A second built-in generated study is preserved at [war-table-study.png](art_direction/war-table-study.png), with the exact [prompt](art_direction/war-table-prompt.md). Its physical-table atmosphere and projected volumes support the user's proposal; the low cinematic angle and decorative model contents would need a separate interaction proof before implementation. Both concepts remain discussion references.
