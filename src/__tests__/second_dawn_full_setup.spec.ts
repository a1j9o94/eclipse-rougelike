import { describe, expect, it } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";
import { getPlayerView } from "../../shared/eclipse/protocol";

describe("actual Second Dawn setup and action dispatcher", () => {
  it.each([2, 3, 4, 5, 6])(
    "sets up %i seats deterministically with finite supplies",
    (count) => {
      const config = {
        seed: 73,
        warpPortals: true,
        seats: BASE_FACTIONS.slice(0, count).map((f, i) => ({
          id: `p${i}`,
          faction: f.id,
          controller: i ? ("ai" as const) : ("human" as const),
        })),
      };
      const game = createGame(config);
      expect(game).toEqual(createGame(config));
      expect(game.sectors).toHaveLength(7);
      expect(game.ships.filter((s) => s.type === "guardian")).toHaveLength(
        6 - count,
      );
      expect(game.ships.filter((s) => s.type === "gcds")).toHaveLength(1);
      expect(game.phase).toBe("action");
      expect(game.engine?.scores).toBeNull();
      expect(game.seats.every((s) => s.blueprints.length === 4)).toBe(true);
      expect(JSON.stringify(getPlayerView(game, "p0"))).not.toContain(
        "sectorDiscoveries",
      );
    },
  );
  it("does not allow the two sides of a physical faction board in one game", () => {
    expect(() =>
      createGame({
        seed: 1,
        warpPortals: true,
        seats: [
          { id: "a", faction: "eridani", controller: "human" },
          { id: "b", faction: "terran-directorate", controller: "ai" },
        ],
      }),
    ).toThrow();
  });
  it("builds a ship using materials, one disc and a complete action", () => {
    const game = createGame({
      seed: 1,
      warpPortals: true,
      seats: [
        { id: "a", faction: "terran-directorate", controller: "human" },
        { id: "b", faction: "hydran", controller: "ai" },
      ],
    });
    const home = game.sectors.find((s) => s.owner === "a")!;
    const result = processGameCommand(game, "a", {
      type: "build",
      builds: [{ sectorId: home.id, component: "interceptor" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.seats[0].resources.materials).toBe(1);
    expect(result.state.seats[0].influenceOnTrack).toBe(
      game.seats[0].influenceOnTrack - 1,
    );
    expect(result.state.ships.filter((s) => s.owner === "a")).toHaveLength(2);
    expect(result.state.activeSeatId).toBe("a");
    const ended = processGameCommand(result.state, "a", { type: "end-action" });
    expect(ended.ok && ended.state.activeSeatId).toBe("b");
    expect(game.ships.filter((s) => s.owner === "a")).toHaveLength(1);
  });
  it("rejects invalid build commands without spending any resources or discs", () => {
    const game = createGame({
      seed: 1,
      warpPortals: true,
      seats: [
        { id: "a", faction: "terran-directorate", controller: "human" },
        { id: "b", faction: "hydran", controller: "ai" },
      ],
    });
    const before = JSON.stringify(game);
    expect(
      processGameCommand(game, "a", {
        type: "build",
        builds: [{ sectorId: "001", component: "dreadnought" }],
      }).ok,
    ).toBe(false);
    expect(JSON.stringify(game)).toBe(before);
  });
});
