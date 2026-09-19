# History scrolling repair

Outcome: long match history remains readable in the desktop inspector and mobile Activity screen.

Fail-first browser reproduction: a 70-entry log at 1366×768 had clientHeight=scrollHeight=14,349 and bottom=14,602; the inspector clipped it without a scrollable child. The wrappers introduced around inspector content broke its height constraint.

Fix: bound the inspector wrapper chain and mobile Activity flex layout; give the log remaining space with min-height:0 and overflow:auto. Make the log focusable with visible focus and contain vertical overscroll. Existing anchor preservation stays in place.

Acceptance: desktop wheel, mobile Chromium touch, mobile WebKit keyboard scrolling; End reaches pagination; prepending a new action preserves visible row position; older entries append without moving the current view. Browser regression: tools/second-dawn-history-scroll-review.mjs. Relevant history hook/panel tests, lint/build required. No rules or persistence changes.

Validation: fail-first reproduction above, then four browser cases passed (Chromium/WebKit × desktop/mobile), with anchor drift <0.2px and older entries reachable. Mobile Chromium used a real touch gesture; WebKit used keyboard scrolling. Reviewed desktop/mobile captures under .second-dawn/history-scroll. Four hook/panel unit tests passed; full lint/build passed. No page errors. Existing Browserslist/chunk-size advisories only.
