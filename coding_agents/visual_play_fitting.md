# Visual play: fitting and spatial workspaces

Outcome: let the visible ship, piece, route, or territory change lead the action; retain the relevant object while selecting and committing its change.

## Implemented

- Build: empty orders contain pieces and an Add piece cue, without a zero ledger, error list, forecast, or Build 0 control. Embedded exits belong to ActivityDock. Compact mode switches from catalog to placement after adding; Add piece deliberately reopens the catalog. Existing placements stay intact. Order cards carry unplaced/invalid markers; aggregate materials appear on the single shared CommitBar. Funding choices and retained-invalid-payment correction continue to use authoritative options.
- `BuildPlanner` exposes `compact` and `onStageChange('catalog' | 'placement')`; `data-build-stage` identifies the current presentation. The root shell owns map height and target hit-region acceptance.
- Fitting: `FittingSummary` places the selected hardpoint, energy, allowance, live capabilities, and changed capabilities above the workspace. Mobile uses a horizontal hardpoint strip and independently scrolling component list. Integrated editors have no local Close, Undo, or reset row; ActivityDock owns those scopes. Selected-slot restoration remains next to the slot. Standalone use retains local Undo and a named reset menu.
- Ordinary and discovered-part fitting share the summary, hardpoints, and normal-flow commit arrangement. Permanent Ancient loss remains visible. Blocked reward slots can receive focus/tap to explain their exact constraint without selecting an illegal candidate. Unavailable ordinary components remain inspectable.
- Movement: embedded Close removed, one compact activation supply, ship/route objects lead, compact cost and betrayal/transport consequences beside the commit. Finish action is offered only with no staged route, avoiding competing commitments. Route editing/reordering and staged sibling preservation remain unchanged.
- Influence: removed generic requirements, repeated upkeep arithmetic, and the local reset. Exact territory gains, withdrawal losses, returned population, payment timing, and shortage warnings stay with the selected sector above disc-source choices. The shared footer contains only the commit. Map-connected destination catalogs are collapsed fallbacks; standalone operation remains functional.

## Functional evidence

Fail-first regressions cover empty Build presentation, compact catalog-to-placement transitions, one integrated fitting control scope, selected-slot/stat context and restoration, shared discovered-part context, inspectable blocked hardpoints, embedded Move exit consolidation, and Influence presentation.

Existing behavior suites were updated through the intended controls: ActivityDock-style undo/reset harness, slot restoration, accessible blocked-state inspection, compact cost labels, and retained route state. Tests do not equate a render with layout acceptance.

Bounded regressions: fitting/Build suites passed 60 tests across eight files; the spatial batch passed 29 tests (17 Movement, four continuity, eight Influence), with five unrelated Colonization tests deliberately excluded. A later 24-test Build/new-presentation/Ancient batch passed after capability and reward refinements. A final spatial rerun hit one 5-second continuity timeout under concurrent browser load; its isolated four-test file then passed. The final Influence object-local consequence regression failed first, then passed with the existing presentation check; all eight existing Influence tests passed again. Counts overlap and must not be added together. Changed-source and changed-test ESLint passed after the final source edits. The parent owns the repository-wide lint/build gates.

## Browser evidence

Actual Chromium pointer captures exercised Build empty → add → map placement, ordinary fitting → replacement → scrolling the component list, Move ship → map destination, Influence map target, and discovered-part fitting at 360×740, 390×844, and 1440×900. All 24 final captures had no horizontal page overflow or runtime errors. Influence uses pointer input throughout; a prior nested fleet inspection interception was fixed in the parent-owned map and the final script fails instead of using a keyboard fallback. Separate keyboard-only Add → map placement → Build verified authoritative acceptance and its deployed-piece receipt.

- Build has 246px / 278px of usable phone map after subtracting its 54px tools, meeting the 240px minimum. Commit height is 58px at both phone sizes.
- Ordinary fitting retains the selected slot and capabilities while its component viewport scrolls independently: 152px at 360×740 and 262px at 390×844; commit height is 57px. Full-size desktop component viewport is 298px. Class changes, slot restoration, aggregate allowance, unique-part validation, and accepted-command handling retain their prior functional tests.
- Movement commit height is 59px on both phones. Route editing stays beside the route objects. The narrow route reorder and Build tray remove buttons now have explicit 44px minimum touch dimensions.
- Discovered-part fitting has a 57px phone commit; Store is visible beside the scrolling class choices. The small “Reward fixture” status line in these captures belongs only to the local authoritative test harness.
- Influence's first real-shortage capture exposed a 111px footer that exceeded the smaller-phone chrome target. Moving the consequence strip onto the selected sector resolved this without hiding the warning: final phone footer is 58px, with the sector, +VP, Pay now, Round end, and specific shortfall visible together above it. Header/navigation/commit now total approximately 180px at 360×740, below 25%.

Measurements are recorded in [visual_play_fitting_results.json](visual_play_fitting_results.json). Screenshots are `/tmp/visual-play-{360,390,1440}-{build-empty,build-placement,build-ready,upgrade,upgrade-scrolled,move,influence,ancient}.png`; keyboard acceptance is `/tmp/visual-play-keyboard-build-accepted.png`. The local browser scripts are under ignored `.second-dawn/ux/`.

## Review and limits

React best-practices skill applied: controlled selection, derived legal choices, no new global event listeners, callback notifications only for external stage/preview integration, accessible native disclosures, normal-flow shared footers, and existing draft storage/privacy.

No engine commands, rules, balance, or persistence format changed in this stream. The root owns the shell, map layout/hit regions, ActivityDock, and shared economy timing semantics. Human acceptance remains open until observed newcomer/expert play; agent browser work is visual and functional evidence only.
