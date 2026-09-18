import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { GameState } from "../../shared/eclipse/types";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const settings = { humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: true };

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function guests(t: ReturnType<typeof convexTest>) {
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const outsider = await t.action(api.eclipseGuests.createGuestSession, {});
  return { host, guest, outsider };
}

async function twoSeatRoom(t: ReturnType<typeof convexTest>) {
  const identities = await guests(t);
  const room = await t.mutation(api.eclipseRooms.createRoom, {
    ...identities.host,
    settings,
    faction: "terran-directorate",
  });
  await t.mutation(api.eclipseRooms.joinRoom, {
    ...identities.guest,
    roomToken: room.roomToken,
    faction: "hydran",
  });
  return { ...identities, room };
}

describe("independent multiplayer room review", () => {
  it("enforces room ownership for faction, settings, readiness, and start mutations", async () => {
    const t = convexTest(schema, modules);
    const { host, outsider, room } = await twoSeatRoom(t);
    await expect(t.mutation(api.eclipseRooms.chooseRoomFaction, {
      ...outsider, roomToken: room.roomToken, faction: "planta",
    })).rejects.toThrow("does not occupy");
    await expect(t.mutation(api.eclipseRooms.setRoomReady, {
      ...outsider, roomToken: room.roomToken, ready: true,
    })).rejects.toThrow("does not occupy");
    await expect(t.mutation(api.eclipseRooms.updateRoomSettings, {
      ...outsider, roomToken: room.roomToken, settings: { ...settings, timerMs: 120_000 },
    })).rejects.toThrow("host");
    await expect(t.mutation(api.eclipseRooms.startRoom, {
      ...outsider, roomToken: room.roomToken,
    })).rejects.toThrow("host");
    const after = await t.query(api.eclipseRooms.getRoom, { roomToken: room.roomToken, credential: host.credential });
    expect(after?.seats.map((seat) => seat.ready)).toEqual([false, false]);
    expect(after?.settings.timerMs).toBe(settings.timerMs);
  });

  it("retains one legal join under a concurrent capacity race and rejects color collisions", async () => {
    const t = convexTest(schema, modules);
    const { host, guest, outsider } = await guests(t);
    const room = await t.mutation(api.eclipseRooms.createRoom, {
      ...host, settings, faction: "terran-directorate",
    });
    await expect(t.mutation(api.eclipseRooms.joinRoom, {
      ...guest, roomToken: room.roomToken, faction: "eridani",
    })).rejects.toThrow("unused board color");
    const results = await Promise.allSettled([
      t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: "hydran" }),
      t.mutation(api.eclipseRooms.joinRoom, { ...outsider, roomToken: room.roomToken, faction: "planta" }),
    ]);
    // Exactly one contender can claim the last seat; the other request sees a full room.
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const lobby = await t.query(api.eclipseRooms.getRoom, { roomToken: room.roomToken });
    expect(lobby?.seats.filter((seat) => seat.occupied)).toHaveLength(2);
    expect(lobby?.seats[0].faction).toBe("terran-directorate");
    expect(["hydran", "planta"]).toContain(lobby?.seats[1].faction);
  });

  it("transfers a waiting-room host on departure and clears readiness", async () => {
    const t = convexTest(schema, modules);
    const { host, guest, room } = await twoSeatRoom(t);
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.leaveRoom, { ...host, roomToken: room.roomToken });
    const promoted = await t.query(api.eclipseRooms.getRoom, { roomToken: room.roomToken, credential: guest.credential });
    expect(promoted).toMatchObject({ viewerSlot: 2, viewerIsHost: true, status: "waiting" });
    expect(promoted?.seats).toEqual([
      expect.objectContaining({ slot: 1, occupied: false, ready: false }),
      expect.objectContaining({ slot: 2, occupied: true, isHost: true, ready: false }),
    ]);
  });

  it("denies fresh commands after timeout but replays an accepted duplicate receipt", async () => {
    const t = convexTest(schema, modules);
    const { host, guest, room } = await twoSeatRoom(t);
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
    const first = await t.mutation(api.eclipseMatches.submitCommand, {
      ...host, matchId: started.matchId, commandId: "review-original-pass", expectedRevision: 0, command: { type: "pass" },
    });
    expect(first).toMatchObject({ ok: true, duplicate: false });
    await t.run(async (ctx) => {
      const timer = await ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (query) => query.eq("matchId", started.matchId)).unique();
      await ctx.db.patch(timer!._id, { targetSeatId: "seat-1", deadlineAt: 0, status: "timed-out" });
    });
    const duplicate = await t.mutation(api.eclipseMatches.submitCommand, {
      ...host, matchId: started.matchId, commandId: "review-original-pass", expectedRevision: 0, command: { type: "pass" },
    });
    expect(duplicate).toMatchObject({ ok: true, duplicate: true, receipt: first.ok ? first.receipt : undefined });
    const late = await t.mutation(api.eclipseMatches.submitCommand, {
      ...host, matchId: started.matchId, commandId: "review-late-pass", expectedRevision: 1, command: { type: "pass" },
    });
    expect(late).toMatchObject({ ok: false, error: { code: "TURN_TIMEOUT" } });
  });

  it("returns only the viewer's private data and hides an opponent-owned decision", async () => {
    const t = convexTest(schema, modules);
    const { host, guest, room } = await twoSeatRoom(t);
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
    await t.run(async (ctx) => {
      const match = await ctx.db.get(started.matchId);
      const state = JSON.parse(match!.snapshotJson) as GameState;
      state.privateSeats = state.privateSeats.map((seat) => ({ ...seat, reputation: seat.seatId === "seat-1" ? [4, 3] : [1] }));
      state.pendingDecision = { id: "host-only-reputation", owner: "seat-1", kind: "reputation", drawn: [2], capacity: 4 };
      state.revision += 1;
      await ctx.db.patch(match!._id, { snapshotJson: JSON.stringify(state), revision: state.revision });
    });
    const hostView = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
    const guestView = await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId: started.matchId });
    expect(hostView?.private).toMatchObject({ seatId: "seat-1", reputation: [4, 3] });
    expect(hostView?.pendingDecision).toMatchObject({ id: "host-only-reputation" });
    expect(guestView?.private).toMatchObject({ seatId: "seat-2", reputation: [1] });
    expect(guestView?.pendingDecision).toBeNull();
    expect(guestView?.waitingFor).toEqual({ owner: "seat-1", kind: "reputation" });
    expect(JSON.stringify(guestView?.private)).not.toContain("4");
  });
});
