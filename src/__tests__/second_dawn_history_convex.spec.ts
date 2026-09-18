import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
const modules = import.meta.glob("../../convex/**/*.{ts,js}");
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("authorizes history and pages durable revisions without leaking choices on reconnect", async () => {
  const t = convexTest(schema, modules);
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
  await t.run(async (ctx) => {
    for (let revision = 1; revision <= 5; revision++) {
      const commandId = `command-${revision}`;
      await ctx.db.insert("eclipseJournalV1", {
        matchId,
        actor: "seat-2",
        commandId,
        revision,
        requestJson: JSON.stringify({
          commandId,
          expectedRevision: revision - 1,
          command: { type: "discard-reputation", values: [4, 3] },
        }),
        receipt: { commandId, revision, eventCount: 1 },
        eventsJson: JSON.stringify([
          {
            type: "draw",
            seatId: "seat-2",
            visibility: { seatId: "seat-2" },
            message: "Secret reputation 4",
          },
        ]),
        createdAt: revision,
      });
    }
  });
  const first = await t.query(api.eclipseMatches.getMatchHistory, {
    ...guest,
    matchId,
    limit: 2,
  });
  expect(first?.entries.map((e) => e.revision)).toEqual([5, 4]);
  expect(first?.nextBeforeRevision).toBe(4);
  expect(JSON.stringify(first)).not.toMatch(/Secret|values|commandId/);
  const second = await t.query(api.eclipseMatches.getMatchHistory, {
    ...guest,
    matchId,
    limit: 2,
    beforeRevision: 4,
  });
  expect(second?.entries.map((e) => e.revision)).toEqual([3, 2]);
  expect(
    await t.query(api.eclipseMatches.getMatchHistory, {
      ...guest,
      matchId,
      limit: 2,
      beforeRevision: 4,
    }),
  ).toEqual(second);
  expect(
    (
      await t.query(api.eclipseMatches.getMatchHistory, {
        ...guest,
        matchId,
        beforeRevision: 2,
      })
    )?.nextBeforeRevision,
  ).toBeNull();
  const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
  expect(
    await t.query(api.eclipseMatches.getMatchHistory, { ...stranger, matchId }),
  ).toBeNull();
  expect(
    await t.query(api.eclipseMatches.getMatchHistory, {
      credential: "bad",
      matchId,
    }),
  ).toBeNull();
});
it("persists a real accepted action round once across duplicate submissions", async () => {
  const t = convexTest(schema, modules);
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
  await t.run(async (ctx) => {
    const row = await ctx.db.get(matchId);
    const state = JSON.parse(
      row!.snapshotJson,
    ) as import("../../shared/eclipse/types").GameState;
    state.activeSeatId = "seat-1";
    await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
  });
  const request = {
    ...guest,
    matchId,
    commandId: "history-pass",
    expectedRevision: 0,
    command: { type: "pass" as const },
  };
  expect(
    await t.mutation(api.eclipseMatches.submitCommand, request),
  ).toMatchObject({ ok: true });
  await t.mutation(api.eclipseMatches.submitCommand, request);
  const history = await t.query(api.eclipseMatches.getMatchHistory, {
    ...guest,
    matchId,
  });
  expect(history?.entries).toHaveLength(1);
  expect(history?.entries[0]).toMatchObject({
    revision: 1,
    round: 1,
    actorSeatId: "seat-1",
    summary: "Passed",
  });
});
