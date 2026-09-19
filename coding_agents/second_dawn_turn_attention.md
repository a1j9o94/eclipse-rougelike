# Turn and upkeep attention notice — September 19, 2026

Outcome: a player gets a clear, nonblocking in-game cue when their action turn or upkeep is ready, with an explicit route back to the relevant controls.

Acceptance: initial human-owned load, observed AI-to-human handoff, a fresh same-owner actionTurnSerial, hidden-to-visible return and new match scope are handled. Ordinary revisions do not recreate a dismissed notice. The notice disappears immediately when ownership/phase changes, while disconnected, or behind deliberate decisions/other active overlays. It never steals focus, submits a command, requests browser notification permissions, plays audio or replaces the persistent header status.

## Decision log

The boundary uses public PlayerView.actionTurnSerial, viewer seat, round, phase and matchScope. Root added the optional serial to the public projection. Older views fall back to round/phase and observed effective-owner transitions; an unobserved complete ownership cycle without a serial cannot be safely inferred from a revision jump. Revisions and action progress alone do not identify a new turn.

The component remains mounted across ordinary updates. Dismissal acknowledges the current boundary. A deliberate choice already receiving the player's attention also acknowledges it, so resolving that choice does not produce a stale secondary notice. Hidden or suppressed notices are reconsidered against current ownership when shown again. Rendering guards remove obsolete CTAs immediately.

Both CTA callbacks are navigation only. In particular, onReviewUpkeep must open the action panel and draft without calling activate('finish-upkeep'), which submits immediately. The existing separate Finish upkeep confirmation owns submission. Root owns that integration, the persistent header, and actual command tests.

## Integration contract

Import default TurnAttentionNotice from src/second-dawn-game/TurnAttentionNotice.tsx. Supply view, matchScope (match ID or preview identity), connected, suppressed, onOpenTurn and onReviewUpkeep. Suppress for settings/history/recap/inspection overlays and any other deliberate interaction that should own attention. The component handles public pending decisions and page visibility itself. Keep it mounted so dismissals survive revisions.

Styling is fixed at the lower right, below higher modal layers, with a mobile footer offset, visible keyboard focus and 44px controls. There is no backdrop, forced focus or timer. Removing the component rolls back this presentation feature without changing rules.

## Validation

- Wrote behavior tests first; initial run failed because the component did not exist. All 11 tests in src/__tests__/second_dawn_turn_attention.spec.tsx pass: boundaries, revision dedupe, match scope, visibility/current owner, decision suppression, disconnected/finished/eliminated exclusions, explicit callbacks and focus preservation.
- npm run lint, TypeScript build and npm run build passed. Production build retains the existing large-chunk advisory.
- Chromium and WebKit passed isolated component review at 1440px and 390px: ownership changes, preserved keyboard focus, dismiss, upkeep navigation callback without command submission, and no page errors. Safari pointer clicks do not focus buttons by default; focus preservation was therefore checked using keyboard activation.
- Screenshots inspected: [desktop turn](second_dawn_turn_attention_review/chromium-1440-turn.png), [mobile upkeep](second_dawn_turn_attention_review/webkit-390-upkeep.png). [Browser results](second_dawn_turn_attention_review/standalone-results.json).

The first screenshots use an isolated component fixture. A second browser run mounted the actual integrated SecondDawnBoard with the workflow-finish-upkeep fixture, changing only the active seat controller to human. The stored review fixtures have all-AI seats, which correctly suppress human attention notices. The harness captures submitted command types locally and never calls Convex or a saved match. Chromium and WebKit, each at 1440px and 390px, verified that Review upkeep opens the panel without submission and a separate Finish upkeep click calls the submit handler. All four runs had zero page errors. [Integrated results](second_dawn_turn_attention_review/integrated-results.json), [desktop notice](second_dawn_turn_attention_review/integrated-chromium-1440-notice.png), [mobile notice](second_dawn_turn_attention_review/integrated-webkit-390-notice.png), [mobile review](second_dawn_turn_attention_review/integrated-webkit-390-review.png). These screenshots were visually inspected; the notice clears mobile navigation and the review shows resource consequences before confirmation. This is automated local fixture evidence, not a live multiplayer or human playtest.

## Follow-ups

Root owns release integration and the command-level Board tests; standalone and integrated local browser checks are complete. No engine, RNG, hidden information or backend behavior is changed by the standalone component.

Root integration review caught the initial turn notice covering the Build confirmation in the expanded browser workflow. The notice now hides while an action workspace is open and acknowledges an action once it has begun. The original browser failure is retained in the work log; the complete expanded walkthrough was rerun after this fix. Upkeep opens the existing cost preview and requires an explicit Finish upkeep command. A public action-turn serial supports missed intermediate AI updates without exposing private state.
