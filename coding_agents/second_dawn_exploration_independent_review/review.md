# Independent exploration placement review

Reviewer: board_revision agent, independently inspecting the root agent's ExplorationDecision implementation. This is model/browser review, not human usability evidence. No UI code edits were made during the review.

Executed the actual opening-three route through Fit → legal frontier selection → Confirm action, then rotated the drawn tile through all six orientations at 1366×768, 1440×900 and 1920×1080. Captured 18 images (`WIDTHxHEIGHT-rotation-N.png`). No browser page errors or horizontal overflow occurred. Tile207 was legal at rotations0,1,3 and illegal at2,4,5. Visible connection marks and source list changed consistently with those verdicts; the allowed case correctly showed one connected exploration source while another neighbor remained closed.

The new seven-position hex layout communicates the drawn tile, neighboring tile identities and source direction clearly. Paired versus closed edges have check/cross marks in addition to color. At1366 the small in-tile source caption is secondary to the readable connection notes, which repeat its meaning.

**Blocking finding sent to root:** placement/discard buttons fall below the main panel's clipping boundary at1366×768 and1440×900. At1366 legal buttons occupy y712–753 while the panel ends at688; the legal verdict is also partly covered by the footer. At1440 buttons start at821, below the820 boundary. At1920 all controls and verdict fit. Initial checks.json `visible` fields measure the browser viewport only, not ancestor clipping; the actual rendered images establish this finding. Root must fix visible placement controls and verdict before acceptance, then recapture.

Keyboard navigation verified on the newly available real exploration fixture: rotate left → rotate right → sector features summary → Place sector → Discard sector. Each focus target has a visible3px outline; keyboard.json records the sequence. Focusing the lower buttons scrolls them into view, but that is not a substitute for visible initial placement controls.

## Re-review after the root layout correction

The root moved placement verdict/actions to the top of the right connection column and made the illustrated stage fill the available panel height with rotation controls anchored below it. Re-ran opening-three through its real action workflow and the recorded exploration fixture at all three sizes, rotating all six orientations: 36 combinations. Verdict, Place, Discard and both rotation buttons now fit all clipping ancestors. The previously blocking issue is resolved. Updated legal/illegal rendered images were inspected at1366×768,1440×900 and1920×1080; source identities, check/cross connection marks, verdict and controls are legible and unobstructed. The long explanatory connection notes may scroll at laptop height, while placement controls remain visible.

Persisted `tools/second-dawn-exploration-review.mjs` performs these workflows and asserts clip-aware bounds against every overflow ancestor, not merely the viewport. It also verifies all six orientations and keyboard rotation focus, reports browser errors, writes fixed-checks.json, and captures twelve representative images. The script passes all36 combinations and scoped ESLint. It does not update screenshot baselines. Run with `node tools/second-dawn-exploration-review.mjs` while the local UI serves127.0.0.1:5175.
