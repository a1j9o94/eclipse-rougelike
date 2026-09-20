import type { GameState, PendingDecision, SeatId } from "./types";

/** Upkeep choices remain persisted in the existing decision queue, owned by seat. */
export function upkeepDecisionForSeat(
  state: GameState,
  seatId: SeatId,
): PendingDecision | null {
  if (state.pendingDecision?.owner === seatId) return state.pendingDecision;
  return state.phase === "upkeep"
    ? (state.engine?.decisions.find((decision) => decision.owner === seatId) ??
        null)
    : null;
}

export function upkeepSeatUnfinished(
  state: GameState,
  seatId: SeatId,
): boolean {
  return (
    state.phase === "upkeep" &&
    state.seats.some((seat) => seat.id === seatId && !seat.eliminated) &&
    !(state.engine?.upkeepDone ?? []).includes(seatId)
  );
}

/** Focus only a command's private clone; failures never reorder persisted choices. */
export function focusUpkeepDecision(state: GameState, seatId: SeatId): void {
  if (
    state.phase !== "upkeep" ||
    !state.engine ||
    state.pendingDecision?.owner === seatId
  )
    return;
  const queue = state.engine.decisions;
  const index = queue.findIndex((decision) => decision.owner === seatId);
  const own = index < 0 ? null : queue.splice(index, 1)[0];
  if (state.pendingDecision) queue.unshift(state.pendingDecision);
  state.pendingDecision = own;
}
