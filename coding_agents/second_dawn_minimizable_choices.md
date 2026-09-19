# Persistent choices and a larger galaxy

Outcome: inspect the galaxy or an opponent without losing a discovery, placement, or combat draft, then return through a specific, persistent control.

Acceptance: one mounted decision workspace; minimize preserves component state; a new authoritative decision reopens; navigation exposes a named return; desktop details start closed and open on deliberate selection or spatial action. Mobile retains its sheet and gains the same named return. No rule, ownership, or submission changes.

Tests first: discovery draft across opponent blueprints; minimize/restore; same-ID revision versus new decision; collapsed inspector; action inputs stay reachable. Risks: duplicated decision components, keyboard access into hidden choices, CSS grid space retained, old navigation expectations. Rollback is limited to presentation and navigation; authoritative saves unchanged.

Decision: minimize is local navigation only. The actual decision component remains mounted and hidden while other screens are inspected. It resets only when the server changes the decision ID. A closed inspector keeps its controls mounted and releases its grid column.

## Implementation and decisions

- One `ChoiceWorkspace`, keyed by authoritative decision ID, wraps the existing decision component. It stays mounted with `hidden` while viewing the galaxy, research, public empires, or blueprints. The underlying map is inert while the popup is open; Minimize exposes it without submitting. The popup itself does not trap focus, so header/roster navigation remains available.
- Desktop provides a prominent named return in the persistent roster toolbar across all inspection screens. Mobile uses its persistent footer, also naming the actual choice. Minimize/Escape restores focus to that return; returning focuses the popup's minimize control. Existing fleet/public inspection dialogs stop Escape themselves.
- A ref tracks the last presented decision ID. This fixes the previous pending effect reopening on unrelated revisions because the draft provider's setter identity changed.
- Desktop details default closed, open for an explicit sector selection or spatial action, and release their grid column when closed. Blueprint/research/trade screens retain their own controls and full width. History opens its panel even when invoked during a choice. Closing details restores keyboard focus.
- Hidden choices disable 3D roll playback without resetting allocations. Destruction feedback appears inside the active choice, with one active aftermath presentation. The previous automatic action handoff, Upgrade entry, and passing bonuses remain intact.
- Research, Upgrade, and Trade mobile action bars no longer offer a redundant Details button. Their controls live in the workspace; Back and early action completion remain.

## Verification

- Initial new regression run: **4 failed, 1 passed**, before implementation (`coding_agents/logs/choice_workspace_red.log`).
- Final dedicated suite: **13/13 passed** (`choice_workspace_final_targeted.log`). Covers discovery across opponent inspection, minimize/restore, unrelated revisions versus new decisions, inspector defaults/action reachability, keyboard return focus, nested modal Escape, History, hidden dice, visible casualty feedback, and mobile local controls.
- Related diplomacy/mobile/blueprint/fleet/spatial batch: **38/38 passed** (`choice_workspace_regressions_final.log`). Subsequent handoff/diplomacy/mobile batch: **31/31 passed** (`choice_workspace_final.log`). Combat/dice/casualty batch: **25/25 passed** (`choice_workspace_combat.log`). These batches overlap; counts are not additive.
- Scoped ESLint clean; `tsc -b --pretty false` passed. Parent owns final repository lint/build and final bounded complete suite.
- Browser script `tools/second-dawn-choice-workspace-review.mjs`: all three requested viewports pass real interaction and geometry checks. Closing details releases at least 300 desktop pixels; selected discovery survives opponent blueprint navigation; minimize restores focus; placement SVG retains usable height and its commitment stays above navigation. No browser page errors and no authoritative submissions/cloud writes during inspection.

## Rendered-image review

Reviewed actual captures in `coding_agents/second_dawn_choice_workspace_review/`: desktop galaxy/details, discovery, opponent blueprint return, and sector placement at 1366×768 and 1440×900; mobile galaxy/discovery/commit, opponent return, and placement at 390×844.

The first image review found desktop placement's flexible map collapsing inside the popup; corrected the explicit popup/body flex sizing and added geometry assertions. Removed redundant location-panel framing and the duplicate map-navigation button for ordinary rewards. Moved the details toggle into the galaxy heading so its presence does not consume an extra header row. Final reviewed images show legible controls, a visible named return across inspection, bounded scrollable rewards, and rotation/placement controls above mobile navigation. A mobile reward may require scrolling to its commit; its popup header stays reachable.

This is deterministic Chromium browser evidence and agent image review, including mobile emulation. It is not a physical-device or human newcomer/expert playtest. Existing close map zoom/camera preference remains unchanged.

## Follow AI regression follow-up

The parent's full suite exposed automatic AI action details being hidden by the new default-collapsed inspector. Reproduced the existing test failure before fixing it, alongside a new close-preservation regression (2 red, 1 green). Desktop now opens the inspector once for each new public AI action when Follow AI is enabled and the player is on Galaxy, outside History or an inspection dialog. A consumed entry is never replayed merely because the player navigates later. Explicit Close details/Hide details dismisses automatic following through subsequent actions and AI seat changes; manual Follow/Watch or the next acknowledged human handoff can resume it. The AI panel closes when control returns to the human unless the human has already selected their own inspection.

A second failing regression caught Follow toggling during the human turn opening an empty inspector. The explicit toggle now only opens an actual available AI presentation and leaves ordinary human inspection alone.

Final bounded batch: **37/37 passed**, covering Follow AI (5), public presentation (10), choice workspaces (13), action handoff (6), and backend pacing (3). Scoped ESLint and `tsc -b` pass. Logs: `choice_ai_follow_red.log`, `choice_ai_follow_toggle_red.log`, `choice_ai_follow_final_batch.log`, and `choice_ai_follow_types.log`.

`tools/second-dawn-ai-follow-collapse-review.mjs` passes at 1366×768 and 1440×900: public research automatically appears, manual closing survives another AI entry, explicit Follow restores presentation, and blueprint inspection survives another action. Actual automatic/open and manual/closed screenshots reviewed in `coding_agents/second_dawn_ai_follow_collapse_review/`; no page errors or cloud writes. This is browser emulation and agent review, not a human playtest.
