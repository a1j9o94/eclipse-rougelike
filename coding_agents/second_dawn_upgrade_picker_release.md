# Slot-first ship upgrades — September 19, 2026

## Outcome
On desktop and phone, selecting a blueprint slot opens a focused, scrollable component picker. Choosing a replacement returns to the same visible ship draft; the player reviews changes and deliberately applies the upgrade once.

## Acceptance criteria
- No catalog shown until a slot is selected; picker names the ship, slot and current component.
- Available components expose visual statistics, effects and acquisition/copy information, with function filters; locked components explain their requirements separately.
- Selecting updates only the editable draft and closes the picker without committing. Escape/Close preserve the draft and restore focus to the selected slot.
- All ship classes remain usable; class changes preserve each draft through the existing draft provider. Mobile does not collapse the ship or require alternating scroll between ship and catalog.
- Reactor balance, installation capacity, valid installation ordering and final Apply upgrade confirmation remain enforced.
- Ancient copies cannot relocate or duplicate; replacing installed Ancient parts warns about permanent removal on confirmation; original slot draft undo is available. Outside-grid components remain supported.

## Tests to fail first
Slot-triggered modal, Escape/focus return, choose-and-return without submission, function filtering, all four classes, capacity/energy gating and Ancient restoration/stock behavior. Browser review covers mobile size, viewport fitting and scrollable catalog. Parent owns the board-level collapse diagnosis and integration.

## Risks and rollback
Only presentation and draft behavior change. Authoritative blueprint validation, upgrade planning and inventory selectors remain the source of legality. Revert the editor/picker presentation if needed; saved matches and engine commands have no new shape. No browser layout screenshot alone establishes human usability.

## Decisions and results
Implementation and verification pending.

### Implemented editor and picker
- The editor keeps its slot canvas and final confirmation; the full inline catalog is removed. Slot taps open `UpgradePartPicker` in a viewport-level dialog so the map/workspace does not jump to a distant catalog.
- Functional filters and a scrollable available-parts grid expose visual stats and concise effects. Current part/class/slot remain above the catalog. Unavailable parts explain their requirements in a disclosure.
- Choosing a part updates only the draft and returns focus to the same slot without scrolling it away. Choosing the already-effective printed component makes no unnecessary installation. Close/Escape preserve the draft. Modal keyboard focus stays inside; page scrolling is restored on close.
- Existing inventory and authoritative validation/planning are reused. Stored copies reserve in the draft; reset releases them. Installed Ancient replacement warns about permanent discard on Apply, original-slot restoration remains possible, and relocation stays blocked. Permanent outside-grid components remain visible.
- All four class designs, changed stats, reactor balance and installation-capacity feedback remain. Final Apply is disabled for invalid or excessive drafts; no extra review acknowledgement was introduced.
- Short landscape layouts compact nonessential help and preserve the scrolling catalog. Mobile header places the title on its own row so enlarged text cannot push Close offscreen.

### Verification
- Failing-first picker tests reproduced absent dialog/focus workflow, plus an unnecessary installation when selecting an already-active printed component.
- 30 focused tests across picker/editor/fitting inventory/draft persistence/class navigation pass (`coding_agents/logs/upgrade_picker_final_tests.out`). They include all four classes, Escape/focus return, functional filtering, no premature commit, reactor/capacity rejection, Ancient warning/reservation/reset and original-slot restoration.
- Changed editor/test/browser-script files are ESLint clean. Application TypeScript passed during implementation; parent handles final combined build and broad suite.
- Actual Chromium: 1440×900, 390×844, 360×800, 844×390. Actual WebKit: 390×844, 360×800, 844×390. Picker bounds, inner scroll, focus restoration and no page errors/horizontal overflow pass. Both engines also passed a 422×195 popup-only layout stress (opened at a usable board height, then resized).
- Both engines rendered actual doubled text at 390×844. Review found the initial Close button clipped beside a long enlarged heading; fixed grid placement/wrapping and re-reviewed final images. This is scripted text enlargement, not a physical device or human playtest.
- Final browser images and machine results: `coding_agents/second_dawn_upgrade_picker_review/`; repeatable local-only script `tools/second-dawn-upgrade-picker-review.mjs`. Parent owns board-level direct Upgrade entry, mobile handoff and final integrated review.
