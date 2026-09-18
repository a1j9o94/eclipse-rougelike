import { describe, it, expect } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { processGameCommand } from "../../shared/eclipse/engine";
import { fundingOptions } from "../../shared/eclipse/funding";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { GameCommand } from "../../shared/eclipse/types";
const game = () => {
  const s = createGame({
    seed: 42,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
  s.activeSeatId = "a";
  s.technologyMarket = ["fusion-drive"];
  s.seats[0].resources = { money: 4, science: 1, materials: 2 };
  return s;
};
const research = {
  type: "research" as const,
  tileId: "fusion-drive",
  track: "nano" as const,
};
describe("atomic action funding", () => {
  it("combines two source currencies at the faction ratio and previews the exact resulting purchase", () => {
    const s = game();
    const options = fundingOptions(getPlayerView(s, "a")!, research);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      cost: 4,
      shortfall: 3,
      resourcesAfterTrade: { money: 0, science: 4, materials: 0 },
      resourcesAfter: { money: 0, science: 0, materials: 0 },
    });
    expect(options[0].trades).toHaveLength(2);
    const before = structuredClone(s);
    const result = processGameCommand(s, "a", options[0].command);
    expect(result.ok).toBe(true);
    expect(s).toEqual(before);
    if (!result.ok) return;
    expect(result.state.seats[0].resources).toEqual(options[0].resourcesAfter);
    expect(result.state.seats[0].technologies.nano).toContain("fusion-drive");
    expect(
      previewCommand(getPlayerView(s, "a")!, options[0].command).resourcesAfter,
    ).toEqual(result.state.seats[0].resources);
  });
  it("rolls back all trades if the funded action is illegal and rejects extra conversions", () => {
    const s = game();
    const option = fundingOptions(getPlayerView(s, "a")!, research)[0];
    s.technologyMarket = [];
    const before = structuredClone(s);
    expect(processGameCommand(s, "a", option.command).ok).toBe(false);
    expect(s).toEqual(before);
    s.technologyMarket = ["fusion-drive"];
    const excess: GameCommand = {
      ...option.command,
      trades: [{ from: "money", to: "science", amount: 4 }],
    };
    expect(processGameCommand(s, "a", excess).ok).toBe(false);
    expect(processGameCommand(s, "b", option.command).ok).toBe(false);
  });
  it("respects an open decision and offers no unnecessary or unaffordable trades", () => {
    const s = game();
    const option = fundingOptions(getPlayerView(s, "a")!, research)[0];
    s.pendingDecision = {
      id: "choice",
      owner: "a",
      kind: "reputation",
      drawn: [2],
      capacity: 4,
    };
    expect(processGameCommand(s, "a", option.command)).toMatchObject({
      ok: false,
      error: { code: "DECISION_PENDING" },
    });
    s.pendingDecision = null;
    s.seats[0].resources.science = 4;
    expect(fundingOptions(getPlayerView(s, "a")!, research)).toEqual([]);
    s.seats[0].resources = { money: 0, science: 0, materials: 0 };
    expect(fundingOptions(getPlayerView(s, "a")!, research)).toEqual([]);
  });
  it("uses faction construction prices and buys a real ship atomically", () => {
    const s = game();
    s.seats[0].resources = { money: 4, science: 0, materials: 1 };
    const home = s.sectors.find((sector) => sector.owner === "a")!;
    const action = {
      type: "build" as const,
      builds: [{ sectorId: home.id, component: "interceptor" as const }],
    };
    const plan = fundingOptions(getPlayerView(s, "a")!, action)[0];
    expect(plan.cost).toBe(3);
    const result = processGameCommand(s, "a", plan.command);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(
        result.state.ships.filter((ship) => ship.owner === "a"),
      ).toHaveLength(s.ships.filter((ship) => ship.owner === "a").length + 1);
  });
});
it("uses alien 3:1 exchange and rejects fractional, duplicated or chained conversions", () => {
  const s = game();
  s.seats[0].faction = "eridani";
  s.seats[0].resources = { money: 9, science: 1, materials: 0 };
  const plan = fundingOptions(getPlayerView(s, "a")!, research)[0];
  expect(plan.resourcesAfter).toEqual({ money: 0, science: 0, materials: 0 });
  for (const trades of [
    [{ from: "money" as const, to: "science" as const, amount: 1.5 }],
    [
      { from: "money" as const, to: "science" as const, amount: 1 },
      { from: "money" as const, to: "science" as const, amount: 2 },
    ],
    [
      { from: "money" as const, to: "materials" as const, amount: 1 },
      { from: "materials" as const, to: "science" as const, amount: 2 },
    ],
  ])
    expect(processGameCommand(s, "a", { ...plan.command, trades }).ok).toBe(
      false,
    );
  const before = structuredClone(s);
  const rejected = processGameCommand(s, "a", {
    type: "trade-and-act",
    trades: [{ from: "money", to: "materials", amount: 3 }],
    action: {
      type: "build",
      builds: [{ sectorId: "missing", component: "interceptor" }],
    },
  });
  expect(rejected.ok).toBe(false);
  expect(s).toEqual(before);
});
