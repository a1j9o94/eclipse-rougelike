import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
const modules = import.meta.glob("../../convex/**/*.{ts,js}");
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function timedOutRoom() {
  const t = convexTest(schema, modules),
    host = await t.action(api.eclipseGuests.createGuestSession, {}),
    guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const room = await t.mutation(api.eclipseRooms.createRoom, {
    ...host,
    faction: "hydran",
    settings: {
      humanSeatCount: 2,
      aiCount: 0,
      timerMs: 30_000,
      warpPortals: true,
    },
  });
  await t.mutation(api.eclipseRooms.joinRoom, {
    ...guest,
    roomToken: room.roomToken,
    faction: "eridani",
  });
  await t.mutation(api.eclipseRooms.setRoomReady, {
    ...host,
    roomToken: room.roomToken,
    ready: true,
  });
  await t.mutation(api.eclipseRooms.setRoomReady, {
    ...guest,
    roomToken: room.roomToken,
    ready: true,
  });
  const { matchId } = await t.mutation(api.eclipseRooms.startRoom, {
    ...host,
    roomToken: room.roomToken,
  });
  const timer = await t.run((ctx) =>
    ctx.db
      .query("eclipseRoomTimersV1")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique(),
  );
  // This test explicitly drives one worker; retire automatic dispatches to isolate the race.
  await t.run(async (ctx) => {
    for (const job of await ctx.db.system
      .query("_scheduled_functions")
      .collect())
      if (job.state.kind === "pending") await ctx.scheduler.cancel(job._id);
  });
  vi.setSystemTime(timer!.deadlineAt + 1);
  await t.mutation(internal.eclipseRooms.runRoomTimeout, {
    roomToken: room.roomToken,
    token: timer!.token,
  });
  await t.mutation(internal.eclipseMatches.runAi, {
    matchId,
    expectedRevision: 0,
  });
  const job = await t.run((ctx) =>
    ctx.db
      .query("eclipseAiJobsV1")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique(),
  );
  expect(job?.status).toBe("thinking");
  return { t, host, guest, matchId, room, timer: timer!, job: job! };
}
describe("AI worker concurrency with human room ownership", () => {
  it("reschedules timeout takeover after a different player makes a legal off-turn trade", async () => {
    const { t, guest, matchId, timer, job } = await timedOutRoom();
    const result = await t.mutation(api.eclipseMatches.submitCommand, {
      ...guest,
      matchId,
      commandId: "off-turn-trade",
      expectedRevision: 0,
      command: { type: "trade", from: "money", to: "science", amount: 1 },
    });
    expect(result).toMatchObject({ ok: true });
    // A stale worker must neither commit nor consume the replacement worker's budget.
    await t.mutation(internal.eclipseMatches.commitAiWork, {
      matchId,
      expectedRevision: 0,
      leaseToken: job.leaseToken!,
      command: { type: "pass" },
      elapsedMs: 20,
    });
    expect((await t.run((ctx) => ctx.db.get(matchId)))?.revision).toBe(1);
    const replacement = await t.run((ctx) => ctx.db.get(job._id));
    expect(replacement).toMatchObject({
      status: "scheduled",
      expectedRevision: 1,
      timeoutToken: timer.token,
    });
    await t.mutation(internal.eclipseMatches.runAi, {
      matchId,
      expectedRevision: 1,
    });
    const claimed = await t.run((ctx) => ctx.db.get(job._id));
    const work = await t.query(internal.eclipseMatches.getAiWork, {
      matchId,
      expectedRevision: 1,
      leaseToken: claimed!.leaseToken!,
    });
    expect(work?.view.viewerSeatId).toBe("seat-1");
    await t.mutation(internal.eclipseMatches.commitAiWork, {
      matchId,
      expectedRevision: 1,
      leaseToken: claimed!.leaseToken!,
      command: { type: "pass" },
      elapsedMs: 20,
    });
    expect((await t.run((ctx) => ctx.db.get(matchId)))?.revision).toBe(2);
  });
  it("the ordinary AI retry endpoint recovers a failed timeout worker without returning control early", async () => {
    const { t, guest, host, matchId, timer, job } = await timedOutRoom();
    await t.mutation(internal.eclipseMatches.failAiWork, {
      matchId,
      expectedRevision: 0,
      leaseToken: job.leaseToken!,
      error: "Interrupted worker",
    });
    await t.mutation(api.eclipseMatches.retryAi, { ...guest, matchId });
    const recoveryJobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(
      recoveryJobs.some(
        (task) =>
          ["eclipseRooms:runRoomTimeout", "eclipseMatches:runAi"].includes(
            task.name,
          ) &&
          task.state.kind === "pending" &&
          task.scheduledTime > Date.now(),
      ),
    ).toBe(true);
    const beforeDispatch = await t.run((ctx) => ctx.db.get(job._id));
    expect(beforeDispatch).toMatchObject({
      timeoutToken: timer.token,
      remainingBudgetMs: 0,
    });
    // Recovery retains the normal presentation delay; explicitly dispatch that timer job.
    await t.mutation(internal.eclipseRooms.runRoomTimeout, {
      roomToken: (await t.run((ctx) => ctx.db.get(timer.roomId)))!.roomToken,
      token: timer.token,
    });
    const after = await t.run((ctx) => ctx.db.get(job._id));
    expect(after).toMatchObject({
      status: "scheduled",
      timeoutToken: timer.token,
      remainingBudgetMs: 0,
    });
    const clock = await t.run((ctx) => ctx.db.get(timer._id));
    expect(clock).toMatchObject({
      status: "timed-out",
      token: timer.token,
      deadlineAt: timer.deadlineAt,
    });
    expect(
      await t.mutation(api.eclipseMatches.submitCommand, {
        ...host,
        matchId,
        commandId: "still-timed-out",
        expectedRevision: 0,
        command: { type: "pass" },
      }),
    ).toMatchObject({ ok: false, error: { code: "TURN_TIMEOUT" } });
  });
  it("human command IDs cannot create duplicate AI journal keys", async () => {
    const t = convexTest(schema, modules),
      guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, {
      ...guest,
      aiCount: 1,
    });
    const collision = await t.mutation(api.eclipseMatches.submitCommand, {
      ...guest,
      matchId,
      commandId: "ai:seat-2:1",
      expectedRevision: 0,
      command: { type: "pass" },
    });
    // Either the server reserves its command namespace or its worker must use a distinct key.
    if (!collision.ok) {
      expect(collision.error.code).toBe("INVALID_COMMAND");
      return;
    }
    await t.mutation(internal.eclipseMatches.runAi, {
      matchId,
      expectedRevision: 1,
    });
    const job = await t.run((ctx) =>
      ctx.db
        .query("eclipseAiJobsV1")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .unique(),
    );
    await t.mutation(internal.eclipseMatches.commitAiWork, {
      matchId,
      expectedRevision: 1,
      leaseToken: job!.leaseToken!,
      command: { type: "pass" },
      elapsedMs: 1,
    });
    const journal = await t.run((ctx) =>
      ctx.db
        .query("eclipseJournalV1")
        .withIndex("by_match_revision", (q) => q.eq("matchId", matchId))
        .collect(),
    );
    expect(new Set(journal.map((entry) => entry.commandId)).size).toBe(
      journal.length,
    );
    expect((await t.run((ctx) => ctx.db.get(matchId)))?.revision).toBe(2);
  });
  it("rejects a still-current lease after its deadline even before the watchdog has run", async () => {
    const { t, matchId, job } = await timedOutRoom();
    vi.setSystemTime(job.leaseExpiresAt! + 1);
    expect(
      await t.query(internal.eclipseMatches.getAiWork, {
        matchId,
        expectedRevision: 0,
        leaseToken: job.leaseToken!,
      }),
    ).toBeNull();
    await t.mutation(internal.eclipseMatches.commitAiWork, {
      matchId,
      expectedRevision: 0,
      leaseToken: job.leaseToken!,
      command: { type: "pass" },
      elapsedMs: 1,
    });
    expect((await t.run((ctx) => ctx.db.get(matchId)))?.revision).toBe(0);
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      "thinking",
    );
  });
  it("does not commit takeover work after the room timer token is replaced", async () => {
    const { t, matchId, timer, job } = await timedOutRoom();
    await t.run((ctx) =>
      ctx.db.patch(timer._id, {
        token: "replacement-timer",
        status: "active",
        deadlineAt: Date.now() + 30_000,
      }),
    );
    expect(
      await t.query(internal.eclipseMatches.getAiWork, {
        matchId,
        expectedRevision: 0,
        leaseToken: job.leaseToken!,
      }),
    ).toBeNull();
    await t.mutation(internal.eclipseMatches.commitAiWork, {
      matchId,
      expectedRevision: 0,
      leaseToken: job.leaseToken!,
      command: { type: "pass" },
      elapsedMs: 1,
    });
    expect((await t.run((ctx) => ctx.db.get(matchId)))?.revision).toBe(0);
    expect((await t.run((ctx) => ctx.db.get(timer._id)))?.token).toBe(
      "replacement-timer",
    );
  });
  it("off-turn activity cannot restart the clock of a failed, expired takeover", async () => {
    const { t, host, guest, matchId, timer, job } = await timedOutRoom();
    await t.mutation(internal.eclipseMatches.failAiWork, {
      matchId,
      expectedRevision: 0,
      leaseToken: job.leaseToken!,
      error: "Paused takeover",
    });
    expect(
      await t.mutation(api.eclipseMatches.submitCommand, {
        ...guest,
        matchId,
        commandId: "trade-while-takeover-paused",
        expectedRevision: 0,
        command: { type: "trade", from: "money", to: "science", amount: 1 },
      }),
    ).toMatchObject({ ok: true });
    expect(await t.run((ctx) => ctx.db.get(timer._id))).toMatchObject({
      status: "failed",
      token: timer.token,
      deadlineAt: timer.deadlineAt,
    });
    expect(
      (await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId }))
        ?.aiStatus,
    ).toMatchObject({ status: "failed" });
    expect(
      await t.mutation(api.eclipseMatches.submitCommand, {
        ...host,
        matchId,
        commandId: "expired-owner-cannot-resume",
        expectedRevision: 1,
        command: { type: "pass" },
      }),
    ).toMatchObject({ ok: false, error: { code: "TURN_TIMEOUT" } });
  });
});
