# Maintenance preview review

Baseline: `cb6c932cc11ad30487a23862256f3aef5c2d650f`. Branch: `feature/maintainability-preserve-play`.

## Implemented

1. One native dialog lifecycle now serves game dialogs, preferences, fleet inspection and standalone public inspection. Shared-map inspection stays nonmodal. Existing panel contents/classes remain.
2. Mobile sheets use their workspace's CSS bounds rather than React-measured viewport offsets. Upkeep/colonization derive available height from the workspace size container. Redundant measured-offset overrides were removed.
3. The board composes shell/header/roster/workspace/inspector, navigation, map/inspection coordination, command routing/feedback, and encounter modules. `ActionDraftProvider` still owns persisted state. Action-specific planner wiring remains in the board coordinator; this is not a replacement state store.
4. Canonical test discovery validates executed files and rejects missing/skipped tests. Typecheck checks actual projects. Builds do not publish a backend; Vercel preview builds explicitly take this safe path. Strict decoded PNG comparison includes missing-file failures and diff artifacts.
5. Pinned scoped formatting and concise ownership/verification/browser guidance replace contradictory instructions.

Additional user-authorized correction: in short landscape the expanded action chooser uses the area below the resource HUD. It temporarily hides the turn-order strip and bottom navigation, which return on close/collapse/selection. No gameplay choice or extra confirmation was added.

## Independent challenges and fixes

- Gameplay reviewer reproduced lost build/move completion feedback after a lost-response retry. The same full-board test passed the baseline and failed the refactor. Restoring prior-receipt identity correlation fixed it; three independent regression tests then passed.
- Visual reviewer found the chooser close button covered by the HUD after removing measured CSS variables. A stale override was removed; normal sheet bounds and close-button hit testing were reverified.
- Architecture reviewer found a missing-image false-green path and transient render hazards. Missing baseline/candidate images now fail, and render hazards were corrected.
- Short-landscape chooser content grew from 29px to 197px at 568×320, and from 36px to 261px at 844×390. All eight choices are reachable through ordinary scrolling. Close/collapse, Build and Research selection were checked independently. Portrait and the 550/551px boundary were checked.

See the three adversarial review documents for methods, observations and limits.

## Evidence and honest limits

- Original suite: 311 files / 1,857 assertions passed.
- Final candidate suite: **316/316 files, 1,876 assertions, zero skipped**, complete. Node tools: 7 files / 23 assertions; Python: 1 file / 4 assertions. Lint, scoped format check, actual project typecheck and nonpublishing frontend build passed.
- Tool execution summaries, discovered inventory, and exact assertion counts are in `verification/`.
- App/tool/shared typecheck and the nonpublishing production frontend build were run. Backend typecheck passed during implementation. Standalone test-source typing is an explicitly exposed diagnostic: the baseline already has 545 legacy fixture/type errors; it is not represented as passing.
- Shared rules and Convex source are unchanged. A real browser build journey through piece selection, sector placement and confirmation emitted exactly the same command, legal-command output and resulting engine state in both checkouts; both show completion feedback.
- Chromium was exercised through the shared browser using isolated, correctly sized iframe viewports. The initial shell was inspected at 21 anchors; action/decision DOM text matched for nine workflows at three sizes. Wide/tall overview screenshots are scaled to fit the shared surface and are not full-resolution pixel certification. Some rapid stream captures showed a preceding frame; those are not accepted as checkpoint proof. The independent review screenshots and explicitly settled build/chooser captures are the reliable visual evidence.
- The local Playwright runner cannot launch Chromium because this environment disallows its local socket; an escalation request was rejected. The bundled Chromium download was also invalid and WebKit lacks runtime libraries. The complete automated Chromium/Firefox/WebKit screenshot gate has **not** passed. It fails rather than silently skipping.
- Physical iOS/Android, real browser zoom, soft keyboards/safe areas, full-game multiplayer/reconnect, and all motion/audio combinations have not been validated. No claims of complete UX equivalence across every device are made.
- Remaining baseline issue: downstream Build/Research workspaces and initially hidden map controls can still be cramped in very short landscape. This change fixes the action chooser specifically.

This is a test-branch review candidate, not production acceptance. Production deployment and a merge to main are outside this task. Hosted verification found that the old preview Convex URL returned 404. A branch-specific Vercel override now points this frontend preview to the existing live backend. No backend publication was performed. See `hosted_preview_review.md` for the successful hosted smoke test and remaining limits.
