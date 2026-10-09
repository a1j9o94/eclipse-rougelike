# Off-turn next-action interface

## Player outcome

While another player acts, choose the next action through the ordinary map, research, build, fitting, economy and diplomacy controls. Confirm the exact selection with “Will execute on your turn.” One private saved action can be replaced by confirming another or canceled from its compact status row. This restores the ordinary workflows rather than the withdrawn multi-step queue editor.

## Acceptance criteria

- Off-turn planning is available only during the action phase for a seated, non-eliminated viewer, including while an opponent owns a pending choice. Passed players retain the ordinary reaction restrictions.
- Existing planner controls, resource funding, spatial choices and faction capacities work as if beginning the viewer's next action. A viewer-owned pending choice remains authoritative.
- Confirmation submits only to the queue callback, never to the ordinary command callback. Auto-pass settings remain immediate settings.
- Saving a queue clears only the matching draft snapshot after its queue receipt arrives. It does not show construction, movement or acquisition effects before execution. Edits made during an in-flight save survive.
- Another queued command's execution receipt cannot clear a newly drafted replacement. Queue receipts use command IDs; execution receipts use authoritative revisions.
- If the turn arrives before confirmation, the queue dialog closes and leaves the uncommitted draft for ordinary review.
- The mobile Actions picker exposes the same choices while off-turn.
- Failed queue status includes the server reason and cancel control; normal own-turn controls remain available for recovery.

## Decision log

`SecondDawnBoard` accepts `onQueue(command | null)`, `queuedAction`, and `lastQueuedCommand`. The saved receipt is the frontend `SavedQueuedActionReceipt {commandId, type}`; the server's existing `QueuedActionReceipt {revision, type}` describes execution and is intentionally separate.

The planner projection starts only from the viewer's already-filtered `PlayerView` and changes timing gates: active seat becomes the viewer, action progress is removed, pending decision and waiting-for gates become null. No hidden game state is reconstructed. The original view remains in the header, roster, galaxy display, public inspection, live AI activity, combat presentation, sounds and turn-attention notices. EmpireOverview receives a separate planner view solely for Build option legality; its civilization status still uses the live view.

All off-turn submission entry points converge on one exact-command confirmation. It previews costs, selected sectors/technology/ship classes where relevant, and diplomacy betrayal. Ordinary full-capacity confirmation notices are suppressed during this review to avoid stacked confirmations. Replacing an existing queue is explicitly identified. Supported command families share the backend `canQueueCommand` predicate.

The board contains no automatic executor. Persistence, turn-start execution, authoritative revalidation and failure state belong to the server integration.

## Verification

The first queue interface run failed three new acceptance tests: off-turn Build during opponent choice, saved status/cancel/replacement, and failed status. The extended tests additionally reproduced a queue dialog remaining open when the viewer's turn arrived; dismissal now preserves the draft.

41 focused tests passed across the queue UI, action drafts, research workspace and mobile shell before the final receipt-source distinction. The final queue UI/action draft rerun passed 20 tests after distinguishing saved and executed receipts. Scoped ESLint and `tsc -b` passed. The React best-practices skill review checked hook ordering, typed boundaries, stable memoized planning candidates, accessible confirmation/status controls and preservation of the existing draft partition/storage schema.

Actual browser rendering and human playtesting remain open because the environment has no installed Chromium binary. Desktop and mobile interaction coverage here comes from Testing Library, not a rendered browser.

## Risks and rollback

Other players can change selected sectors, market copies or affordability before execution. Server validation must fail visibly without substituting targets or answering later decisions. Remove `onQueue` to restore the original read-only off-turn behavior without altering authoritative turn presentation or game rules.
