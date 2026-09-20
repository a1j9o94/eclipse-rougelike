# Concurrent upkeep

Outcome: each unfinished player can colonize, convert and finish upkeep independently; next round/scoring starts only after all living players and outstanding upkeep decisions finish.

Acceptance: public per-seat completion, independently resumable bankruptcy/cube choices, no double income, completed seats cannot keep converting/colonizing, simultaneous submissions cannot lose commands, AI seats progress while humans think, multiplayer upkeep shares one deadline without reset per player. Existing action/combat order remains sequential. Current saves work through optional view fields and existing engine completion state.

Work allocation: engine/projection/legal tests (rift_ai); Convex/AI scheduler/shared deadline (atlas_redesign); UI tests/read-only review (rift_visuals); root UI/integration/race handling and release. Fail-first behavioral coverage and bounded regression batches; full lint/typecheck/build and real desktop/mobile browser review before deployment. Rollback must account for concurrent queued decisions in saved games; revert only after phase completion or preserve reader support.

## Final integration and review

- Engine: 62 focused tests plus five full eight-round matches covering 2–6 players.
- Convex: 35 focused integration tests including simultaneous humans, AI progress, takeover/retry, legacy clock migration, and undo pause restoration.
- UI: desktop/mobile review, colonization, conversion, completion, bankruptcy isolation, one notice per round, paid-seat shortcut guards, late required choices, and last-player next-round handoff. Browser found the stale mobile upkeep controls on last-seat completion; a failing receipt regression reproduced it, then the handoff was fixed.
- Submission races: three tests exercise same-command-ID retry at a refreshed revision, changed own inputs stopping retry, round-boundary stop, and bounded contention.
- Browser: real Board + real engine in an isolated three-human fixture, 1440×900 and 390×844. Reviewed screenshots under `coding_agents/screenshots/concurrent-upkeep-*`. Confirmed preparation while another compatibility seat is active; completed waiting state has no payment control; other participants finishing triggers round 2 and its turn notice. These are agent walkthroughs, not user playtest evidence.
- UI inspection also removed misleading paid-player economy shortcuts and prioritized a later mandatory choice over “waiting for everyone.”
- Release: additive optional timer/view fields; backend first to development deployment, frontend through main Git integration only. No live game commands required for verification.

Follow-ups: no required work deferred. Existing renderer bundle-size and Browserslist age warnings are unrelated to this change.

Release gates: full repository lint and production build (including Convex and domain TypeScript) passed after the final handoff fix. Final UI/presentation regression batch: 45 passing; submission-race tests: 3 passing. Backend deployed successfully to `ideal-nightingale-55` development at 19:42 on 2026-09-19. Convex CLI's automatic removal of the default config was restored.
