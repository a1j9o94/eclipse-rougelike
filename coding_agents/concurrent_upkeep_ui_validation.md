# Concurrent upkeep: UI regression review

## Outcome and acceptance

Every unfinished human can review upkeep, colonize and convert immediately, including while another player resolves bankruptcy. Completed players see their completion and group progress; their economy shortcuts stop offering additional upkeep actions. Later mandatory choices still receive attention. Finishing upkeep closes the mobile action view even when the same player starts the next round.

## Review and decisions

- UI participation follows projected `upkeepDone`, not the compatibility `activeSeatId` pointer. Legacy views without the new list retain their existing fallback.
- Reviewed attention boundaries, desktop/mobile navigation, command-center shortcuts, action receipts and AI status priority. Root implemented the board/header/notice integration; this test agent owns the new regression file and the two small `EmpireOverview`/`AiActivityBar` fixes.
- Paid command-center colonization/conversion buttons are disabled with an explanation. Technology browsing remains available.
- An owned mandatory decision overrides the completed-upkeep waiting message.
- Risk/rollback: changes are presentation and navigation only; engine legality remains authoritative. Revert the affected UI change without altering persisted game rules.

## Test evidence

`src/__tests__/second_dawn_concurrent_upkeep_ui.spec.tsx` covers desktop/mobile review, colonization and conversion for a non-active human; completed progress and no repeat actions; no duplicate notice as others finish; foreign bankruptcy; completed command-center shortcuts; mandatory decision priority; and accepted mobile payment receipts for both intermediate and final players.

- Initial eight concurrency cases failed before implementation, then passed.
- Two focused overview/status tests failed before their fixes, then passed.
- The final-player mobile receipt case reproduced the browser bug with an actual engine `finish-upkeep` result: next-round view incorrectly retained the `Finish upkeep` current-action navigation. Intermediate-player receipt already passed.
- Before the final receipt fix, 33 related tests passed across concurrency, empire overview and attention suites; scoped ESLint passed.
- Final verification: **45 tests passed** across five files (12 concurrency, 9 empire overview, 13 attention, 1 attention-board and 10 AI-presentation cases), including both actual-engine payment receipt regressions. Scoped ESLint passed for both changed components and the new test file. Log: `/tmp/concurrent-upkeep-ui-final.log`.
- Browser review belongs to the root agent; this document does not claim screenshots were reviewed by the test agent. Full repository lint/build and deployment are root release gates.
