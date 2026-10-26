# Header navigation repair — October 26, 2026

Outcome: players can open Preferences and economy details from an aligned header, see turn order and affordable action count without opening details, scroll the right inspector to reach confirmation, and continue from a completed battle to its pending choice or upkeep.

## Shared contracts

- Toolbars own their spacing. Content-level disclosure margins must not shift toolbar controls or their menu entries.
- A menu's ancestor must not clip its surface. Responsive layout must fit or wrap while preserving pointer and keyboard access to the full menu.
- Turn order is persistent game context. Show a compact ordered strip with active and passed states; keep the detailed roster available for inspection.
- Every completed activity has a visible handoff. A retained battle scene must not hide the pending map decision or its commit controls.
- Bounded panels own a scrollable content region and reachable commit; no nested container may silently clip choices.
- The round summary leads with additional actions affordable. Gold/income/upkeep math is deliberate inspection: double-click for pointer users, native keyboard access retained.

## Fail-first evidence and acceptance

The browser reproduced the reported regression at 1920×1080: Table & activity and History centers were y=40, while Game tools and Round end were y=52. The tools menu occupied y=74–214 but pointer hit tests reached the galaxy beneath it because the header used `overflow: auto hidden`.

Acceptance checks cover desktop and mobile widths, including the actual 1023px compact-layout boundary and the older 760px CSS boundary: equal toolbar alignment, no horizontal page overflow, menus that do not resize the header and remain clickable, Preferences opening by pointer and keyboard, reachable economy inspection, and turn order visible with the detailed roster closed. Check an active activity as well as the idle board.

Additional report: the completed battlefield retained the encounter layer during a spatial aftermath choice. That layer hid the sector-control inspector while rendering the map beneath the battle, leaving only “Battle complete.” Three new integration cases failed before the repair: desktop/mobile handoff to sector control and explicit continuation from a reputation result to upkeep. The handoff must reveal the next workspace without automatically submitting a game choice or collecting income.

Final steering before release: reproduce non-scrolling inspector with long sector-control content and exercise a real wheel scroll through confirmation; restore the earlier affordable-action headline rather than replacing it with round-end gold. These gates are added to the same release.

Scroll regression reproduced at 1366×768: Confirm was at y=989–1058, below the inspector ending at y=768. The inner body had `overflow:auto` with `overscroll-behavior:contain`, but no bounded height or scrollable range, so wheel events stopped there instead of scrolling the parent. The same defect appeared at 1024×600 and the tablet layout. Acceptance requires genuine wheel movement in the content region while the confirmation remains visible.

The same check on ordinary Influence with transfer details expanded also reproduced the trap: its planner grew to 711px inside a 630px body, leaving the commit below the viewport. The finite-height contract therefore includes structured Build/Move/Influence/Colonize wrappers as well as postbattle control.

## Decisions, risk, and rollback

Fix toolbar spacing and overflow in their owning styles, rather than adjusting individual buttons or increasing a clipped menu's z-index. Reuse authoritative turn ordering; do not alter game rules or persisted state. A new compact strip changes available phone workspace height, so verify map and commit areas against the measured workspace. Revert this release commit to roll back; previous production is `9b1cb31`.

## Verification

- Full ESLint and required Convex codegen, application/engine TypeScript and Vite build passed.
- Latest integrated navigation batch: 25 tests across battle continuation, turn-order strip, mobile shell and upkeep summary. Combat/persistent-scene companion batch passed 14 tests; settings and existing roster/pass-order checks passed separately. Counts overlap and are not summed.
- Actual browser pointer handoff passed at 360, 390, 761 and 1366px: completed battlefield → Continue → sector-control options → Confirm. The emitted command matches the pending choice; navigating alone submits nothing. A consecutive spatial choice stays on the map instead of repeating the completed battle.
- Additional authoritative check: 12 accepted engine commands from `ancient-combat` produced the actual postbattle control decision. Browser Continue → Place influence disc → Confirm succeeded at all four widths, transferred sector 303 to the player, and advanced to discovery. This found a redundant mobile Return control; its fail-first regression now ensures the battle footer owns the sole continuation before handoff.
- Mobile workspace checks: Build, fitting, Colonize, Move, Influence and ancient-part commits remain visible above navigation, with no page errors or horizontal overflow. Header is 73px and turn strip is 48px on phones; spatial panel heights now follow measured workspace bounds. Desktop and mobile screenshots inspected.
- `npm run test:second-dawn:header` passed 24 cases at 360, 390, 761, 1023, 1024, 1366, 1920 and 3320px (normal, active Research, and shortfall). Pointer and keyboard Preferences/Game menu access, hit testing, fixed header height during open disclosures, alignment, and persistent turn order all pass. No page errors or horizontal overflow.
- The final header suite also checks the restored affordable-actions headline and its requested double-click interaction: one pointer click leaves gold details closed, double-click toggles them, Enter/Space open them, and Escape closes. Related forecast, navigation and summary tests pass 17/17 without changing economy mathematics.
- `npm run test:second-dawn:inspector-scroll` exercises real wheel input on ordinary sector information, long sector-control choices, and ordinary Influence at 1366×768, 1024×600, 761×900, 390×844 and 360×740. All 15 workflows reach the content end; control and Influence confirmation stay visible and succeed through the authoritative engine. Desktop control now has a bounded 428px body for 732px of content instead of an unbounded scroll trap. Influence uses one content scroller, including its sector lists; the 1366px body is 516px for 763px of content.
- Final integrated source passed 30 tests across battle continuation, turn order, mobile shell, persistent combat shell and settings, plus the full lint/build gates. Browser layout comparisons for Build/fitting and spatial planners were repeated after inspector ownership changed.
- History and upkeep Command Center regression checks also passed. The Command Center test exceeded its 5-second limit during concurrent browser/build work; its isolated rerun with a 15-second allowance passed without source changes.
- Release uses the repository's already authorized Git-triggered Vercel deployment; final production evidence is stored under ignored `coding_agents/logs/`.

## Follow-ups

No new backend rules or migrations. This repair verifies the reported navigation paths; the broader human playtesting requirement from the visual-play plan remains separate.
