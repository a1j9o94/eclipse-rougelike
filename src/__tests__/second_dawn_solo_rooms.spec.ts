import {finishDispatchedAi} from './aiWorkerTestSupport';
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { isMultiplayerSettings, roomCanStart } from "../../shared/eclipse/multiplayer";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const solo = { humanSeatCount: 1, aiCount: 2, timerMs: 30_000, warpPortals: true };
beforeEach(() => { vi.stubGlobal("crypto", webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Solo rooms wait for their human", () => {
  it("shows a saved public player name in the room without exposing recovery credentials", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const identity = await t.action(api.eclipsePlayers.registerPlayer, { ...host, username: "Solo Pilot", pin: "624975" });
    const created = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings: solo, faction: "hydran" });
    const lobby = await t.query(api.eclipseRooms.getRoom, { roomToken: created.roomToken });
    expect(lobby?.seats[0]).toMatchObject({ username: "Solo Pilot", occupied: true });
    expect(JSON.stringify(lobby)).not.toContain(host.credential);
    expect(JSON.stringify(lobby)).not.toContain(identity.recoveryCode);
    expect(JSON.stringify(lobby)).not.toContain("624975");
  });

  it("allows one ready human with one through five AI, and preserves total seat limits", () => {
    for (const aiCount of [1, 2, 3, 4, 5]) {
      expect(isMultiplayerSettings({ ...solo, aiCount })).toBe(true);
      expect(roomCanStart({ ...solo, aiCount, seats: [{ slot: 1, occupied: true, faction: "hydran", ready: true }] })).toBe(true);
    }
    for (const aiCount of [0, 6, -1, 1.5]) expect(isMultiplayerSettings({ ...solo, aiCount })).toBe(false);
    expect(isMultiplayerSettings({ ...solo, humanSeatCount: 0 })).toBe(false);
    expect(roomCanStart({ ...solo, seats: [{ slot: 1, occupied: true, faction: "hydran", ready: false }] })).toBe(false);
    expect(isMultiplayerSettings({ ...solo, humanSeatCount: 2, aiCount: 4 })).toBe(true);
    expect(isMultiplayerSettings({ ...solo, humanSeatCount: 2, aiCount: 5 })).toBe(false);
  });

  it.each([1, 5])("starts a URL room with one human and %i AI without scheduling a human timeout", async (aiCount) => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const created = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings: { ...solo, aiCount }, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: created.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: created.roomToken });
    expect(started.lobby).toMatchObject({ status: "playing", timer: null, viewerSlot: 1 });
    const before = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
    expect(before?.seats.filter(seat => seat.controller === "human")).toHaveLength(1);
    expect(before?.seats.filter(seat => seat.controller === "ai")).toHaveLength(aiCount);
    vi.setSystemTime(7 * 24 * 60 * 60 * 1000);
    await t.mutation(internal.eclipseRooms.syncRoomTimer, { matchId: started.matchId });
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken: created.roomToken, token: "obsolete-timeout" });
    const after = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
    expect(after?.revision).toBe(before?.revision);
    expect(after?.multiplayer?.timer).toBeNull();
    expect(await t.run(ctx => ctx.db.query("eclipseRoomTimersV1").collect())).toEqual([]);
    const accepted = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId: started.matchId, commandId: "back-after-a-week", expectedRevision: before!.revision, command: { type: "pass" } });
    expect(accepted.ok).toBe(true);
  });

  it("runs ordinary AI seats and then stops at the next human choice indefinitely", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const created = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings: { ...solo, aiCount: 1 }, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: created.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: created.roomToken });
    await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId: started.matchId, commandId: "human-pass", expectedRevision: 0, command: { type: "pass" } });
    let view = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
    let steps = 0;
    while (view?.aiStatus?.status === "scheduled" && steps < 300) {
      await t.mutation(internal.eclipseMatches.runAi, { matchId: started.matchId, expectedRevision: view.revision });
      await finishDispatchedAi(t);
      view = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
      steps++;
    }
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThan(300);
    expect(view?.aiStatus?.status).toBe("waiting");
    expect(view?.pendingDecision?.owner ?? view?.activeSeatId).toBe("seat-1");
    expect(view?.multiplayer?.timer).toBeNull();
    const revision = view!.revision;
    vi.setSystemTime(30 * 24 * 60 * 60 * 1000);
    await t.mutation(internal.eclipseRooms.syncRoomTimer, { matchId: started.matchId });
    await t.mutation(internal.eclipseMatches.runAi, { matchId: started.matchId, expectedRevision: revision });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId }))?.revision).toBe(revision);
    expect(await t.run(ctx => ctx.db.query("eclipseRoomTimersV1").collect())).toEqual([]);
  });

  it("ignores an obsolete solo timeout instead of taking over or rejecting the returning human", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const created = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings: solo, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: created.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: created.roomToken });
    await t.run(async ctx => {
      const room = await ctx.db.query("eclipseRoomsV1").withIndex("by_token", q => q.eq("roomToken", created.roomToken)).unique();
      await ctx.db.insert("eclipseRoomTimersV1", { roomId: room!._id, matchId: started.matchId, token: "old-timer", deadlineAt: 0, targetSeatId: "seat-1", decisionId: null, status: "active", error: null, timeoutSteps: 0, updatedAt: 0 });
    });
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken: created.roomToken, token: "old-timer" });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId }))?.revision).toBe(0);
    expect((await t.query(api.eclipseRooms.getRoom, { ...host, roomToken: created.roomToken }))?.timer).toBeNull();
    const accepted = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId: started.matchId, commandId: "solo-return", expectedRevision: 0, command: { type: "pass" } });
    expect(accepted.ok).toBe(true);
  });
});
