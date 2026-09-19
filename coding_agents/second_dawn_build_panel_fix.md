# Build planner visibility — 2026-09-19

## Outcome and acceptance criteria
Opening Build from a collapsed sector inspector displays the shipyard, its piece controls and confirmation footer immediately. The map remains usable for deployment. Hiding/reopening details preserves the order, and mobile keeps its existing build workspace.

## Diagnosis and fail-first checks
The desktop build CSS assigns `height: 100%` to every direct inspector div. The newly added Close details row matches that selector, consumes the available height and pushes the planner beneath the inspector's clipped viewport. React still renders the planner, so DOM-only tests miss the visual failure.

Add a real-browser regression starting with details collapsed, opening Build and verifying the header, first piece control and footer bounds fall within the inspector. Also verify hide/reopen preserves the draft and map placement remains usable. Chromium and WebKit desktop checks must fail before the fix; mobile is a regression check.

## Implementation plan
Give the inspector body and content explicit layout classes. In desktop build mode, use a flex column with a natural-height close row and a shrinking, bounded planner body. Scope desktop rules away from mobile; avoid broad selectors that size every div identically.

## Risks and rollback
This affects inspector layout only, with no rule or persistence changes. Verify other inspector modes still render normally and build cancellation/hide/reopen work. Revert the layout commit to roll back.

## Validation
Pending fail-first browser reproduction, bounded spatial/build tests, full lint and production build. Publish through main's Git integration after checks.

## Results
Fail-first browser run reproduced the clipped build header at 1366×768. After the layout fix, all six Chromium/WebKit cases pass at 1366×768, 1440×900 and 390×844: desktop controls and footer start within the visible inspector, toolbar hiding returns full width to the galaxy, and reopening retains the placed draft. Mobile's existing scrollable workspace and Details reopening remain usable. No page errors or horizontal overflow. Desktop screenshots reviewed for readable controls and a visible confirmation footer.

All 22 targeted build/spatial/choice tests pass. Full lint, TypeScript checks and production build pass; existing Vite large-chunk/Browserslist advisories remain. Final browser tool lint and diff check pass. No backend changes or saved-game migration.

The newly requested command-center build shortcuts are explicitly deferred until this fix is published, per the user's instruction.
