import {finishDispatchedAi} from './aiWorkerTestSupport';
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import type { GameState } from "../../shared/eclipse/types";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const settings = { humanSeatCount: 2, aiCount: 1, timerMs: 30_000, warpPortals: true };
beforeEach(() => { vi.stubGlobal("crypto", webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Second Dawn multiplayer rooms", () => {
  it("shares a public token lobby without guest identities, enforces factions/readiness, and starts an owned match", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const created = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: "terran-directorate" });
    expect(created.roomToken).toMatch(/^[A-Za-z0-9_-]{12,}$/);
    const publicRoom = await t.query(api.eclipseRooms.getRoom, { roomToken: created.roomToken });
    expect(publicRoom).toMatchObject({ viewerSlot: null, viewerIsHost: false, status: "waiting" });
    expect(publicRoom?.seats[0]).toMatchObject({ slot: 1, faction: "terran-directorate", occupied: true, isHost: true });
    expect(JSON.stringify(publicRoom)).not.toContain(host.credential);
    await expect(t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: created.roomToken, faction: "eridani" })).rejects.toThrow("color");
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: created.roomToken, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: created.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: created.roomToken, ready: true });
    await expect(t.mutation(api.eclipseRooms.startRoom, { ...guest, roomToken: created.roomToken })).rejects.toThrow("host");
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: created.roomToken });
    expect(started.lobby.status).toBe("playing");
    expect((await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId: started.matchId }))?.multiplayer).toMatchObject({ roomToken: created.roomToken });
    expect((await t.query(api.eclipseRooms.listMyRooms, host))[0]).toMatchObject({ roomToken: created.roomToken, matchId: started.matchId });
  });

  it("keeps a human timer deadline through own pending choices and timeout AI does not convert the seat", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: "terran-directorate" });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
    const before = await t.run(async (ctx) => ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (q) => q.eq("matchId", started.matchId)).unique());
    await t.run(async (ctx) => {
      const match = await ctx.db.get(started.matchId);
      const state = JSON.parse(match!.snapshotJson) as GameState;
      state.pendingDecision = { id: "same-owner-choice", owner: "seat-1", kind: "reputation", drawn: [2], capacity: 4 };
      state.revision++;
      await ctx.db.patch(match!._id, { snapshotJson: JSON.stringify(state), revision: state.revision });
    });
    await t.mutation(internal.eclipseRooms.syncRoomTimer, { matchId: started.matchId });
    const sameOwner = await t.run(async (ctx) => ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (q) => q.eq("matchId", started.matchId)).unique());
    expect(sameOwner).toMatchObject({ token: before!.token, deadlineAt: before!.deadlineAt, targetSeatId: "seat-1", decisionId: "same-owner-choice" });
    // Return to the legal action state while retaining the same human owner;
    // the clock must still be the original one when it expires.
    await t.run(async (ctx) => {
      const match = await ctx.db.get(started.matchId);
      const state = JSON.parse(match!.snapshotJson) as GameState;
      state.pendingDecision = undefined;
      state.revision++;
      await ctx.db.patch(match!._id, { snapshotJson: JSON.stringify(state), revision: state.revision });
    });
    await t.mutation(internal.eclipseRooms.syncRoomTimer, { matchId: started.matchId });
    await t.run(async (ctx) => await ctx.db.patch(sameOwner!._id, { deadlineAt: 0, status: "active" }));
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: sameOwner!.token });
    await finishDispatchedAi(t);
    const timerAfterTimeout = await t.run(async (ctx) => ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (q) => q.eq("matchId", started.matchId)).unique());
    const timeoutJournal = await t.run(async (ctx) => ctx.db.query("eclipseJournalV1").withIndex("by_match_revision", (q) => q.eq("matchId", started.matchId)).order("desc").first());
    const after = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
    expect(after?.seats.find((seat) => seat.id === "seat-1")?.controller).toBe("human");
    expect(timerAfterTimeout).toMatchObject({ status: "timed-out", error: null });
    expect(after?.revision).toBeGreaterThan(1);
    const timeoutEvents = JSON.parse(timeoutJournal!.eventsJson) as Array<{ type: string; visibility: string; message: string }>;
    expect(timeoutJournal?.receipt.eventCount).toBe(timeoutEvents.length);
    expect(timeoutEvents).toContainEqual({ type: "action", visibility: "public", seatId: "seat-1", message: "Normal AI completed this choice after the turn timer expired." });
    expect((await t.query(api.eclipseMatches.getMatchHistory, { ...host, matchId: started.matchId }))?.entries[0]?.summary).toMatch(/^AI takeover · /);
  });

  it("rejects an expired human command, preserves stale-job safety, and transfers a waiting-room host", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: "terran-directorate" });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: "hydran" });
    const transferred = await t.mutation(api.eclipseRooms.leaveRoom, { ...host, roomToken: room.roomToken });
    expect(transferred).toMatchObject({ closed: false, lobby: { viewerSlot: null, viewerIsHost: false, seats: [{ occupied: false }, { isHost: true, ready: false }] } });

    // Recreate a started room to exercise the server-side race guard.
    const playing = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: "terran-directorate" });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: playing.roomToken, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: playing.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: playing.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: playing.roomToken });
    const timer = await t.run(async (ctx) => ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (q) => q.eq("matchId", started.matchId)).unique());
    await t.run(async (ctx) => ctx.db.patch(timer!._id, { deadlineAt: 0 }));
    const rejected = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId: started.matchId, commandId: "after-timeout", expectedRevision: 0, command: { type: "pass" } });
    expect(rejected).toMatchObject({ ok: false, error: { code: "TURN_TIMEOUT" } });
    const beforeStale = (await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId }))?.revision;
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken: playing.roomToken, token: "stale-token" });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId }))?.revision).toBe(beforeStale);
  });
});
