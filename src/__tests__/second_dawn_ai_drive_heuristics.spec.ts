import { generateAiCandidates } from "../../shared/eclipse/aiCandidates";
import { evaluateAiCommand } from "../../shared/eclipse/ai";
import { chooseStrategicAiCommand } from "../../shared/eclipse/aiSearch";
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

    expect(
      strategicCommandAdjustment(funded, invasion(funded)),
    ).toBeGreaterThan(
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
    ).toBeGreaterThan(
      strategicCommandAdjustment(blocked, invasion(blocked)) + 8,
    );
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

it("does not credit computers for Rift-only weapons or shields against a Rift-only enemy", () => {
  const view = getPlayerView(game(), "a");
  view.round = 6;
  const own = view.seats[0].blueprints.find(
    (b) => b.shipType === "interceptor",
  )!;
  own.parts = ["rift-cannon", "fusion-source", "nuclear-drive", "hull"];
  const computer: GameCommand = {
    type: "upgrade",
    blueprints: [
      {
        ...own,
        parts: [
          "rift-cannon",
          "fusion-source",
          "nuclear-drive",
          "gluon-computer",
        ],
      },
    ],
  };
  const weak = structuredClone(view);
  weak.seats[0].blueprints.find((b) => b.shipType === "interceptor")!.parts[3] =
    "electron-computer";
  const compOnly: GameCommand = {
    type: "upgrade",
    blueprints: [
      {
        ...own,
        parts: [
          "rift-cannon",
          "fusion-source",
          "nuclear-drive",
          "gluon-computer",
        ],
      },
    ],
  };
  expect(strategicCommandAdjustment(weak, compOnly)).toBe(0);
  weak.round = 3;
  weak.ships.push({
    id: "ancient-test",
    owner: "ancient",
    type: "ancient",
    sectorId: weak.sectors[0].id,
    damage: 0,
  });
  expect(strategicCommandAdjustment(weak, compOnly)).toBe(0);
  const enemy = view.seats[1].blueprints.find(
    (b) => b.shipType === "interceptor",
  )!;
  enemy.parts = ["rift-cannon", "fusion-source", "nuclear-drive", "hull"];
  own.parts[3] = "gauss-shield";
  const shield: GameCommand = {
    type: "upgrade",
    blueprints: [
      {
        ...own,
        parts: [
          "rift-cannon",
          "fusion-source",
          "nuclear-drive",
          "phase-shield",
        ],
      },
    ],
  };
  expect(strategicCommandAdjustment(view, shield)).toBe(0);
  expect(strategicCommandAdjustment(view, computer)).toBeLessThanOrEqual(0);
});

it("ignores a transit destination when the same ship finishes its multi-entry route elsewhere", () => {
  const view = getPlayerView(conquestGame(), "a"),
    move = invasion(view);
  if (move.type !== "move") throw new Error("Expected move");
  const home = view.sectors.find((s) => s.owner === "a")!;
  move.moves.push({ shipId: move.moves[0].shipId, path: [home.id] });
  expect(strategicCommandAdjustment(view, move)).toBe(0);
});

it("estimates Rift bombardment damage independently from computers", () => {
  const view = getPlayerView(conquestGame(), "a");
  const own = view.seats[0].blueprints.find(
    (b) => b.shipType === "interceptor",
  )!;
  own.parts = ["rift-cannon", "fusion-source", "nuclear-drive", "hull"];
  const before = strategicCommandAdjustment(view, invasion(view));
  own.parts[3] = "gluon-computer";
  expect(strategicCommandAdjustment(view, invasion(view))).toBe(before);
});

it("ranks a legal deployed-fleet hull refit above an unused-class refit in the final round", () => {
  const state = game();
  state.round = 8;
  state.activeSeatId = "a";
  state.seats[0].technologies.grid.push("improved-hull");
  const view = getPlayerView(state, "a");
  const candidates = generateAiCandidates(view).filter(
    (candidate) => candidate.command.type === "upgrade",
  );
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      value:
        evaluateAiCommand(view, candidate.command) +
        strategicCommandAdjustment(view, candidate.command),
    }))
    .sort((a, b) => b.value - a.value);
  expect(ranked.length).toBeGreaterThan(1);
  const best = ranked[0].command;
  expect(
    best.type === "upgrade" &&
      best.blueprints.some((b) => b.shipType === "interceptor"),
  ).toBe(true);
  expect(processGameCommand(state, "a", best).ok).toBe(true);
  const unused = ranked.find(
    (candidate) =>
      candidate.command.type === "upgrade" &&
      candidate.command.blueprints.every((b) => b.shipType !== "interceptor"),
  );
  expect(unused).toBeDefined();
  expect(ranked[0].value).toBeGreaterThan(unused!.value);
});

it.each(["hard", "expert"] as const)(
  "keeps %s fixed-budget choices legal and independent of hidden deck order",
  (difficulty) => {
    for (const seed of [13, 27]) {
      const state = game();
      state.activeSeatId = "a";
      const view = getPlayerView(state, "a");
      const options = { difficulty, maxNodes: 8, budgetMs: 1000, now: () => 0 };
      const first = chooseStrategicAiCommand(view, seed, options)!;
      expect(first.search.nodes).toBeGreaterThan(0);
      expect(first.search.nodes).toBeLessThanOrEqual(8);
      expect(processGameCommand(state, "a", first.command).ok).toBe(true);
      state.supplies.technology.reverse();
      state.supplies.discovery.reverse();
      state.random.value = 99;
      expect(
        chooseStrategicAiCommand(getPlayerView(state, "a"), seed, options)!
          .command,
      ).toEqual(first.command);
    }
  },
);
