# Eclipse development

Preserve the player experience: rules, valid choices, action count, drafts, queued acknowledgements, camera, visible feedback, sound and saved-game compatibility. Read [the maintenance plan](coding_agents/maintainability_plan.md) for the current refactor and [the UX plan](coding_agents/second_dawn_ux_iteration_plan.md) for product work.

## Work and verification

- Major work belongs on a `feature/` branch. The current task authorizes a Vercel **preview only**, after independent adversarial evaluation. Do not merge or deploy production as part of this task.
- Read package.json scripts before running release commands. `npm run build` is a non-publishing frontend build; `build:release` publishes the configured live Convex backend and is a release operation.
- `npm run check:quick` checks lint, scoped formatting, actual project types, tool tests, and the focused UI suite.
- `BROWSER_BASE_URL=... BROWSER_BASELINE=... npm run check:full` additionally runs every discovered Vitest file in isolated memory-safe batches, builds frontend assets, and runs browser checks against a separately captured baseline.
- Run required checks to completion. Missing browsers, empty inventories, skipped required tests, failed screenshots, or unavailable baseline evidence are incomplete, never green. Do not weaken an assertion to hide a regression.
- Keep one test batch running at a time. The full suite is supported through `npm test`; avoid launching the entire legacy suite in one long-lived worker.
- Add meaningful characterization tests before changing behavior. Do not add tests that merely mirror implementation.
- Format touched refactor modules using the scoped formatter. Keep unrelated mass formatting out of behavior changes.
- Limit concurrent implementation/review agents to three. Give disjoint file ownership. An implementer cannot be the sole reviewer of their own work.

## Ownership

- `shared/eclipse/`: authoritative pure rules, legality, costs and outcomes. UI extraction must not move rules into React.
- `ActionDraftProvider`: persisted drafts, screen/action, selection and camera. Preserve storage shape and keys. Do not mirror them into another store.
- `second-dawn-game/board/`: presentation coordination, navigation operations, command routing and receipt feedback, map and encounter lifetime. Keep narrow typed interfaces; no giant replacement context.
- Existing action planners: draft-specific interaction and confirmation. Distinguish live and next-turn projected inputs.
- `NativeDialog`: browser-owned modal focus/inertness/cancel lifecycle. Public shared-map inspection is nonmodal.
- `mobileBoard.css`: responsive shell, sheet and footer. Keep real map geometry measurements; avoid measuring layout if CSS establishes the same bounds.
- `second-dawn.css`: desktop board structure; `visualPlay.css`: visual treatment; feature stylesheets own feature content. Check cascade order before consolidation.

## Browser and review policy

Use stable Chromium, Firefox and WebKit with native `dialog.showModal` support; no popover/anchor-positioning dependency. Record exact tested versions. A release requires representative phone, short landscape, tablet and desktop coverage, actual breakpoint checks, keyboard/focus, hit-testing and scroll-to-final-control checks. Engine emulation is not a physical iOS/Android check.

Open baseline, candidate and difference images. Check readability and occlusion as well as DOM presence. Never use force-click to dismiss a covered control failure. Preserve before/after fixture seeds, storage and semantic command traces. Capture negative controls proving the gates detect type errors, changed pixels and missing/covered controls.

Record outcomes, failures, environment limitations and release readiness in `coding_agents/`. Test credentials and user save data must not be committed. Use disposable test matches for backend integration. A partial review must be labeled partial; passing unit tests alone does not establish unchanged gameplay or responsive UX.
