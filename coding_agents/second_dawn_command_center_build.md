# Command-center ship build shortcuts — 2026-09-19

## Outcome
Players can start a ship build directly from their command-center fleet cards, see the faction-specific material price, and understand why a ship is unavailable.

## Acceptance criteria
- Each own ship card has Build + materials icon/cost; opponents have inspection only.
- Disabled buttons explain missing technology, supply, affordable resources, deployment sectors, action capacity or turn/connection restrictions.
- Affordable conversions remain available with an explicit conversion notice; the existing planner retains the funding warning and final confirmation.
- A click adds one unplaced ship to the existing order and opens the existing planner. It spends nothing and never silently selects a sector, discards the order or commits a build.
- Works on desktop and mobile with visible focus, readable disabled reasons, and no overflow.

## Tests (fail first)
Pure option calculation: faction prices, technology/supply/turn/phase/decision/disc constraints, aggregate order cost and activation capacity, conversion eligibility, immutability.
UI: cost buttons, disabled reasons, opponent exclusion, no direct submission, selecting the intended ship in the planner and preserving an existing draft.
Browser: own Empire → Build interceptor → placement → ready confirmation, disabled starbase, mobile equivalent, rendered screenshot review.

## Risks and rollback
Use existing analysis, funding and authoritative commands; shortcut only changes a draft. Rollback the feature commit without migrating saves. Keep the already published blank-panel fix intact.

## Decision log
Reactions remain one activation but require an influence disc, matching the engine and the publisher rules. During shortcut audit we found that the previous reaction UI incorrectly described reactions as disc-free; correct that presentation alongside accurate build availability, without changing engine rules.

## Validation
Pending implementation and bounded tests, lint, production build and browser checks.

## Additional requested inspector cleanup
Remove the redundant desktop Close details row; Show/Hide sector details in the shared toolbar is the single toggle. Move Return to inspector out of AI content into that toolbar, visible only when the AI pane is being shown. Returning focuses the inspector; hiding returns focus to the toggle and remains respected during later AI actions.

Read-only audit identified further candidates: Settings has a footer Back to game duplicating its header close; diplomacy View galaxy duplicates Minimize; Change departure sector sits outside MovementPlanner's header; PublicInspectionModal's header can scroll away. The user subsequently requested all four cleanups; they are now included in this implementation and documented in `second_dawn_panel_navigation_cleanup.md`. Preserve action-specific Cancel/Confirm/Return to tray controls.

## Verification so far
New shortcut UI tests failed three expected behaviors before implementation. The pure helper's 19 tests verify legality/funding and draft preservation. Integrated build/empire/reaction batch passes50 tests; toolbar/AI-follow/choice/shortcut batch passes24 tests. Command-center browser review passes18 cases: Chromium/WebKit at1366×768,1440×900,390×844 across directly funded, conversion-funded and unaffordable states. Screenshots inspected; no horizontal overflow, page errors or unexpected commands. Final toolbar/browser and combined gate evidence recorded below before release.

## Restoring persistent auto-pass access
The user reported Auto-pass unless attacked disappearing. Its prior visibility guard hid it whenever a draft/action was open, and outside Galaxy. It now remains in the shared controls throughout an unfinished game for the living viewer, including open actions, pending choices and empire inspection. Only connection/save state temporarily disables it with an explanation. Saved preference and attack-pause behavior are unchanged.

A preference receipt is no longer mistaken for a committed gameplay handoff. Off-turn preference changes keep the current workspace, and draft data survives the authoritative revision. Two new UI tests failed before this correction and pass afterwards; the control batch passes all five tests. This supersedes the earlier idle-Galaxy-only decision in the prior turn-order audit.

## Final combined gate
Production changes frozen for the complete memory-bounded Second Dawn suite, lint/build and last persistent-control browser review. No backend schema/rule changes; deploy frontend through main only.

## Release acceptance
Complete memory-bounded Second Dawn suite: **910/910 tests,162 files**,148.24 seconds. Full lint, TypeScript and production build pass, with existing Vite chunk-size/Browserslist advisories. Final diff check clean. Browser evidence includes18 command-center cases,4 inspector-toolbar cases,6 updated Build regressions,4 sticky-header scroll checks, and8 persistent-controls scenario results across Chromium/WebKit desktop/mobile. Reviewed actual rendered images; no page errors or horizontal overflow. No physical-device or user-playtest claim.

Final scope includes all four user-approved panel cleanups and a persistent auto-pass checkbox alongside Follow AI/Animations. The latest server-save and pending-choice browser checks use real pure-engine processing: build draft and off-turn empire screen survive preference updates; diplomacy cube choice survives preference save, map inspection and return.

Only frontend presentation/helpers/tests changed. Publish via main's Vercel Git integration; deployment ID/live bundle and hosted checks recorded under ignored `coding_agents/logs/command_center_release_result.json`. Dice sound was discussed as a future enhancement, not added in this slice.
