import {finishDispatchedAi} from './aiWorkerTestSupport';
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const MULTIPLAYER_TEST_RANDOM_SEED = 0x5eed_c0de;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.spyOn(Math, "random").mockImplementation(seededRandom(MULTIPLAYER_TEST_RANDOM_SEED));
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("multiplayer completion evidence", () => {
  it("starts six distinct human factions and gives every guest only its owned view", async () => {
    const t = convexTest(schema, modules);
    const factions = BASE_FACTIONS.filter((faction) => faction.species === "alien");
    expect(factions).toHaveLength(6);
    const players = await Promise.all(factions.map(() => t.action(api.eclipseGuests.createGuestSession, {})));
    const settings = { humanSeatCount: 6, aiCount: 0, timerMs: 30_000, warpPortals: true };
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...players[0], settings, faction: factions[0].id });
    for (let index = 1; index < players.length; index++) {
      await t.mutation(api.eclipseRooms.joinRoom, { ...players[index], roomToken: room.roomToken, faction: factions[index].id });
    }
    for (const player of players) await t.mutation(api.eclipseRooms.setRoomReady, { ...player, roomToken: room.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...players[0], roomToken: room.roomToken });
    expect(started.lobby).toMatchObject({ status: "playing", seats: expect.arrayContaining(factions.map((faction) => expect.objectContaining({ faction: faction.id, occupied: true, ready: true }))) });
    for (let index = 0; index < players.length; index++) {
      const view = await t.query(api.eclipseMatches.getMatchView, { ...players[index], matchId: started.matchId });
      expect(view?.viewerSeatId).toBe(`seat-${index + 1}`);
      expect(view?.private.seatId).toBe(`seat-${index + 1}`);
      expect(view?.seats).toEqual(expect.arrayContaining([expect.objectContaining({ id: `seat-${index + 1}`, controller: "human", faction: factions[index].id })]));
    }
  });

  it("finishes a two-human room entirely through bounded timed-out AI jobs", async () => {
    const t = convexTest(schema, modules);
    const host = await t.action(api.eclipseGuests.createGuestSession, {});
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const settings = { humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: true };
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, settings, faction: "eridani" });
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: "hydran" });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
    const started = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });

    let timeoutCommands = 0;
    for (; timeoutCommands < 3_000; timeoutCommands++) {
      const match = await t.run(async (ctx) => ctx.db.get(started.matchId));
      if (match?.phase === "finished") break;
      const timer = await t.run(async (ctx) => ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (query) => query.eq("matchId", started.matchId)).unique());
      expect(timer, `missing timer before timeout command ${timeoutCommands}`).not.toBeNull();
      expect(timer?.status, `timer failed before timeout command ${timeoutCommands}: ${timer?.error}`).not.toBe("failed");
      expect(timer?.status).not.toBe("finished");
      vi.setSystemTime(Math.max(Date.now(), timer!.deadlineAt) + 1);
      await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: timer!.token });
      await finishDispatchedAi(t);
    }

    const completed = await t.run(async (ctx) => ({
      match: await ctx.db.get(started.matchId),
      room: await ctx.db.query("eclipseRoomsV1").withIndex("by_match", (query) => query.eq("matchId", started.matchId)).unique(),
      timer: await ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (query) => query.eq("matchId", started.matchId)).unique(),
      journal: await ctx.db.query("eclipseJournalV1").withIndex("by_match_revision", (query) => query.eq("matchId", started.matchId)).order("asc").collect(),
    }));
    expect(timeoutCommands, "bounded timeout completion command count").toBeLessThan(3_000);
    expect(completed.match?.phase).toBe("finished");
    expect(completed.room?.status).toBe("finished");
    expect(completed.timer).toMatchObject({ status: "finished", error: null });
    const finalView = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId: started.matchId });
    expect(finalView?.scores).toHaveLength(2);
    expect(finalView?.aiStatus?.status).toBe("finished");
    expect(finalView?.scores?.every((score) => Number.isInteger(score.total))).toBe(true);
    expect(finalView?.seats.map((seat) => seat.controller)).toEqual(["human", "human"]);
    expect(completed.journal).toHaveLength(timeoutCommands);
    expect(completed.journal.map((entry) => entry.revision)).toEqual(Array.from({ length: timeoutCommands }, (_, index) => index + 1));
  }, 120_000);
});
