# Panel navigation cleanup — September 19, 2026

## Outcome and acceptance

Navigation belongs beside a panel's title. Players can leave an inspection without hunting through scrolled content, and settings have one clear exit. Meaningful action controls (confirm, cancel a draft, return a ship to the tray, change a departure sector) retain their behavior.

This slice covers movement header controls, settings and public score/history inspection. The parent integrates the departure callback in SecondDawnBoard and consolidates diplomacy's galaxy navigation into the choice header.

## Changes

- `MovementPlanner` accepts optional `onChangeSource`. “Change departure sector” appears inside its header next to the separate Close operation. Header controls wrap for narrow inspectors. Standalone callers without the callback remain supported. This changes no selected ships, queued routes, submission behavior or action costs.
- Settings removes the redundant bottom “Back to game” button. Its original accessible Close control, Escape handling, focus restoration and immediately saved toggles remain. The header stays visible while long content scrolls.
- Public score/history inspection retains its existing header Close, now sticky with a solid background and stacking above its scrolling content. Mobile padding is accounted for. CSS targets the direct public-inspection header; FleetInspection's existing sticky header is unaffected.

## Verification

- Fail-first component run: 2 failed / 2 passed (`coding_agents/logs/panel_navigation_cleanup_red.log`). Failures captured the absent movement header callback and duplicate settings exit before implementation.
- Final targeted batch: 35/35 tests across the new navigation cases, movement planner, public inspection and action-draft persistence (`panel_navigation_cleanup_green.log`).
- Chromium exercised real React Settings/PublicInspection components at 1440×900 and 390×844. Settings used appended long descriptive text solely to force scrolling; score inspection used a deterministic crowded owned-sector fixture. Before the fix both header exits scrolled out of view at both sizes. Afterwards all four header exits remain inside the visible dialog after maximum scroll. JSON measurements and actual reviewed screenshots are under `coding_agents/panel_navigation_cleanup_review/` (`before-results.json`, `after-results.json`). Normal settings captures are included separately from the scroll stress fixtures.
- Reviewed images: mobile settings has a legible title and visible Close at maximum scroll; mobile and desktop public inspection maintain a readable solid header above the content and map. These are rendered geometry/accessibility checks, not a user playtest.
- Full lint/build results are recorded in `panel_navigation_cleanup_lint.log` and `panel_navigation_cleanup_build.log`; parent runs final integrated gates after Board wiring.

## Risks and rollback

Changes are presentation-only and the new movement prop is optional. Reverting the scoped header CSS restores the former scroll behavior without changing saved game state. No engine rules, modal focus traps, fleets or command semantics changed in this slice. No commits or deployment performed by the sub-agent.

## Parent integration
The Board now wires Change departure sector into MovementPlanner's header and removes its former floating button. Diplomacy uses one View galaxy button in ChoiceWorkspace's persistent header, sharing the existing minimize behavior and preserving selections; the body duplicate is removed. The existing map, offline inspection and post-combat ambassador paths remain covered. Toolbar Return to inspector replaces the content-level button, while the existing Show/Hide sector details toggle replaces Close details.
