# PR 94 local deployment recovery — 2026-10-09

## Result & Next Steps

The original dirty main checkout was preserved. A separate worktree integrated PR 94 head 3176ffca766a6b03d0e55d08f1b642fd83d19aeb with origin/main 8b87eed. Source merged automatically; both conflicting documentation entries were retained.

The first deploy from the older PR head failed schema validation because stored eclipseRoomSeatsV1.faction contained bobiverse. No records were deleted or validators disabled. Integrating current main preserved all seven newly released sci-fi factions. An existing catalog regression assumed an exhaustive 18-entry registry; it now verifies the original 18-entry prefix. Dedicated sci-fi profile tests verify the expansion.

Validated with Node 22.23.3: 112 targeted tests across 13 suites passed (catalog rerun separately after its test-only correction); lint, full build and Convex typecheck/codegen passed. Node 26.9.0 caused localStorage failures in the first local run; no product change was made for that runtime issue.

Backend source commit: 056b7c0. Explicit target: dev:ideal-nightingale-55. No deployment-key or self-hosted overrides were set. Convex schema validation completed and reported “13:24:24 Convex functions ready! (4.74s)” on October 9, 2026, America/Chicago. Read-only deployed function-spec confirmed https://ideal-nightingale-55.convex.cloud and public eclipseMatches.js:queueCommand mutation.

The compatible backend is published. Continue in the browser session with merge of the updated PR 94 and verification of the canonical Git-triggered Vercel deployment. Main was not merged locally. No browser playtest is claimed here.

A concurrent main update (607939e, sector structure artwork) arrived before handoff. Integrated it without source conflicts, preserving both planning entries. Its changes do not modify convex/ or shared/eclipse/ relative to published backend commit 056b7c0. Revalidated lint, full build/typecheck, and 35 UI/artwork/research tests across five suites. PR branch is updated; browser session should refresh its checkout before merging.
