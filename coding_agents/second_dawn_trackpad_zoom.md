# Mac trackpad map zoom — September 18, 2026

Outcome: pinching a Mac trackpad over the galaxy zooms the game map around the pointer, while the surrounding page and ordinary scrolling retain browser behavior.

Acceptance: Chromium ctrl-wheel pinch and Safari cumulative gesture events zoom the map; duplicate gesture streams do not apply zoom twice; limits and existing camera controls remain unchanged; touchscreen pointer pinch and tap/pan suppression continue working. A newcomer can pinch the map immediately; an experienced player can inspect a border precisely without losing their pointer anchor. Physical Mac user feedback remains the experiential validation step.

Implementation: `useGalaxyGestures` installs SVG-scoped non-passive native wheel/gesture listeners. Wheel delta units are normalized to pixels, zoom is exponential and uses the existing anchored camera helper/clamps. Safari gesture start establishes a cumulative scale baseline. Matching ctrl-wheel events are suppressed during a Safari sequence and for its short 100 ms tail. Listeners read current camera/viewport/callback refs and are removed on unmount. No rules, commands, authoritative state, or persistence behavior changes.

TDD: `second_dawn_trackpad_zoom.spec.tsx` initially reported 3 failing tests (missing wheel interception/zoom, bounds, and Safari events) and 2 passing guard checks. All five now pass, alongside six existing pointer camera tests. Covered ordinary wheel events, pinch outside the map, pointer anchoring, line/page deltas, clamps, cumulative Safari scaling, duplicate events, consecutive events and cleanup.

Verification:

- `npx vitest run --maxWorkers=1 src/__tests__/second_dawn_trackpad_zoom.spec.tsx src/__tests__/second_dawn_galaxy_gestures.spec.ts`: 11 passed.
- `npx eslint src/second-dawn-game/useGalaxyGestures.ts src/second-dawn-game/GalaxyBoard.tsx src/__tests__/second_dawn_trackpad_zoom.spec.tsx`: passed.
- `npm run typecheck:eclipse`: passed.
- `node tools/second-dawn-trackpad-review.mjs`: Chromium and WebKit both passed map-only wheel zoom, browser scroll outside the map, ordinary map scrolling, Safari fallback and duplicate suppression. This dispatches DOM events against the actual opening fixture; it is not physical trackpad validation.

Risks and rollback: Safari and Chromium expose different native streams. Scoped cancellation plus explicit stream ownership avoids page zoom/double application. Revert the gesture-hook change and GalaxyBoard ref wiring to restore prior pointer/button behavior if a platform-specific regression appears. Preserve the tests/evidence for diagnosis.

Decision: use native listeners rather than React `onWheel` because passive browser listeners cannot cancel page zoom. Existing touchscreen gesture state remains separate and takes priority while a pointer gesture is active. No new browser-dependent game rules or global listeners.
