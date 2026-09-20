import "./hostStartingSeed";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import type { GameState } from "../../shared/eclipse/types";
import { finishDispatchedAi } from "./aiWorkerTestSupport";
const modules = import.meta.glob("../../convex/**/*.{ts,js}");
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function fixture() {
  const t = convexTest(schema, modules),
    host = await t.action(api.eclipseGuests.createGuestSession, {}),
    guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const room = await t.mutation(api.eclipseRooms.createRoom, {
    ...host,
    faction: "eridani",
    settings: {
      humanSeatCount: 2,
      aiCount: 0,
      timerMs: 30000,
      warpPortals: false,
    },
  });
  await t.mutation(api.eclipseRooms.joinRoom, {
    ...guest,
    roomToken: room.roomToken,
    faction: "hydran",
  });
  for (const credentials of [host, guest])
    await t.mutation(api.eclipseRooms.setRoomReady, {
      ...credentials,
      roomToken: room.roomToken,
      ready: true,
    });
  const { matchId } = await t.mutation(api.eclipseRooms.startRoom, {
    ...host,
    roomToken: room.roomToken,
  });
  await t.run(async (ctx) => {
    const row = await ctx.db.get(matchId),
      state = JSON.parse(row!.snapshotJson) as GameState;
    state.phase = "upkeep";
    state.round = 8;
    state.activeSeatId = "seat-1";
    state.pendingDecision = null;
    state.engine!.action = null;
    state.engine!.decisions = [];
    state.engine!.upkeepDone = ["seat-2"];
    for (const seat of state.seats) {
      seat.resources.money = 50;
      seat.passed = true;
    }
    await ctx.db.patch(matchId, {
      phase: "upkeep",
      round: 8,
      snapshotJson: JSON.stringify(state),
    });
  });
  await t.mutation(internal.eclipseRooms.syncRoomTimer, { matchId });
  return { t, host, guest, roomToken: room.roomToken, matchId };
}
it("records a real final upkeep, removes it only after approved undo, and re-awards exactly once on re-finish", async () => {
  const { t, host, guest, matchId } = await fixture();
  const request = {
    ...host,
    matchId,
    commandId: "last-upkeep",
    expectedRevision: 0,
    command: { type: "finish-upkeep" as const },
  };
  expect(
    await t.mutation(api.eclipseMatches.submitCommand, request),
  ).toMatchObject({ ok: true });
  expect(
    await t.mutation(api.eclipseMatches.submitCommand, request),
  ).toMatchObject({ ok: true, duplicate: true });
  expect(
    (
      await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" })
    ).rows.every((row) => row.games === 1),
  ).toBe(true);
  const undo = await t.mutation(api.eclipseRollback.requestRollback, {
    ...host,
    matchId,
    targetRevision: 1,
    expectedRevision: 1,
  });
  expect(
    (await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" }))
      .rows,
  ).toHaveLength(2);
  expect(undo.pending).not.toBeNull();
  await t.mutation(api.eclipseRollback.respondRollback, {
    ...guest,
    matchId,
    rollbackId: undo.pending!.id,
    approve: true,
  });
  expect(
    await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" }),
  ).toEqual({ rows: [] });
  const state = await t.query(api.eclipseMatches.getMatchView, {
    ...host,
    matchId,
  });
  expect(state?.phase).toBe("upkeep");
  expect(
    await t.mutation(api.eclipseMatches.submitCommand, {
      ...request,
      commandId: "refinish",
      expectedRevision: state!.revision,
    }),
  ).toMatchObject({ ok: true });
  expect(
    (await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" }))
      .rows,
  ).toHaveLength(2);
  expect(
    (
      await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" })
    ).rows.every((row) => row.games === 1),
  ).toBe(true);
});
it("awards the same ledger when the final upkeep is completed by a timeout worker", async () => {
  const { t, matchId, roomToken } = await fixture();
  const timer = await t.run((ctx) =>
    ctx.db
      .query("eclipseRoomTimersV1")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique(),
  );
  vi.setSystemTime(timer!.deadlineAt + 1);
  await t.mutation(internal.eclipseRooms.runRoomTimeout, {
    roomToken,
    token: timer!.token,
  });
  await finishDispatchedAi(t);
  expect(
    (await t.query(api.eclipseLeaderboard.getLeaderboard, { sort: "rating" }))
      .rows,
  ).toHaveLength(2);
  expect(
    await t.run((ctx) => ctx.db.query("eclipseRatingResultsV1").collect()),
  ).toHaveLength(1);
});
