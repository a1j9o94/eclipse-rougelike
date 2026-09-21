# Upkeep Command Center scrolling

Outcome: players can scroll through their empire while reviewing an unfinished upkeep decision, then return to the same selected sector.

Acceptance: Command Center has native scrolling on desktop/mobile with a minimized bankruptcy decision; selected choice survives navigation; the active galaxy retains its viewport and gesture behavior; browsing submits no game command.

Cause: `.sd-main:has(.sd-map)` locked overflow for every descendant map. Minimized choice dialogs intentionally retain their children, so a hidden bankruptcy map locked scrolling across the Command Center's long content.

Decision: limit the existing map overflow rule to maps directly on the active surface (prototype direct map or full game's board-surface child). Nested, minimized choice maps no longer determine the main panel's scrolling. No game engine or pending-choice behavior changes.

TDD: new `second_dawn_upkeep_command_center_scroll.spec.tsx` loads the real base stylesheet and actual board, selects an upkeep sector, enters Command Center, verifies the hidden map remains but scrolling is `auto`, returns to the saved selection, and checks the galaxy remains `hidden` overflow. It failed first with `hidden` instead of `auto`, then passed. All five `second_dawn_upkeep_research.spec.tsx` cases also pass. An additional existing empire-board test found its independent Settings/Your Turn dialog focus expectation failing; the supervisor was notified.

Browser verification: actual engine/board temporary fixture, agent-browser Chromium at 1366×768 and 390×844. Before the fix, the desktop main panel had 3,818px content in a 342px viewport with overflow hidden. After the fix, native scroll moved the panel to `scrollTop=700` at both viewport sizes while the hidden upkeep map remained mounted. No browser errors reported. Screenshots: `/tmp/upkeep-command-center-desktop.png` and `/tmp/upkeep-command-center-mobile.png`. Temporary source/HTML fixtures removed and browser closed.

Risks and rollback: a small CSS selector change also applies to the prototype's directly mounted galaxy, whose existing direct-map match is preserved. Revert this CSS selector and test together if necessary. No save migration required.

Result & next steps: scroll defect fixed and regression verified; supervisor owns final lint/build and deployment with the independent-settings release.
