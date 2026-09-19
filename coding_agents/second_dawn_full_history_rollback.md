# Full history rollback and turn attention

Outcome: the host can reach earlier positions and replace the current game with an agreed saved position; turn/upkeep prompts get attention without routine save popups.

Acceptance: no round cutoff; Beginning of game reaches earliest retained history; agreed undo removes the selected action and all later actions from playable history; discarded futures cannot be restored. Remaining earlier checkpoints still work. Other humans approve, AI agrees automatically. Missing old checkpoints require verified reconstruction; never guess hidden draws. Resignations remain protected. Save commands silently. Turn/upkeep dialogs center, focus the primary action and block board clicks until acknowledged.

Decision log: the initial implementation permitted restoring prior discarded branches. The user clarified that undo deletes the later timeline, so that approach was removed before release. Private command receipts remain for duplicate-request safety; public history skips discarded ranges. Revision numbers remain monotonic to reject stale tabs. Paged interval reads avoid loading every stored snapshot. The client tracks fetched intervals because removed revisions are intentional gaps.

Legacy recovery: reverse the persisted seeded RNG counter to reconstruct setup, then replay the full journal against an exact saved anchor. Install only the requested checkpoint if full private state matches. Unsupported versions, incomplete history, changed anchors and discarded targets are rejected. This validation exists only for old games without checkpoints; normal undo copies the saved position.

Tests first: history retention/restore, discarded-target and hidden-state guards, pagination through removed ranges, silent command receipts, centered focus and click interception. Run affected memory-bounded test batches, lint, build and desktop/mobile Chromium/WebKit walkthroughs.

Risks and rollback: no deletion of deployment data. Revert code for presentation regressions; removed public timelines remain protected by applied rollback records. A legacy checkpoint may remain unavailable if replay cannot verify it.

Validation: 82 root-run targeted tests pass in memory-bounded UI/engine/backend batches (37 UI including the post-undo remount regression, 45 engine/backend). Lint is clean; TypeScript and production build pass. Existing bundle-size and stale Browserslist advisories remain. Eight Chromium/WebKit desktop/mobile fixture walkthroughs passed; screenshots were visually reviewed for central focus, legibility, panel bounds and history scroll access. Live two-human backend/browser test passed silent pass submission, vote recovery after reload, exact restored resources/turn, truncated server history and cleared browser cache. Browser review exposed a persisted-open History pane collapsing during rollback remount; a failing Board regression reproduced it, then inspector initialization was fixed. Evidence: `second_dawn_history_range_review`, `second_dawn_turn_attention_modal_review`, `second_dawn_history_truncation_live_review`.

Dev backend updated at ideal-nightingale-55. Main-only Git release pending. No new human playtest is claimed.
