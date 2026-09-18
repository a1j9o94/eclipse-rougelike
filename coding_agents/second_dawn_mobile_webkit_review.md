# Safari-engine mobile review

## Scope

Installed Playwright WebKit 26.6 and ran the actual app's isolated review fixtures at 390×844 and 844×390. `tools/second-dawn-mobile-webkit-review.mjs` supports local Vite and the live alias via `SECOND_DAWN_SITE_URL`; `SECOND_DAWN_REVIEW_DIRECTORY` separates captures. No cloud state or player identity was changed.

This is desktop WebKit with mobile viewport/touch emulation, not physical iPhone/iPad or installed Safari testing. Native touch taps, list selection and navigation are exercised. Playwright WebKit exposes native tap but no public native swipe/pinch API; its pan check uses synthetic touch-pointer events, separately from native mouse drag. Chromium's real CDP multi-touch coverage remains documented in the galaxy review.

## Evidence

- Opening, research, blueprints, combat and final scoring render at both sizes with no horizontal document overflow or page errors. Scrollable views expose lower content and confirmation controls. Native taps select sectors and list entries; navigation retains the camera. Both local and live initial runs passed these checks.
- Rendered portrait research, blueprint and scoring images were reviewed. Effects/resources are legible; portrait scoring shows all six ranked factions. Landscape research and combat require vertical scrolling because persistent status and navigation reduce content height. Scrolled combat shows the target and confirmation within the content area.
- Visual inspection found a browser-specific defect missed by initial functional assertions: WebKit's native Civilization selector rendered only 20px tall despite the intended 44px minimum. Added a failing browser assertion and recorded `coding_agents/logs/second_dawn_webkit_select_red.out`. The shell agent added explicit appearance, height and a visible chevron; the full local suite now passes including the 44px assertion (`second_dawn_webkit_select_green.out`). The corrected rendered control was reviewed directly. Live rerun of this strengthened assertion awaits the final CSS deployment.
- Existing Chromium desktop short-layout regression at 1366×768 passes: the first blueprint slot exposes 107px and combat confirmation ends 9.9px above the main-panel edge. A separate research render confirms effects and prices are readable; scrolling 22px exposes the entire first technology card. No document overflow.

Initial artifacts: `coding_agents/second_dawn_mobile_webkit_review/` and `coding_agents/second_dawn_mobile_webkit_live_review/`. Harness lint passes. The results are automated browser evidence plus agent visual review; no new user playtest or hardware Safari evidence is claimed.
