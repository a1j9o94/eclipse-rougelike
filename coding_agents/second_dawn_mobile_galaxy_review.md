# Mobile galaxy touch implementation

## Outcome and acceptance

Players can move around one shared galaxy using one-finger pan and anchored two-finger zoom, then select a sector without accidental selection after a gesture. Zoom, Fit and a 44px sector/frontier list remain available. Ownership and fleet presence remain visible at overview scale; population and ship-class details appear at closer zoom. A typed world-space camera can persist through shell changes and screen rotation.

## Decisions

- `galaxyGestures.ts` is a deterministic pointer controller independent of React. Pointer conversion accounts for SVG letterboxing. A six-CSS-pixel movement threshold distinguishes tap from pan.
- The SVG captures pointers. Intentional pointer-up invokes its original sector/frontier callback exactly once; the synthesized click is suppressed. Pinch, cancellation and a remaining finger after pinch cannot select a sector. Keyboard and assistive click activation remain available.
- `GalaxyCamera` stores absolute world center and zoom. Optional controlled props preserve camera when the map remounts. Already-consumed Fit requests cannot reset a restored camera; explicit Watch AI must clear the saved camera before requesting Fit when reopening a hidden map.
- Compact rendering removes decorative planet and sector-number detail at overview scale, retaining territory, connections and fleet presence. The list calls the existing public callbacks; it does not calculate separate rules.
- No backend or authoritative state changes. Rollback consists of reverting the map/hook/CSS and camera props while retaining the same callbacks.

## Validation

Pure gesture tests were written before the implementation and initially failed because the module did not exist (`coding_agents/logs/second_dawn_galaxy_gestures_red.out`). Fifteen scoped gesture, map and mobile component tests now pass, covering letterboxing, anchored zoom, pan threshold, pinch/cancel suppression, next-tap recovery, list selection/focus, controlled camera and existing desktop rendering.

`tools/second-dawn-mobile-galaxy-browser.mjs` passed against local Vite using actual production GalaxyBoard and deterministic public fixtures, without cloud mutations. Chromium CDP dispatched real touch sequences for pan, pinch, cancel and tap. The harness verifies no accidental selections, one selection per intentional tap, camera retention through rotation/remount, frontier selection through the list, desktop mouse pan, keyboard sector selection, 44px controls and no horizontal document overflow. Twelve screenshots cover opening/midgame/late at 360×800, 390×844, 430×932 and 844×390; result JSON records the evidence.

Representative opening, crowded late-game and landscape images were viewed directly. Map controls fit, territory remains distinct, and the list provides a larger selection alternative for crowded overview targets. At whole-galaxy scale individual ship-class and planet facts intentionally require zoom or one sector selection. These are automated Chromium results and agent visual review, not a physical iPhone/Safari or user playtest.

Changed-code ESLint passes. Root coordinates the integrated shell walkthrough, memory-bounded overall test gate, production build and deployment. Follow-up: verify real-device Safari pointer behavior and safe areas with user testing after release.

## Integrated shell and saved draft walkthrough

`tools/second-dawn-mobile-draft-browser.mjs` renders the actual Board, action-draft provider, BuildPlanner and pure engine behind an isolated local match identifier. A camera set using Zoom survives Research → Galaxy, portrait → landscape → portrait, and a real page reload. One Cruiser added through Build → Sectors → owned sector survives reload. Advancing the fixture revision disables confirmation and sends no command; reviewing the saved draft enables one legal engine-accepted Build. The warning and fixed confirmation remain readable at 390×844. This test exercises local draft persistence, not cloud persistence.

The first walkthrough exposed a genuine shell defect: the peek panel intercepted Sectors/Fit/Zoom clicks during Build targeting. The shell agent reserved space for that panel; the final harness passes with no dismissal workaround. Independent review of 360px research and combat captures found readable effects, fleet sides and hit choices, with detailed content reached by scrolling. The two-column Build cards and stale-review warning were reviewed from actual 390px screenshots. No unresolved blocker was found in these bounded tasks; broader rare decisions and all-action coverage are recorded by the root and shell agents separately.
