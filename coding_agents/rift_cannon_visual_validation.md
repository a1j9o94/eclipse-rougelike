# Rift Cannon and printed Eclipse dice

Outcome: identify weapon outcomes at a glance in the animated dice, combat allocation, replay and part cards; clearly distinguish damage to opponents from Rift backfire.

## Source and implementation

- User-supplied `/Users/oblet/Downloads/Eclipse2_RC_rules_web.pdf`, page 1, Dice Rules; rendered page inspected in `/tmp/rift-rules-0.png`.
- Standard Eclipse colors: yellow/orange/blue/red print 1/2/3/4 filled bursts on the natural-six face; natural one is blank; two through five use numbers. Unknown legacy weapon provenance retains a neutral numbered six instead of guessing its damage.
- Rift magenta uses two blanks, one filled burst, two filled bursts, three filled plus one hollow burst, and one hollow burst. Internal D6 index remains private implementation detail for the Rift symbols; gameplay retains persisted engine results.
- `dice3d/faces.ts` is the common drawing specification for the static SVG and lazy Three.js canvas textures. Numbered pips were replaced in both renderers. GPU textures/materials are cached per color/face within each throw and disposed with the controller.
- Part, technology and discovery cards explain variable 0–3 damage, ignored computers/shields and backfire. Rift part cards show all six faces. Own-fleet impact cards explicitly say Rift backfire.
- Isolated preview `?position=rift-combat#second-dawn-review` uses the real combat engine to produce a saved three-damage-plus-backfire roll against a shielded dreadnought. It shares production UI and never touches guest saves.

## Behavioral validation

- First test run failed for missing face component/model; implementation made all three face tests pass.
- Backfire-only and own-fleet playback tests failed on missing explanatory text before implementation, then passed.
- Preview fixture test initially exposed the wrong seeded face (six versus five); corrected seed, with actual pending decision asserted.
- Seven scoped test files passed, 34 tests: face definitions, Rift UI/fixture, 3D lifecycle/math, dice integration, volley allocation and volley scene.
- `npx tsc -b --pretty false` and eslint over all changed TS/TSX files passed. Supervisor performs final repository lint/build gates.
- React review: lightweight face model stays outside Three.js chunk; renderer remains lazily loaded; no effects or state added to face components; accessible descriptions accompany printed symbols; reduced motion and disabled animation paths retain outcomes.

## Browser and image review

Verified with agent-browser against existing local server, separate `rift-dice` session. Actual rendered screenshots in [screenshots/rift-cannons](screenshots/rift-cannons/):

- `combat-desktop.png` (1440×900), `combat-mobile.png` (390×844): real preview allocation screen.
- `die-face-gallery-desktop.png`, `die-face-gallery-mobile.png`: production face and part components mounted in a temporary browser-only gallery, not a shipped screen.
- `dice-3d-desktop.png`, `dice-3d-mobile.png`: production renderer with fixed inputs, held after settlement solely to inspect all top faces.

Review found cramped single-die cards on mobile and insufficient spacing between bursts. Changed mobile cards to flex-wrap and reduced multi-symbol burst size. Final images show distinct hollow backfire marks and legible roll/target text, with controls reachable. Browser successfully assigned the three-damage Rift roll to the shielded dreadnought and resolved both enemy destruction and own backfire destruction, then reached upkeep. No runtime/renderer errors in the completed audit (temporary gallery's initial import call was corrected before captures).

This is agent inspection and automated task evidence, not a human playtest or a claim of pixel-identical commercial artwork. The gallery composition is an audit harness; gameplay screenshots show the actual UI. Roll animations remain cosmetic and cannot change dice results.

Capture correction: returning to the identical URL after the temporary gallery did not force a fresh document, leaving the gallery in the final mobile capture. The supervisor caught this during independent image review. Navigated through `about:blank`, reopened the real `?position=rift-combat#second-dawn-review` route, confirmed its combat allocation controls in the accessibility tree, and recaptured both `combat-mobile.png` and `combat-desktop.png`. Opened both resulting PNG files and verified actual Combat allocation, Rift cannon die, Hydran dreadnought target and Resolve volley control; no gallery content remains in these captures.

Rollback: revert presentation files/preview entry independently of engine and catalog additions; original saved rolls remain numeric and unaffected.
