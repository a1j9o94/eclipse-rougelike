import { describe, it, expect } from "vitest";
import { estimatePublicBattle } from "../../shared/eclipse/aiSimulation";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
describe("fair bounded combat estimates", () => {
  it("simulates only visible fleets with independent deterministic randomness", () => {
    const state = createGame({
      seed: 3,
      warpPortals: true,
      seats: [
        { id: "a", faction: "orion", controller: "ai" },
        { id: "b", faction: "hydran", controller: "human" },
      ],
    });
    const view = getPlayerView(state, "a"),
      before = JSON.stringify(view),
      rng = structuredClone(state.random);
    const own = view.ships.filter((s) => s.owner === "a").map((s) => s.id),
      enemy = view.ships.filter((s) => s.owner === "b").map((s) => s.id);
    const result = estimatePublicBattle(view, own, enemy, 123, 32);
    expect(result).toEqual(estimatePublicBattle(view, own, enemy, 123, 32));
    expect(result.winProbability).toBeGreaterThan(0.5);
    expect(JSON.stringify(view)).toBe(before);
    expect(state.random).toEqual(rng);
  });
  it("recognizes an undefended destination without random rolls", () => {
    const state = createGame({
      seed: 3,
      warpPortals: true,
      seats: [
        { id: "a", faction: "orion", controller: "ai" },
        { id: "b", faction: "hydran", controller: "human" },
      ],
    });
    expect(
      estimatePublicBattle(
        getPlayerView(state, "a"),
        ["ship-a-start"],
        [],
        1,
        16,
      ).winProbability,
    ).toBe(1);
  });
});
