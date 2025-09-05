Title: Enforce Snapshot-Before-Ready and Robust Outpost Combat Start

Problem
- Combat sometimes starts without both fleets included, or fails to start on the guest, depending on the order the two clients hit "Start Combat".
- Logs show readiness toggles arriving without snapshots, yielding "preconditions not met" and not re-triggering properly for Player 2 in some sequences.
- Current server accepts setReady(true) even if the player has not submitted a fleet snapshot. This permits a race between readiness and snapshot arrival.

Desired Player Experience
- In Outpost, pressing "Start Combat" should reliably start combat after both sides have:
  - Submitted their fleet snapshot for this round
  - Are marked ready
  - Both snapshots are valid (fleetValid !== false)
- Order of operations from either client should not matter; the last missing precondition should trigger the resolve.
- Server should explicitly reject readying up without a snapshot, with a clear error.

Tests Added (must pass)
- src/__tests__/resolve_preconditions.spec.ts
  - computeResolvePlan flags inSetup, bothReady, haveSnapshots, allValid; ok only when all are true.
  - Blocks outside setup.
  - Blocks when any fleetValid=false.
- src/__tests__/ready_guard.spec.ts (failing now)
  - validateReadyToggle blocks setReady(true) when player has no snapshot → returns { ok:false, reason:'missingSnapshot' }.
  - Allows setReady(true) when snapshot exists and is valid → returns { ok:true }.

Current Implementation
- Shared resolver: convex/helpers/resolve.ts
  - maybeResolveRound(ctx, roomId): runs computeResolvePlan and if ok → server-authoritative simulateCombat → roundLog, phase to combat, acks reset.
  - computeResolvePlan(players, gameState): pure flags/ok; used by resolver and tests.
- Hooks:
  - Called after rooms.updatePlayerReady and gameState.submitFleetSnapshot so either action can satisfy the last missing precondition.
- Decoupling:
  - Lobby start resets isReady=false for both players. No auto-start on validity changes.

What to Implement
1) Snapshot-before-ready guard
   - Add a pure helper in convex/helpers/resolve.ts:
     export function validateReadyToggle({ playerId, wantReady, playerStates }): { ok:boolean; reason?: 'missingSnapshot'|'invalidFleet'|'notAllowed' }
     - If wantReady === true and playerStates[playerId].fleet is missing/empty → return { ok:false, reason:'missingSnapshot' }.
     - If wantReady === true and playerStates[playerId].fleetValid === false → return { ok:false, reason:'invalidFleet' }.
     - Otherwise return { ok:true }.

2) Server enforcement in rooms.updatePlayerReady
   - Fetch gameState for player.roomId, read playerStates.
   - Call validateReadyToggle({ playerId, wantReady: args.isReady, playerStates }).
   - If not ok, throw new Error with a friendly message e.g. "Submit your fleet snapshot first" or "Your fleet is invalid" (match reason) and log the event.
   - Only patch isReady if guard passes; then call maybeResolveRound.

3) Optional UX tweaks (if desired)
   - In Outpost Start Combat handler, ensure order: submitFleetSnapshot → updateFleetValidity → setReady(true).
   - Show a small "Waiting for opponent…" label when only one side is ready.
   - Add a lightweight Debug Panel showing myReady/oppReady/snapshot counts/phase (toggle via ?debug=1).

Acceptance Criteria
- With arbitrary ordering across two clients, combat begins only when both have snapshots, both are ready, and both are valid.
- Attempting to Ready without a snapshot returns a clear error on that client; server logs show the rejection.
- The added tests pass, including ready_guard.spec.ts and resolve_preconditions.spec.ts.
- Server logs show preconditions clearly (inSetup, bothReady, haveSnapshots, allValid) and when resolve fires.

Primary Files
- convex/helpers/resolve.ts (add validateReadyToggle)
- convex/rooms.ts (enforce guard before patching isReady)
- src/App.tsx (ensure Start Combat order is submit → validity → ready)
- src/hooks/useMultiplayerGame.ts (keep client logs)

Notes
- Keep resolve logic server-authoritative and deterministic; avoid importing src/ client modules into Convex.
- Keep roundLog concise to limit payload.

