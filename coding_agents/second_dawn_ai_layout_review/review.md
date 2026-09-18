# AI status row layout review

Reviewed eight actual rendered screenshots: research, blueprint editing, combat allocation and build planner at 1366×768 and 1440×900. Files are captured by `tools/second-dawn-ai-layout-review.mjs`, with dimensions/scroll containers recorded in results.json. No screenshot baseline updates.

- Build: modal, ship quantity controls, prices and confirm/cancel all fit at both sizes. Status row behind modal does not reduce usable planner height.
- Research: resource/effect cards readable; main content scrolls and inspector remains available. First row at 768px begins near lower edge, consistent with stacked researched technology summary. No horizontal overflow.
- Blueprint editing: at 768px, initial viewport shows editor identity and hardpoint section heading but no actual slot cards above sticky Confirm/Reset footer. Slots and parts tray remain reachable by normal main-panel scroll. A browser click selected Slot 2 and its Nuclear Source component successfully. At 900px the first slot row is visible. Suggested refinement: reduce idle status/header footprint for low-height displays.
- Combat: at 768px Confirm choice is initially partly below the main-panel viewport, but normal scrolling reveals it. Tested allocation of the Interceptor target, scroll into view, and unobstructed trial click on Confirm choice. At 900px confirmation and explanatory text fit without scrolling. No workflow is blocked.
- Status labels correctly say Your turn after root's controller-label fix. Combat status row currently says Choose your next action even during an allocation decision; main header and decision panel correctly say Combat/your decision.

These are agent inspection and task checks, not human playtest evidence. Root informed of low-height blueprint and combat first-view issues; no app layout edits performed by reviewer.

## Revision and final review
Root authorized a CSS-only refinement. The status row now uses a ~35px footprint with 12px text and explicit button sizing. At ≤800px height, blueprint identity/header spacing is smaller (40px decorative silhouette), hardpoint heading margins are compact, and combat workspace spacing reserves its confirmation row. Component names, effects and action text are retained.

Browser TDD check `tools/second-dawn-short-layout-check.mjs` failed first (no slot pixels visible) and now passes: first blueprint card has 107px of 126px visible, including name and effects, and combat Confirm choice is completely within the main panel with 10px to spare. Logs: `coding_agents/logs/second_dawn_short_layout_red.out` and `_green.out`.

Recaptured all eight images. Actually reviewed the four 768px views plus 900px blueprint/combat after changes: blueprint slots/effects now visible immediately; combat confirm no longer clipped; research gains space; build remains fully usable. Lower rows/parts tray remain normal scroll content. Root also corrected combat status narration to Your decision / Resolve the current choice.
