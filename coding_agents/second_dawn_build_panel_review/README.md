# Build panel browser regression

The initial Chromium 1366×768 check failed on actual production components: Build header clipped outside inspector. The screenshot `chromium-1366-before.png` shows the oversized Close details row consuming the panel. Red log: `coding_agents/logs/build_panel_browser_red.out`.

After the parent CSS fix, `tools/second-dawn-build-panel-review.mjs` passes six deterministic local fixture cases: Chromium and WebKit, each at 1366×768, 1440×900 and 390×844. Desktop assertions require the build title, Add interceptor and footer inside both the inspector and viewport immediately after opening, without scrolling; Close details row stays under 80px. Both the close control and toolbar Hide/Show sector details work, hiding restores full galaxy width, and a placed interceptor remains ready to confirm after planner reopening.

Mobile retains the existing scrollable layout below the galaxy. Add/place and Close planner → Details reopening preserve the ready order, and the footer is accessible after scrolling. Mobile does not claim initial viewport visibility for every control. The test does not submit a command or change cloud data.

Actual before/after desktop and WebKit mobile placement screenshots were inspected. The desktop blank panel is resolved; fleet cards and header are readable and the footer stays within the panel. Mobile's scrolled ready-order screenshot shows the deployment, cost preview and enabled confirmation above navigation. No document overflow or page errors in any case. This is agent browser review with touch emulation, not physical-device or user playtesting. Script ESLint passes. Full machine measurements are in `results.json`; final log is `coding_agents/logs/build_panel_browser_green.out`.
