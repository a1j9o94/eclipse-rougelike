import { describe, expect, it } from "vitest";
import { strategicCommandAdjustment } from "../../shared/eclipse/aiStrategy";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { SECTORS } from "../../shared/eclipse/sectors";
import { createGame } from "../../shared/eclipse/setup";
import type { GameCommand, PlayerView } from "../../shared/eclipse/types";

function game() {
  return createGame({
    seed: 41,
    warpPortals: true,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "ai" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
}

function invasion(view: PlayerView): GameCommand {
  const ship = view.ships.find((item) => item.owner === "a")!;
  const target = view.sectors.find((sector) => sector.owner === "b")!;
  return {
    type: "move",
    moves: [{ shipId: ship.id, path: [target.id] }],
  };
}

function conquestGame() {
  const state = game();
  const source = state.sectors.find((sector) => sector.owner === "a")!;
  const target = state.sectors.find((sector) => sector.owner === "b")!;
  const tiles = SECTORS.filter(
    (sector) =>
      sector.wormholes.includes(0) &&
      sector.wormholes.includes(3) &&
      !sector.warpPortal,
  ).slice(0, 2);
  state.sectors = [source, target];
  state.sectors.forEach((sector, index) => {
    sector.position = { q: index, r: 0 };
    sector.rotation = 0;
    sector.tileId = String(tiles[index].id);
  });
  state.ships = state.ships.filter(
    (ship) => ship.owner === "a" || ship.owner === "b",
  );
  state.ships.forEach((ship) => {
    ship.sectorId = ship.owner === "a" ? source.id : target.id;
  });
  return state;
}

function hullUpgrade(view: PlayerView): GameCommand {
  const blueprint = view.seats[0].blueprints.find(
    (item) => item.shipType === "interceptor",
  )!;
  const upgraded = {
    ...blueprint,
    parts: [...blueprint.parts],
    outsideParts: [...(blueprint.outsideParts ?? [])],
  };
  upgraded.parts[upgraded.parts.length - 1] = "improved-hull";
  return { type: "upgrade", blueprints: [upgraded] };
}

describe("Drive strategy follow-through priors", () => {
  it("reserves the second influence disc needed to control a conquest", () => {
    const state = conquestGame();
    const funded = getPlayerView(state, "a")!;
    funded.seats[0].influenceOnTrack = 2;
    const exhausted = structuredClone(funded);
    exhausted.seats[0].influenceOnTrack = 1;
    expect(processGameCommand(state, "a", invasion(funded))).toMatchObject({
      ok: true,
    });

    expect(strategicCommandAdjustment(funded, invasion(funded))).toBeGreaterThan(
      strategicCommandAdjustment(exhausted, invasion(exhausted)) + 15,
    );
  });

  it("does not treat Neutron Bombs as guaranteed conquest through an absorber", () => {
    const clearable = getPlayerView(conquestGame(), "a")!;
    clearable.seats[0].influenceOnTrack = 3;
    clearable.seats[0].technologies.military.push("neutron-bombs");
    const blocked = structuredClone(clearable);
    blocked.seats[1].technologies.military.push("neutron-absorber");

    expect(
      strategicCommandAdjustment(clearable, invasion(clearable)),
    ).toBeGreaterThan(strategicCommandAdjustment(blocked, invasion(blocked)) + 8);
  });

  it("values an Ancient-hunting refit when that hull is deployed, not in storage", () => {
    const deployed = getPlayerView(game(), "a")!;
    deployed.round = 3;
    deployed.seats[0].technologies.grid.push("improved-hull");
    const target = deployed.sectors.find((sector) => sector.owner === null)!;
    target.owner = null;
    target.population = [];
    deployed.ships.push({
      id: "visible-ancient",
      owner: "ancient",
      type: "ancient",
      sectorId: target.id,
      damage: 0,
    });
    const command = hullUpgrade(deployed);
    const stored = structuredClone(deployed);
    stored.ships = stored.ships.filter((ship) => ship.owner !== "a");

    expect(strategicCommandAdjustment(deployed, command)).toBeGreaterThan(
      strategicCommandAdjustment(stored, command) + 5,
    );
  });

  it("prepares for visible Ancients only while the follow-through window remains", () => {
    const noTarget = getPlayerView(game(), "a")!;
    noTarget.round = 3;
    noTarget.seats[0].influenceOnTrack = 3;
    noTarget.ships = noTarget.ships.filter((ship) => ship.type !== "ancient");
    const prepared = structuredClone(noTarget);
    prepared.ships.push({
      id: "ancient-opportunity",
      owner: "ancient",
      type: "ancient",
      sectorId: prepared.sectors.find((sector) => sector.owner === null)!.id,
      damage: 0,
    });
    const late = structuredClone(prepared);
    late.round = 6;
    const command: GameCommand = {
      type: "research",
      tileId: "plasma-cannon",
      track: "military",
    };

    expect(strategicCommandAdjustment(prepared, command)).toBeGreaterThan(
      strategicCommandAdjustment(noTarget, command) + 4,
    );
    expect(strategicCommandAdjustment(prepared, command)).toBeGreaterThan(
      strategicCommandAdjustment(late, command) + 4,
    );
  });

  it("pays more for hull against a visibly heavier opposing battery", () => {
    const lightThreat = getPlayerView(game(), "a")!;
    lightThreat.round = 6;
    lightThreat.seats[0].technologies.grid.push("improved-hull");
    const heavyThreat = structuredClone(lightThreat);
    heavyThreat.ships.find((ship) => ship.owner === "b")!.type = "dreadnought";

    expect(
      strategicCommandAdjustment(heavyThreat, hullUpgrade(heavyThreat)),
    ).toBeGreaterThan(
      strategicCommandAdjustment(lightThreat, hullUpgrade(lightThreat)),
    );
  });

  it("prices the actual marginal research VP in the final round", () => {
    const threshold = getPlayerView(game(), "a")!;
    threshold.round = 8;
    threshold.seats[0].technologies.grid = [
      "starbase",
      "gauss-shield",
      "improved-hull",
      "fusion-source",
      "positron-computer",
      "advanced-economy",
    ];
    const noPoint = structuredClone(threshold);
    noPoint.seats[0].technologies.grid = ["starbase", "gauss-shield"];
    const command: GameCommand = {
      type: "research",
      tileId: "quantum-grid",
      track: "grid",
    };

    expect(strategicCommandAdjustment(threshold, command)).toBeGreaterThan(
      strategicCommandAdjustment(noPoint, command) + 8,
    );
  });
});
