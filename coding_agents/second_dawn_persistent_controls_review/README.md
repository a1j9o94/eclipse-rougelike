# Persistent settings and diplomacy navigation browser check

All four Chromium/WebKit × 1440×900/390×844 combinations pass both deterministic scenarios (8 results). The harness mounts actual SecondDawnBoard and applies set-auto-pass through the pure command processor, then sends the actual accepted revision/type receipt back to the Board. It does not write to cloud matches.

- Build starts with desktop details collapsed; after adding an unplaced Interceptor, the toolbar checkbox remains visible and usable. Saving enabled auto-pass preserves the planner and its unplaced piece.
- Own Empire keeps the checkbox available. After an injected opponent turn, saving the disabled preference retains the Empire workspace, the saved build draft, and the opponent's active seat. Only the two expected preference commands were submitted.
- During the recorded ambassador exchange, exactly one View galaxy button appears in the choice header and no duplicate Minimize button exists. The selected Materials cube survives an actual preference save and galaxy/return navigation. No decision submission occurs.

Twelve screenshots captured; actual desktop Build and mobile Empire/diplomacy return images inspected. Persistent toolbar controls remain readable, mobile wrapping fits, and the selected cube remains visible after returning to the decision. The decision's inner scroll position is retained. No page errors or document overflow. This is agent browser review using touch emulation, not physical-device or user playtesting.

Evidence: results.json; tools/second-dawn-persistent-controls-review.mjs; coding_agents/logs/persistent_controls_browser.out. Script ESLint passes (persistent_controls_browser_lint.out). No production files were edited by this reviewer.
