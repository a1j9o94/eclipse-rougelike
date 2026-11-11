# Hosted preview verification — 2026-11-11

Deployed application commit: `f82664c572ef58339c1264b12e05b333390ba3c5`.

Preview: https://eclipse-rougelike-kvgzgpvw3-obleton-adrian.vercel.app/

Vercel deployment: `dpl_2n2kJBfKAGbq7woWeJoFvRHCL3A3` (preview, READY).

## Configuration repair

The former preview endpoint `posh-ant-187.convex.cloud` returned HTTP 404 to a read-only query and the app remained connecting. The current live endpoint returned HTTP 200 to the same query. A Vercel `VITE_CONVEX_URL` override scoped only to `feature/maintainability-preserve-play` now uses that current backend. This is a frontend preview sharing the live backend, not a separate staging database. No backend code was published, no existing player games were opened, and no production frontend was deployed. The user authorized temporary preview sharing; the expiring access token is not committed.

## Hosted checks completed

- Home connected and enabled New game.
- Created a new guest test match, leaving existing games untouched.
- Build: selected interceptor, selected a legal home sector, confirmed cost of three materials.
- Accepted result: materials 4 → 1, two interceptors in the sector, four remaining affordable actions, Saved status, and “1 piece deployed to your galaxy.” feedback.
- Reload preserved resources and both ships.
- Done building advanced the AI turns; the board returned to the player's next action with newly explored sectors.
- Inspected application error logs: no application errors observed during this smoke test; browser-extension metadata errors were present.
- Independent adversarial reviewer checked home and Settings at actual 1363×936: native modal, visible/readable controls, final Follow AI control reachable, Escape/close/backdrop dismissal and focus restoration passed. No settings changed or matches opened by that reviewer.

Evidence: `verification/hosted-build.jpg` and `verification/hosted-settings-bottom.jpg`.

## Limits

Hosted verification was a desktop Chromium smoke test, not full-game or cross-browser certification. DevTools device emulation was blocked by the managed browser; ordinary window resize did not change the viewport. The landscape chooser remains covered by the prior local visual review, not a new hosted mobile check. Physical devices, the complete automated browser matrix, and remaining short-landscape Build/Research layout issues are still outstanding as documented in `maintainability_delivery.md`.
