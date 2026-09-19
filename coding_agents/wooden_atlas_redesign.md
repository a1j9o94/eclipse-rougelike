# Wooden atlas — interactive art direction preview

Outcome: play the existing deterministic game positions on a carved wooden galaxy with ship figurines and readable ivory paper workspaces.

Scope: `feature/wooden-atlas-redesign`, isolated review route only. Main and guest/multiplayer presentation stay unchanged. Generated art is decoration; PlayerView owns sector identity, connections, owners, units, population, costs and decisions.

Acceptance criteria: wooden sectors and sculpted class-specific figurines; paper/charcoal research, fitting and combat; accessible real selections and commands; desktop/mobile screenshots inspected; theme comparison retains the current game/drafts. No generated text or shapes imply new rules.

Fail-first tests: figurines appear only within the atlas provider, retain class/faction identification, and leave existing silhouette rendering unchanged outside it. Existing galaxy/review regressions cover state/commands.

Risks: generated sheets explore three families, not a complete official faction fleet library; art density at galaxy scale; shadow gutters and raster bytes; hardcoded old panel colors. Rollback: remove the preview provider/theme; no migrations or authoritative rules changes.

Decision log: preserve alpha originals, render rectangular sprite crops with nested SVG viewBoxes (no raster editing); theme remains opt-in context within review so all existing inspectors reuse their real data. Human playtest approval remains pending.

## Implemented first slice

The review route (`/#second-dawn-review`, also `/#second-dawn-preview`) now starts in Wooden atlas mode. Its toolbar can switch back to the current appearance without resetting commands or drafts. The provider defaults off outside review; live guest/multiplayer routes request no atlas images.

- Real sector geometry carries carved planet relief plus engine-driven faction borders, emblems, population, ships and connections. The atlas begins fitted to the galaxy; existing wheel/pinch/pan controls remain intact.
- Shared ship art renders sculpted class-specific figurines in the map, inspectors, fitting and combat. Ancient/Guardian/GCDS identities remain available to assistive technology.
- Paper surfaces, ink typography, ruling and warm borders unify research, fitting, component-picker portals, sector information and combat. Research commits locally on the selected card; mobile fitting uses the existing component popup.
- Combat presents opposing figurines and actual capabilities above allocation. Mobile sides share a row; scrolling/manual hit assignment remain available. Existing dice animation/settings remain intact.

Source sheets are unmodified copies of built-in generation studies, about 5 MB combined. CSS background crops inside bounded SVG foreignObjects retain alpha. Generated art supplies no game text, exits, resources or numbers.

## Review findings and fixes

Actual Chromium/WebKit rendering exposed and resolved:

1. Nested sheet images initially bled outside the SVG viewport. Clipping stopped visual bleed, but group hit boxes still included the complete sheet. Bounded foreignObjects/CSS crops fixed visual bounds and ordinary pointer targeting; the browser walk clicks sectors without force or dispatched events.
2. Gold text/dark panels inherited from the current theme became unreadable on paper. Research prices, card headings, roster markers, upkeep warnings, fleet/planet labels and popup dialogs now use ink contrast.
3. The mobile fitting header retained a 38px art column while the new figurine was larger. Reserving a 90px column prevents title/eyebrow overlap.
4. Tall stacked mobile combat fleets hid the active choice. Compact side-by-side cards and a non-sticky disabled commit reveal dice sooner while retaining information in the scrollable choice.

These are engineering visual reviews, not user approval or playtest evidence. Opening/midgame/late map, research, selected research, fitting, part popup, mobile inspector and combat images were inspected. Parent independent review identified the same fitting overlap and additional VP/roster contrast issues; these were corrected before the final artifact set.

## Validation

- Fail-first atlas test failed with the missing provider/module; all three isolation/accessibility tests pass after implementation.
- 33 focused tests pass across atlas art, galaxy, mobile galaxy, sector fleets, blueprint editor and research workspace.
- Full lint, Convex codegen TypeScript, app/shared TypeScript and production build pass. Existing large-bundle and stale Browserslist advisories remain; no dependency changes.
- `node tools/wooden-atlas-review.mjs` and `ATLAS_BROWSER=webkit node tools/wooden-atlas-review.mjs` each pass 14 screenshots and four workflow checks. Viewports: 1440×900, 1366×768 combat, 390×844.
- Browser workflows: buy Improved Hull and find the research history entry; install/apply Hull on mobile; switch theme twice retaining the fitted ship; select/expand a sector through the map; assign the recorded natural-six hit and resolve the volley. Both engines report no page errors or document horizontal overflow.
- React review: context defaults false, hooks unconditional, no derived-state effect, art decorative inside named controls, static asset paths/typed faction/class boundaries, no gameplay effect.

Artifacts: [Chromium results](wooden_atlas_screenshots/review.json), [WebKit results](wooden_atlas_screenshots/webkit/review.json). Images are review evidence, not automatically accepted baselines.

## Next art slices / explicit limits

This is an interactive direction preview, not a completed full-game visual replacement. The fleet atlas offers three study families, so several factions share silhouettes until faction-specific models are approved. At whole-galaxy scale ships remain small; true tabletop piece scale, quieter tile relief and art density need human review. Mobile overview retains the compact fleet-count marker and reveals classes on zoom/inspection.

Research/parts use existing functional symbols on paper. Dedicated charcoal technology/component drawings, richer desk props, tactile action cards, ownership-colored miniature bases, remaining dialogs/scoring/lobby treatment, texture compression, and physical-device/enlarged-text playtests remain later work. The older archived combat fixture lacks weapon metadata; the Active combat shortcut now uses the current engine-generated Rift fixture instead of inventing labels for that recording.

No changes to rules, AI, catalogs, database schema, credentials, hosting configuration or main. No merge/deployment performed.

## Integration with released Rift dice and upkeep

Merged `origin/main` at `c41626a` into the atlas feature branch after the initial art commit. This inherits the released Rift rules/catalog, accurate standard/Rift dice and upkeep colonization entry; the art work itself changes no authoritative rules. Both append-only documentation conflicts were resolved by retaining the entries from both branches. No atlas changes were merged to main or deployed.

The Active combat shortcut and screenshot harness now use `rift-combat`, the authoritative engine-generated three-damage/one-backfire volley against a shielded dreadnought. The magenta die retains clear white damage/backfire symbols on paper, and its description states damage, self-damage and shield bypass. Actual Chromium/WebKit desktop/mobile images were reviewed; there is no numeric six or unknown-weapon placeholder in this showcased battle.

Integration validation: 23 focused atlas/Rift UI/die-face/3D-dice tests passed; both 18-result browser walkthroughs passed again, including manual Rift hit allocation; lint, TypeScript and production build passed. The earlier 33-test art regression batch remains recorded above.
