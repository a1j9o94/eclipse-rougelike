import { describe, it, expect } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
const game = () =>
  createGame({
    seed: 42,
    warpPortals: true,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
describe("complete command action boundary", () => {
  it("persists an exploration draw and cannot redraw on invalid rotation", () => {
    const s = game();
    const draw = processGameCommand(s, "a", {
      type: "explore",
      position: { q: 0, r: -1 },
    });
    expect(draw.ok).toBe(true);
    if (!draw.ok) return;
    const d = draw.state.pendingDecision;
    expect(d?.kind).toBe("exploration");
    if (d?.kind !== "exploration") return;
    const before = JSON.stringify(draw.state);
    expect(
      processGameCommand(draw.state, "a", {
        type: "resolve",
        decisionId: d.id,
        choice: {
          kind: "exploration",
          tileId: d.drawnTileIds[0],
          rotation: 99,
        },
      }).ok,
    ).toBe(false);
    expect(JSON.stringify(draw.state)).toBe(before);
    const p = d.placements[0];
    const placed = processGameCommand(draw.state, "a", {
      type: "resolve",
      decisionId: d.id,
      choice: { kind: "exploration", ...p },
    });
    expect(placed.ok).toBe(true);
  });
  it("prevents an opponent from consuming a persisted choice", () => {
    const s = game();
    const draw = processGameCommand(s, "a", {
      type: "explore",
      position: { q: 0, r: -1 },
    });
    if (!draw.ok) throw Error(draw.error.message);
    const d = draw.state.pendingDecision!;
    expect(
      processGameCommand(draw.state, "b", {
        type: "resolve",
        decisionId: d.id,
        choice: { kind: "exploration", tileId: null, rotation: 0 },
      }).ok,
    ).toBe(false);
  });
  it("keeps insufficient research atomic and accepts a researched legal upgrade", () => {
    const s = game();
    s.technologyMarket = ["fusion-drive"];
    s.seats[0].resources.science = 0;
    expect(
      processGameCommand(s, "a", {
        type: "research",
        tileId: "fusion-drive",
        track: "grid",
      }).ok,
    ).toBe(false);
    expect(s.seats[0].actionDiscs.research).toBe(0);
    s.seats[0].technologies.grid.push("fusion-drive");
    const b = structuredClone(s.seats[0].blueprints[0]);
    b.parts[2] = "fusion-drive";
    expect(
      processGameCommand(s, "a", { type: "upgrade", blueprints: [b] }).ok,
    ).toBe(true);
  });
  it("places a sector when the finite Ancient supply is exhausted without inventing ships", () => {
    const s = game();
    for (let i = 0; i < 14; i++)
      s.ships.push({
        id: `anc-${i}`,
        owner: "ancient",
        type: "ancient",
        sectorId: "001",
        damage: 0,
      });
    s.pendingDecision = {
      id: "draw",
      owner: "a",
      kind: "exploration",
      position: { q: 0, r: -1 },
      drawnTileIds: ["109"],
      placements: [{ tileId: "109", rotation: 0 }],
    };
    const r = processGameCommand(s, "a", {
      type: "resolve",
      decisionId: "draw",
      choice: { kind: "exploration", tileId: "109", rotation: 0 },
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.state.ships.filter((ship) => ship.type === "ancient"),
      ).toHaveLength(14);
  });
  it("permits a researched portal on a controlled sector that already has an ancient portal", () => {
    const s = game(),
      home = s.sectors.find((t) => t.owner === "a")!;
    home.portalVp = 2;
    s.technologyMarket = ["warp-portal"];
    s.seats[0].resources.science = 99;
    const r = processGameCommand(s, "a", {
      type: "research",
      tileId: "warp-portal",
      track: "grid",
    });
    if (!r.ok) throw Error(r.error.message);
    const d = r.state.pendingDecision!;
    const p = processGameCommand(r.state, "a", {
      type: "resolve",
      decisionId: d.id,
      choice: { kind: "portal-placement", sectorId: home.id },
    });
    expect(p.ok).toBe(true);
    if (p.ok)
      expect(p.state.sectors.find((t) => t.id === home.id)?.portalVp).toBe(3);
  });
  it("resolves ancient labs placement discoveries in the starting sector", () => {
    const s = game();
    s.technologyMarket = ["ancient-labs"];
    s.supplies.discovery = ["ancient-cruiser"];
    s.seats[0].resources.science = 99;
    const r = processGameCommand(s, "a", {
      type: "research",
      tileId: "ancient-labs",
      track: "nano",
    });
    if (!r.ok) throw Error(r.error.message);
    const d = r.state.pendingDecision!;
    const used = processGameCommand(r.state, "a", {
      type: "resolve",
      decisionId: d.id,
      choice: { kind: "discovery", option: "use" },
    });
    expect(used.ok).toBe(true);
    if (used.ok)
      expect(
        used.state.ships.some(
          (ship) => ship.owner === "a" && ship.type === "cruiser",
        ),
      ).toBe(true);
  });
  it("permits colonization between a completed action and ending the turn", () => {
    const s = game();
    s.seats[0].technologies.grid.push("advanced-economy");
    const home = s.sectors.find((t) => t.owner === "a")!;
    const build = processGameCommand(s, "a", {
      type: "build",
      builds: [{ sectorId: home.id, component: "interceptor" }],
    });
    if (!build.ok) throw Error(build.error.message);
    const result = processGameCommand(build.state, "a", {
      type: "colonize",
      placements: [{ sectorId: home.id, squareId: "p1", resource: "money" }],
    });
    expect(result.ok).toBe(true);
  });
});
