# Adversarial gameplay review

Baseline: `cb6c932cc11ad30487a23862256f3aef5c2d650f` in the detached baseline checkout. Candidate: working tree on `feature/maintainability-preserve-play`, November 11, 2026. Review scope: command acknowledgement, drafts, queue routing, component lifetime, camera and battle coordination. This is a partial independent review, not whole-game or cross-browser approval.

## G1 Recovered build and movement confirmations are lost

Severity: release blocker for the preservation contract. Status: fixed and independently retested.

The new `boardReceiptAcknowledges` function required an accepted receipt revision greater than the view revision at submission. The board sets pending build/movement revision from the current subscribed view on every click. However, `SecondDawnGame.send` deliberately retries the same command ID after a lost response. Its recovered original receipt can equal or precede the already-updated subscription revision.

Reproduction:

1. Start with a human Terran turn at revision 10, sufficient materials, and the initial owned sector.
2. Open Build, add one interceptor, select its destination, and confirm.
3. Apply the command through `processGameCommand`; deliver the resulting subscribed view at revision 11 but withhold its receipt, simulating a lost mutation response.
4. Confirm the still-retained build draft again. Verify that the emitted command is identical to the first command. The session would reuse its original idempotency ID.
5. Deliver the original successful receipt at revision 11.
6. Expected: show `1 piece deployed to your galaxy.` and clear pending feedback tracking, preserving baseline behavior. Candidate actual: no completion message; pending feedback remains unmatched. Existing draft acknowledgement still clears the draft, so the player sees the order disappear without the original completion feedback.

Evidence:

| Test | Baseline | Candidate before fix |
| --- | --- | --- |
| `second_dawn_adversarial_build_retry.spec.tsx` full board interaction | 1 passed, 13.30 s | 1 failed, 12.46 s; final visible completion assertion |
| `second_dawn_adversarial_receipt_recovery.spec.tsx` build and movement hook scenarios | Baseline has inline effects instead of the extracted hook; source comparison confirms fresh receipt identity behavior | 2 failed, 2.19 s; both completion values empty |

The full-board test was copied unchanged to the detached baseline for comparison and removed afterward. No baseline application source was changed. The candidate retains both new regression files.

Recommended preservation fix: retain the accepted receipt object present at submission, require a fresh accepted response relative to it, matching scope/type, and a view that includes the receipt revision. Do not require the receipt to be newer than the retry's current view. This matches the existing explicit lost-response contract in `ActionDraftProvider` and session retry logic. Keep duplicate and out-of-order coverage, but distinguish a recovered original confirmation from an unrelated replay.

Retest: the implementation now records the prior accepted receipt object and restores fresh-response identity matching, keeping scope, type, and authoritative-view checks. This reviewer independently reran both regression files after the implementation owner's fix: **2 files / 3 tests passed in 13.62 s**. The full-board test retains its exact user interaction and assertions. Hook tests were adapted only to the pending receipt representation and deterministic fixture options. G1 is resolved for the reviewed working tree.

## Lifecycle and routing inspection

- The live session keys `SecondDawnBoard` by match, viewing seat, and rollback revision. `ActionDraftProvider` additionally keys its partition by match and seat, so the extracted map/encounter/navigation hooks inherit those resets through the mounted subtree.
- Queue routing is still separate from authoritative submit. Immediate auto-pass remains outside queue routing. Required decisions still receive live candidates; projected candidates are used for off-turn planning.
- Encounter rendering retains its encounter key and hidden presentation, and remembered battle/ship state remains in the parent hook. No new lifecycle regression was established from these extractions by source inspection.
- `BoardWorkspace` invokes the chosen render function as a normal function rather than treating a newly allocated function as a React component. This avoids a remount on every board rerender.
- The fixed-fit guard remains in decision focusing and the direct galaxy selection/exploration handlers. No camera-policy change was established by source inspection.

## Evidence limits and outstanding gates

This review agent has no CUA/browser-control tool available. Local browser launch restrictions were reported by the parent; no claim of native browser interaction is made here. The full-board reproduction uses React Testing Library with the actual planner and pure game engine, not a rendered browser.

The current browser fixture records real `processGameCommand` results under `#fixture-proof`, but does not supply `onQueue`. Its browser scenarios cannot establish queue acceptance, cancellation, invalidation, receipt ordering, or network recovery. Those remain separate required integration gates. Motion and sound are forced off in this fixture; it cannot establish preserved live playback behavior.

G1's independent retest is complete. Complete the parent-owned browser command trace comparison, responsive interaction matrix, and required queue/recovery integration separately. Passing this focused review does not waive those gates. Later edits to command tracking require another targeted retest.
