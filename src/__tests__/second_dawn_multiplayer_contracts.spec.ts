import { expect, it } from "vitest";
import {
  MAX_MULTIPLAYER_TIMER_MS,
  MIN_MULTIPLAYER_TIMER_MS,
  reconcileMultiplayerTimer,
  roomCanStart,
  roomInvitePath,
  timerTargetForState,
} from "../../shared/eclipse/multiplayer";
import { createGame } from "../../shared/eclipse/setup";

it("keeps one owner deadline through ordinary commands and that owner's chained decisions", () => {
  const state = createGame({
    seed: 9,
    warpPortals: true,
    seats: [
      { id: "seat-1", faction: "terran-directorate", controller: "human" },
      { id: "seat-2", faction: "hydran", controller: "human" },
    ],
  });
  const first = reconcileMultiplayerTimer(null, state, 1_000, 30_000, () => "turn-a");
  expect(first.timer).toMatchObject({ token: "turn-a", deadlineAt: 31_000, target: { seatId: "seat-1", decisionId: null } });
  state.revision++;
  const sameTurn = reconcileMultiplayerTimer(first.timer, state, 5_000, 30_000, () => "should-not-be-used");
  expect(sameTurn).toEqual({ timer: first.timer, changed: false });
  state.pendingDecision = { id: "explore-1", owner: "seat-1", kind: "exploration", position: { q: 1, r: 0 }, drawnTileIds: ["101"], placements: [] };
  const ownDecision = reconcileMultiplayerTimer(first.timer, state, 5_000, 30_000, () => "decision-a");
  expect(ownDecision).toMatchObject({ changed: false, timer: { token: "turn-a", deadlineAt: 31_000, target: { seatId: "seat-1", decisionId: "explore-1" } } });
  state.pendingDecision = { id: "combat-2", owner: "seat-2", kind: "reputation", drawn: [2], capacity: 4 };
  const opponentDecision = reconcileMultiplayerTimer(ownDecision.timer, state, 8_000, 30_000, () => "decision-b");
  expect(opponentDecision.timer).toMatchObject({ token: "decision-b", deadlineAt: 38_000, target: { seatId: "seat-2", decisionId: "combat-2" } });
});

it("keeps a timed-out owner locked while the timeout AI resolves chained choices", () => {
  const state = createGame({ seed: 5, warpPortals: true, seats: [{ id: "seat-1", faction: "terran-directorate", controller: "human" }, { id: "seat-2", faction: "hydran", controller: "human" }] });
  const expired = { token: "timeout-a", deadlineAt: 31_000, target: { seatId: "seat-1", decisionId: null }, status: "timed-out" as const, error: null };
  state.pendingDecision = { id: "rotate-1", owner: "seat-1", kind: "exploration", position: { q: 1, r: 0 }, drawnTileIds: ["101"], placements: [] };
  expect(reconcileMultiplayerTimer(expired, state, 40_000, 30_000, () => "new-clock")).toMatchObject({ changed: false, timer: { token: "timeout-a", deadlineAt: 31_000, status: "timed-out", target: { decisionId: "rotate-1" } } });
});

it("defines safe lobby limits and only starts when every occupied human seat is ready", () => {
  expect(MIN_MULTIPLAYER_TIMER_MS).toBe(30_000);
  expect(MAX_MULTIPLAYER_TIMER_MS).toBe(48 * 60 * 60 * 1_000);
  expect(roomCanStart({ humanSeatCount: 2, aiCount: 1, seats: [{ slot: 1, occupied: true, faction: "terran-directorate", ready: true }, { slot: 2, occupied: true, faction: "hydran", ready: false }] })).toBe(false);
  expect(roomCanStart({ humanSeatCount: 2, aiCount: 1, seats: [{ slot: 1, occupied: true, faction: "terran-directorate", ready: true }, { slot: 2, occupied: true, faction: "hydran", ready: true }] })).toBe(true);
  expect(roomCanStart({ humanSeatCount: 2, aiCount: 0, seats: [{ slot: 1, occupied: true, faction: "terran-directorate", ready: true }, { slot: 2, occupied: true, faction: "eridani", ready: true }] })).toBe(false);
  expect(roomInvitePath("m7YzabH3kL9Q")).toBe("/room/m7YzabH3kL9Q");
});

it("does not expose a timer target for a finished match", () => {
  const state = createGame({ seed: 1, warpPortals: false, seats: [{ id: "seat-1", faction: "terran-directorate", controller: "human" }, { id: "seat-2", faction: "hydran", controller: "human" }] });
  state.phase = "finished";
  expect(timerTargetForState(state)).toBeNull();
});
