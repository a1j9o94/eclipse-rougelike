# Turn handoff UX fix

## Outcome
When an accepted human turn-ending command actually transfers control, the board returns to the Galaxy so the player can follow the next actor.

## Acceptance criteria
- A desktop player who ends a turn from Research, Blueprints, or another workspace reaches Galaxy after the authoritative handoff.
- A receipt at or below the submission revision does not redirect, even when cloned into a new object.
- Pending decisions retain their Decision priority.
- The transition happens once per submitted `end-action`, `pass`, or `finish-upkeep`; later AI/player revisions and user navigation do not get overridden.
- Existing drafts are left to the receipt-aware draft provider, and Follow AI continues to control presentation rather than the handoff detection.

## Risks and rollback
The risk is mistaking a stale/same-type receipt for the current submission. The implementation records the submission revision and accepts only a matching receipt with a strictly newer revision; the receipt-only fallback applies the same revision rule. Revert the handoff effect and test if receipt semantics change.

## TDD test list
- [x] Desktop research and Blueprint/pass handoff regressions, including a human next player and Follow AI off.
- [x] Targeted board/mobile/research tests, lint, Eclipse typecheck, and production build verification.

## Decision log
`lastAcceptedCommand` is an acknowledgement of the viewer’s command, not itself proof that the turn view changed. A handoff therefore requires both a matching receipt newer than the submitted revision and a non-viewer active/waiting owner (or an authoritative pending decision, which is allowed to take priority).

## Follow-ups
None.
