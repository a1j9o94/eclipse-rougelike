# Concurrent upkeep engine

## Outcome and contract

Every living player can colonize, convert resources and finish upkeep independently. Another player's bankruptcy does not block them. `PlayerView.upkeepDone` lists paid seats during upkeep; `pendingDecision` is the viewer's first outstanding choice, whether persisted as the global decision or in `engine.decisions`. A foreign upkeep choice is omitted from `waitingFor`.

`upkeepDecisionForSeat` and `upkeepSeatUnfinished` in `shared/eclipse/upkeep.ts` are shared authority helpers for backend scheduling. `activeSeatId` remains the first unpaid living player for old sequential consumers, but is not the authority for upkeep commands.

## Decisions

- Reuse the existing durable global decision plus queue format. No migration or new unpersisted choice map is needed.
- The pure processor focuses the submitting seat's queued choice only in its cloned state. Foreign choices remain queued. Failed commands leave the snapshot, queue, and random state unchanged.
- Payment occurs once. Paid seats cannot trade, colonize, convert colony ships, or submit another payment during the same upkeep.
- A paid seat can still resolve a mandatory population return created by another player's subsequent elimination. This does not collect income again. The cleanup barrier waits for those obligations too.
- A bankrupt seat's requested payment resumes only after its own cube returns clear; foreign pending choices do not block recalculation.
- Outside upkeep, the existing serialized decision ownership and active-seat guards remain in force. Revision checks and idempotent command receipts remain unchanged.

## Verification

Four initial behavioral regressions failed before implementation. Five new tests now cover arbitrary payment order with colonization/conversion, independent bankruptcies and owned private choices, singleton-save compatibility, duplicate and stale submissions, and a paid seat's ambassador cube return following elimination.

- Focused engine, rounds, action, auto-pass and protocol batch: **62 tests passed** across six files.
- Existing seeded eight-round full-match tests: **5 passed**, covering every supported count, 2–6 seats, with valid scoring (about 14 seconds).
- `npm run typecheck:eclipse`: passed.
- Root coordinates final repository lint/build and frontend/backend integration checks.

## Risks and rollback

Concurrent requests still serialize at the authoritative revision boundary; the UI must refresh/retry an explicit stale submission without losing its draft. Backend timers and AI schedulers must consider all unfinished living seats, plus required own decisions for already-paid seats. Returning to the old release needs no data migration because queue/snapshot storage is unchanged, although old clients will again wait for the global seat.
