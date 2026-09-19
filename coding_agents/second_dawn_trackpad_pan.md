# Two-finger galaxy panning

Outcome: scroll in two dimensions over the galaxy to move the map without clicking and dragging; pinch still zooms around the cursor.

Acceptance: horizontal/vertical wheel deltas pan by their screen distance at every zoom; pixel, line and page units are normalized; outside-map scrolling remains native; Safari pinch and pointer gestures retain exclusive control.

Fail-first: updated ordinary-scroll expectation and added zoom-scaled pan test; both failed before implementation. Changed the existing non-passive map listener to translate ordinary wheel input into camera movement. No global listeners, game commands or sound effects were added.

Verification: 14 gesture/mobile regression tests pass; Chromium and WebKit browser checks verify actual two-axis wheel input, unchanged zoom, cursor-anchored pinch, outside-map event handling and Safari duplicate suppression. Lint and production build pass. Existing Browserslist age and bundle-size advisories remain.

Risks/rollback: ordinary mouse-wheel input over the map also pans, following the same scroll convention. Revert the gesture listener/test change if needed; no save or backend change.
