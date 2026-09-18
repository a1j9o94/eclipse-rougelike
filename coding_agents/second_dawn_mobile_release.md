# Mobile Eclipse release — 2026-09-08

Outcome: play the same saved Second Dawn matches through a portrait-first browser interface, with touch galaxy navigation, full-screen tasks, recoverable local drafts and shared cross-device activity acknowledgment.

Branch: `feature/second-dawn-mobile`, inherited from the existing full-game feature work. Prior dirty/untracked files and all deployed saves were preserved. No game engine, faction/rules catalog or hidden-state contract was replaced.

## Delivered

- Compact Galaxy/Empire/Players/Activity navigation and persistent turn, resources, income, round-end upkeep and next-action projection. Current-action confirmation and return to a pending decision remain accessible. Desktop uses its existing layout.
- Touch pan and anchored pinch, safe taps, visible zoom/Fit and 44px sector-list targeting. Camera survives navigation, rotation and refresh. Sector/AI sheets share one inspector and leave room for map controls.
- Full-width research, blueprint, trade, combat and reward tasks; native full-screen shipyard on compact layouts. Visual faction choice links directly to its effects. All six action flows and representative uncommon decisions execute through the actual shared engine.
- Typed per-match/per-seat local drafts with explicit stale review and current legality checks. Only an accepted authoritative receipt clears matching unchanged choices, including duplicate recovery. No private pending-choice payloads, credentials, PINs or recovery codes are persisted in drafts.
- Public “Since you last played” / “Recent activity” recap, with authenticated monotonic ownership read markers outside GameState. Foreground/socket recovery refreshes authoritative state and disables submissions until current. Saved profile ownership works across devices; unconfirmed drafts remain local to their browser.
- Automatic read-only AI action sheets, manual-inspection protection, motion/follow controls and a reachable mobile AI-failure retry. Existing solo games remain untimed.

## Validation and findings

See the final gate logs `logs/mobile_release_final_tests.out`, `logs/mobile_ai_scroll_build.out`, `logs/mobile_release_scoped_lint.out` (plus `logs/mobile_ai_scroll_lint.out`). Full repository lint retains the pre-existing 88 errors/12 warnings (`logs/mobile_final_repo_lint.out`); changed game/session/backend code is lint-clean. The production build includes TypeScript and Eclipse checks. Memory-bounded batches were used instead of the full legacy suite.

Reviewed screenshots cover 360×800, 390×844, 430×932 opening/research/blueprints/combat; opening/midgame/late at those sizes plus 844×390; all 12 uncommon decision/scoring positions at the three portrait sizes. Additional reviewed captures cover the launcher, trade, catch-up, real cloud gameplay,200% text emulation, landscape, keyboard confirmation and WebKit.

Fixed observed defects: collapsed exploration diagram/connection notes; peek sheet covering map controls; awkward same-revision draft resume; prematurely cleared drafts; recovered duplicate receipt clearing; missing mobile rejection/AI-retry feedback; cramped trade columns; text/budget/navigation overlap under enlargement; clipped inspector headings; undersized native WebKit selection; AI opening over manual inspection. Browser checks were rerun after fixes rather than silently accepting new baselines.

The six-action workflow harness verifies actual new engine history entries. The uncommon-decision harness completes control, bankruptcy, portal placement, reputation, resource/population allocation, discovery→ancient part, retreat and diplomacy, verifying revision advances and 44px reachable confirmations. Three-size trade tests verify resource changes. Actual development-Convex browser tests cover mobile solo creation, exploration draft refresh, confirmation, AI activity, second-device sign-in, catch-up and shared explicit acknowledgment.

Chromium CDP tests dispatch real browser touch sequences for pan/pinch/tap/cancel. WebKit26.6 checks native taps, selection and navigation in portrait/landscape; its touch-pan test dispatches synthetic PointerEvents and is labeled accordingly. Desktop research/blueprint/combat regression passed. These are automated tests and agent visual review, not human search-time measurements or physical-phone evidence.

## Deployment and remaining validation

Use the existing Vercel aliases and the approved development Convex deployment `ideal-nightingale-55` (`https://ideal-nightingale-55.convex.cloud`). Read markers were deployed additively before the first mobile preview. Early mobile preview: `dpl_Dg8y5ipPyuRSRMxUdYBAZm1GUYFM`. Final deployment and live verification are appended below.

Android hands-on feedback was requested after the early preview became available. No physical Android/iPhone test results have been supplied in this session. Physical safe areas, software keyboards, browser chrome and OS text settings therefore remain a user-device validation item. Browser gameplay is delivered; native apps, install/PWA and push notifications remain deferred as planned.

## Evidence index

- `second_dawn_mobile_plan.md`: outcome, acceptance, design decisions and rollback.
- `second_dawn_mobile_shell_validation.md`: action workflows, screenshots, enlargement and keyboard.
- `second_dawn_mobile_galaxy_review.md`: real touch, camera and independent draft walkthrough.
- `second_dawn_mobile_drafts.md`: typed persistence, stale review and receipt recovery.
- `second_dawn_mobile_resume.md`: ownership markers, foreground recovery and real cloud tests.
- `second_dawn_mobile_webkit_review.md`: Safari-engine evidence and desktop regressions.
- `second_dawn_mobile_pending_workflows/`: uncommon decision commands and screenshots.
- `second_dawn_mobile_decisions_review/`: all portrait decision/scoring captures.

### Post-deployment interaction regression

A live gameplay check after manual-AI-inspection protection found that the protection also suppressed automatic AI following after the human finished a turn. The fix listens to a fresh accepted human receipt, restores following, and returns direct turn-completion commands to Galaxy (or the outstanding decision). It does not infer acceptance from revision changes or override inspection when another AI begins acting without a human acknowledgment. A failing-first regression now covers both behaviors, paired desktop follow remains green, and the actual cloud mobile exploration→end action→AI workflow passed locally before redeployment. The live harness now checks the visible AI peek control and opens its actual details, rather than relying on a DOM node alone.

The final rendered AI sheet review also found inherited scroll position hiding its action title. Compact AI sheets now reset both inspector and inner-body scroll when opening/changing AI actions. The failing-first regression,14 focused AI/mobile tests, changed lint, production build and actual cloud browser flow passed after correction. The browser runner additionally asserts the action heading is below the visible sheet header. The last full bounded batch passed 497 tests across 100 files; the subsequent scroll-only adjustment received the targeted 14-test gate and another production build.


### Final deployment and live gate

Final Vercel deployment: `dpl_CnmZLVfkwiBF3sy1vjUCuJYAv7j3`, **Ready**. Immutable URL: `https://eclipse-rougelike-g40wooem1-obleton-adrian.vercel.app`. Public alias: `https://eclipse-rougelike.vercel.app/`; preview: `/#second-dawn-preview`. Backend remains the approved development Convex deployment. Confirmation log: `logs/mobile_vercel_complete_inspect.out`.

The final deployed browser flow passed mobile solo creation, authoritative untimed-solo check, exploration draft reload, rotated/discarded exploration, turn completion, visible automatic AI peek, expanded read-only action details and action-title visibility below the sheet header (`logs/mobile_complete_live_play.out`). Cross-device resume and explicit marker sharing passed on the deployed mobile release (`logs/mobile_final_live_resume.out`). Strengthened live WebKit ten-screen checks passed (`logs/mobile_release_webkit.out`); subsequent changes were the targeted React AI-follow/scroll corrections. No application changes remain pending. Physical Android/iPhone feedback remains the declared validation limitation, not evidence supplied by these browser runs.
