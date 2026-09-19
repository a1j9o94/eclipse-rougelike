# Transient combat results — September 19, 2026

Outcome: a destroyed ship receives brief visible feedback, while battle results cannot remain over later commands or unrelated workspaces.

The new `useCombatResultNotice(playbackRevision, viewRevision, screen)` hook returns `{visible, dismiss}`. A newly seen casualty playback matching the current authoritative revision displays for six seconds. Revision advance, screen navigation and manual dismissal immediately hide it; returning to the old screen or replaying a previously seen revision does not revive it. Old historical results are consumed without display. A new result replaces the previous timeout, and unmount removes timers. Revisions are monotonic within a mounted match; the Board already remounts across matches. Parent wires the hook to casualty playback and the existing dismiss control; no Board changes in this subtask.

TDD: the six-case hook suite failed first before implementation, then passed with fake timers. Coverage includes initial empty state, new current result, stale history, expiration, authoritative advance, navigation/return, manual dismissal, fresh event reset and timer cleanup. Changed lint is clean. Logs: `combat_result_notice_red.out`, `combat_result_notice_green.out`, `combat_result_notice_lint.out` under `coding_agents/logs/`. Parent verifies actual integrated feedback and owns release gates.
