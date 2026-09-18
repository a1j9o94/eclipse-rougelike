import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { GameState } from "../../shared/eclipse/types";
const modules = import.meta.glob("../../convex/**/*.{ts,js}");
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("journals the atomic funded action once and retries without spending twice", async () => {
  const t = convexTest(schema, modules);
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
  await t.run(async (ctx) => {
    const match = await ctx.db.get(matchId);
    const state = JSON.parse(match!.snapshotJson) as GameState;
    state.activeSeatId = "seat-1";
    state.technologyMarket = ["fusion-drive"];
    state.seats[0].resources = { money: 6, science: 1, materials: 0 };
    await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
  });
  const request = {
    ...guest,
    matchId,
    commandId: "fund-research",
    expectedRevision: 0,
    command: {
      type: "trade-and-act" as const,
      trades: [{ from: "money" as const, to: "science" as const, amount: 3 }],
      action: {
        type: "research" as const,
        tileId: "fusion-drive",
        track: "nano" as const,
      },
    },
  };
  expect(
    await t.mutation(api.eclipseMatches.submitCommand, request),
  ).toMatchObject({ ok: true, duplicate: false, receipt: { revision: 1 } });
  expect(
    await t.mutation(api.eclipseMatches.submitCommand, request),
  ).toMatchObject({ ok: true, duplicate: true });
  const view = await t.query(api.eclipseMatches.getMatchView, {
    ...guest,
    matchId,
  });
  expect(view?.seats[0].resources).toEqual({
    money: 0,
    science: 0,
    materials: 0,
  });
  expect(view?.seats[0].technologies.nano).toContain("fusion-drive");
  const history = await t.query(api.eclipseMatches.getMatchHistory, {
    ...guest,
    matchId,
  });
  expect(history?.entries).toHaveLength(1);
  expect(history?.entries[0].summary).toBe(
    "Converted resources · Researched Fusion Drive",
  );
  expect(
    history?.entries[0].details.some((detail) =>
      detail.includes("trading 6 money"),
    ),
  ).toBe(true);
});
