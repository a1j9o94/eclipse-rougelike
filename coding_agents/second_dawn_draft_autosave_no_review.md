# Automatic draft saving without review acknowledgements

Outcome: uncommitted choices save and restore automatically without asking the player to acknowledge a changed board.

User direction: after reporting repeated, unclear “I’ve reviewed my draft” prompts, the user clarified: “No, it shouldn't ask at all, just save.” This overrides the earlier proposal to prompt selectively for meaningful changes. No context fingerprints or replacement review workflow were implemented.

Cause: `ActionDraftProvider` compared every meaningful saved draft's revision against the latest authoritative revision. Any difference blocked all consumers of `guard.stale`, even for an unrelated AI command, an inactive trade draft, or a locally accepted action that left another draft saved. The generic acknowledgement offered no reason beyond “The board changed.”

Changes:

- Remove the revision-comparison guard and its review callback. Existing planner compatibility reads receive `stale: false`, so blueprint, research, movement, build, trade and board submission paths no longer block on draft age.
- Remove review/discard acknowledgement UI. `ActionDraftNotice` now reports only actual browser-storage failure; it never asks for approval.
- Preserve typed local storage, per-match/per-seat partitioning, automatic restoration and receipt-safe cleanup. An accepted older submitted value does not erase a newer edited draft.
- Preserve current planner legality, affordability, connection/busy checks and authoritative expectedRevision/command validation. A saved trade that becomes unaffordable is disabled by its actual resource requirement, without a generic review screen.

Acceptance: revisions, opponent activity, own accepted commands and restoring older saved choices never require an extra acknowledgement; all edits remain saved; only matching submitted choices are cleared; current illegality still prevents commitment. No saved game is deleted or silently submitted.

Verification:

- Initial targeted tests reproduced revision-based interruption (4 failures / 1 existing pass). After the user's correction, regressions explicitly assert no acknowledgement for any revision/resource change.
- `npx vitest run --maxWorkers=1 src/__tests__/second_dawn_draft_revalidation.spec.tsx src/__tests__/second_dawn_action_drafts.spec.tsx src/__tests__/second_dawn_trade_panel.spec.tsx src/__tests__/second_dawn_protocol.spec.ts`: 33 passed. Covers save/reload, unrelated revisions, inactive drafts, own accepted command, newer edit versus older receipt, unaffordable current trade and existing stale-server-revision rejection.
- Scoped ESLint: passed for provider, context, notice and draft tests.
- `npm run typecheck:eclipse`: passed.
- No server implementation or expectedRevision logic changed.

Risks/rollback: an old draft can be inspected without acknowledgement, but current displayed costs and legality still apply. Network-race conflicts remain explicit server errors followed by authoritative refresh. Reverting the presentation change restores the previous acknowledgement; persisted drafts retain their existing version and schema throughout.

Combined integration gate: 621 Second Dawn tests across 125 files passed with one worker; production build and changed-file lint passed. Existing full-repository lint debt remains 88 errors and 12 warnings.
