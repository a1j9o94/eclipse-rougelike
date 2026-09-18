import { describe, expect, it } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import type { GameState } from "../../shared/eclipse/types";
function fixture(): GameState {
  return createGame({
    seed: 777,
    warpPortals: true,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "terran-federation", controller: "ai" },
    ],
  });
}
describe("independent publisher action integration review", () => {
  it("moves an influence disc directly from its sole source to an adjacent empty sector", () => {
    const s = fixture();
    s.sectors = [
      {
        id: "source",
        tileId: "001",
        position: { q: 0, r: 0 },
        rotation: 0,
        owner: "a",
        population: [],
        orbital: false,
        monolith: false,
        discovery: false,
      },
      {
        id: "destination",
        tileId: "001",
        position: { q: 1, r: 0 },
        rotation: 0,
        owner: null,
        population: [],
        orbital: false,
        monolith: false,
        discovery: false,
      },
    ];
    s.ships = [];
    const result = processGameCommand(s, "a", {
      type: "influence",
      removeSectorIds: ["source"],
      addSectorIds: ["destination"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.sectors[0].owner).toBeNull();
      expect(result.state.sectors[1].owner).toBe("a");
      expect(result.state.seats[0].influenceOnTrack).toBe(
        s.seats[0].influenceOnTrack - 1,
      );
    }
  });
  it("cannot relocate an installed ancient part even within one blueprint", () => {
    const s = fixture();
    const bp = s.seats[0].blueprints[0];
    bp.parts[0] = "ion-disruptor";
    const before = structuredClone(s);
    const parts = [...bp.parts];
    parts[0] = null;
    parts[3] = "ion-disruptor";
    const result = processGameCommand(s, "a", {
      type: "upgrade",
      blueprints: [{ ...bp, parts }],
    });
    expect(result.ok).toBe(false);
    expect(s).toEqual(before);
  });
  it("rejects duplicate colonies atomically including population tracks and colony ships", () => {
    const s = fixture(),
      home = s.sectors.find((x) => x.owner === "a")!;
    home.population = [];
    const before = structuredClone(s);
    const result = processGameCommand(s, "a", {
      type: "colonize",
      placements: [
        { sectorId: home.id, squareId: "p0", resource: "money" },
        { sectorId: home.id, squareId: "p0", resource: "money" },
      ],
    });
    expect(result.ok).toBe(false);
    expect(s).toEqual(before);
  });
  it("requires the resource-specific advanced technology for a gray square", () => {
    const s = fixture();
    s.sectors.push({
      id: "gray",
      tileId: "110",
      position: { q: 3, r: 0 },
      rotation: 0,
      owner: "a",
      population: [],
      orbital: false,
      monolith: false,
      discovery: false,
    });
    s.seats[0].technologies.nano.push("advanced-economy");
    const bad = processGameCommand(s, "a", {
      type: "colonize",
      placements: [{ sectorId: "gray", squareId: "p1", resource: "science" }],
    });
    expect(bad.ok).toBe(false);
    const good = processGameCommand(s, "a", {
      type: "colonize",
      placements: [{ sectorId: "gray", squareId: "p1", resource: "money" }],
    });
    expect(good.ok).toBe(true);
  });
  it("lets a gray cube return to a different resource track when abandoning a sector", () => {
    const s = fixture();
    s.sectors.push({
      id: "gray",
      tileId: "313",
      position: { q: 3, r: 0 },
      rotation: 0,
      owner: "a",
      population: [{ squareId: "p0", resource: "money" }],
      orbital: false,
      monolith: false,
      discovery: false,
    });
    s.seats[0].populationTracks.money++;
    const result = processGameCommand(s, "a", {
      type: "influence",
      removeSectorIds: ["gray"],
      addSectorIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const d = result.state.pendingDecision!;
    expect(d.kind).toBe("population-return");
    const chosen = processGameCommand(result.state, "a", {
      type: "resolve",
      decisionId: d.id,
      choice: { kind: "population-return", resources: ["science"] },
    });
    expect(chosen.ok).toBe(true);
    if (chosen.ok)
      expect(chosen.state.seats[0].populationTracks.science).toBe(
        s.seats[0].populationTracks.science - 1,
      );
  });
  it("does not permit a third build activation by splitting an action into commands", () => {
    const s = fixture();
    s.seats[0].resources.materials = 100;
    const home = s.sectors.find((x) => x.owner === "a")!.id;
    let result = processGameCommand(s, "a", {
      type: "build",
      builds: [{ sectorId: home, component: "interceptor" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    result = processGameCommand(result.state, "a", {
      type: "build",
      builds: [{ sectorId: home, component: "interceptor" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const before = structuredClone(result.state);
    const third = processGameCommand(result.state, "a", {
      type: "build",
      builds: [{ sectorId: home, component: "interceptor" }],
    });
    expect(third.ok).toBe(false);
    expect(result.state).toEqual(before);
  });
});
