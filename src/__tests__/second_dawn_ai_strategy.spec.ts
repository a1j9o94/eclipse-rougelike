import { describe, expect, it } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { processGameCommand } from "../../shared/eclipse/engine";
import { generateAiCandidates } from "../../shared/eclipse/aiCandidates";
import { SECTORS } from "../../shared/eclipse/sectors";
import { evaluateAiCommand } from "../../shared/eclipse/ai";
const game = () =>
  createGame({
    seed: 9,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "ai" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
describe("strategic AI candidate plans", () => {
  it("includes affordable batch builds and funded purchases, all accepted by the authoritative engine", () => {
    const state = game();
    state.seats[0].resources = { money: 30, science: 0, materials: 15 };
    state.technologyMarket = ["improved-hull"];
    const view = getPlayerView(state, "a");
    const before = structuredClone(view);
    const candidates = generateAiCandidates(view);
    expect(
      candidates.some(
        (c) => c.command.type === "build" && c.command.builds.length > 1,
      ),
    ).toBe(true);
    expect(
      candidates.some(
        (c) =>
          c.command.type === "trade-and-act" &&
          c.command.action.type === "research",
      ),
    ).toBe(true);
    for (const c of candidates)
      expect(
        processGameCommand(state, "a", c.command),
        JSON.stringify(c.command),
      ).toMatchObject({ ok: true });
    expect(view).toEqual(before);
  });
  it("values useful early Improved Hull above an unrelated technology", () => {
    const view = getPlayerView(game(), "a");
    expect(
      evaluateAiCommand(view, {
        type: "research",
        tileId: "improved-hull",
        track: "grid",
      }),
    ).toBeGreaterThan(
      evaluateAiCommand(view, {
        type: "research",
        tileId: "neutron-bombs",
        track: "military",
      }),
    );
  });
  it("still values reinforcements beyond seven ships when threats are nearby", () => {
    const state = game();
    const home = state.ships.find((s) => s.owner === "a")!;
    state.ships = Array.from({ length: 8 }, (_, i) => ({
      ...home,
      id: `own${i}`,
    }));
    const enemyHome = state.sectors.find((s) => s.owner === "b")!;
    state.ships.push(
      ...Array.from({ length: 8 }, (_, i) => ({
        ...home,
        id: `enemy${i}`,
        owner: "b",
        sectorId: enemyHome.id,
        type: "dreadnought" as const,
      })),
    );
    expect(
      evaluateAiCommand(getPlayerView(state, "a"), {
        type: "build",
        builds: [{ sectorId: home.sectorId, component: "cruiser" }],
      }),
    ).toBeGreaterThan(5);
  });
});

it("coordinates multiple arriving ships and repeated activations without bypassing pinning", () => {
  const state = game();
  const source = state.sectors.find((s) => s.owner === "a")!,
    middle = state.sectors.find((s) => s.owner === null)!,
    target = state.sectors.find((s) => s.owner === "b")!;
  const tiles = SECTORS.filter(
    (t) => t.wormholes.includes(0) && t.wormholes.includes(3) && !t.warpPortal,
  ).slice(0, 3);
  state.sectors = [source, middle, target];
  state.sectors.forEach((s, i) => {
    s.position = { q: i, r: 0 };
    s.rotation = 0;
    s.tileId = String(tiles[i].id);
  });
  state.ships = state.ships.filter((s) => s.owner === "a");
  const ship = state.ships[0];
  state.ships.push({ ...ship, id: "reinforcement" });
  let commands = generateAiCandidates(getPlayerView(state, "a"))
    .map((c) => c.command)
    .filter((c) => c.type === "move");
  expect(
    commands.some(
      (c) =>
        new Set(
          c.moves
            .filter((m) => m.path.at(-1) === middle.id)
            .map((m) => m.shipId),
        ).size === 2,
    ),
  ).toBe(true);
  expect(
    commands.some(
      (c) =>
        c.moves.filter((m) => m.shipId === ship.id).length === 2 &&
        c.moves.at(-1)?.path.at(-1) === target.id,
    ),
  ).toBe(true);
  for (const c of commands)
    expect(processGameCommand(state, "a", c), JSON.stringify(c)).toMatchObject({
      ok: true,
    });
  state.engine!.action = { owner: "a", action: "move", remaining: 1 };
  commands = generateAiCandidates(getPlayerView(state, "a"))
    .map((c) => c.command)
    .filter((c) => c.type === "move");
  expect(commands.every((c) => c.moves.length === 1)).toBe(true);
  state.engine!.action = null;
  state.ships = state.ships.filter((s) => s.id !== "reinforcement");
  state.ships.push({ ...ship, id: "pin", owner: "b", sectorId: middle.id });
  commands = generateAiCandidates(getPlayerView(state, "a"))
    .map((c) => c.command)
    .filter((c) => c.type === "move");
  expect(commands.every((c) => c.moves.at(-1)?.path.at(-1) !== target.id)).toBe(
    true,
  );
});
it("includes legal two-slot refits and respects the remaining installation budget", () => {
  const state = game();
  state.seats[0].technologies.grid.push("improved-hull");
  const view = getPlayerView(state, "a");
  const commands = generateAiCandidates(view)
    .map((c) => c.command)
    .filter((c) => c.type === "upgrade");
  const changed = (c: (typeof commands)[number]) =>
    c.blueprints.reduce(
      (sum, b) =>
        sum +
        b.parts.filter(
          (id, i) =>
            id !==
            view.seats[0].blueprints.find((old) => old.shipType === b.shipType)!
              .parts[i],
        ).length,
      0,
    );
  expect(commands.some((c) => changed(c) === 2)).toBe(true);
  for (const c of commands)
    expect(processGameCommand(state, "a", c), JSON.stringify(c)).toMatchObject({
      ok: true,
    });
  state.engine!.action = { owner: "a", action: "upgrade", remaining: 1 };
  expect(
    generateAiCandidates(getPlayerView(state, "a"))
      .filter((c) => c.command.type === "upgrade")
      .every((c) => c.command.type === "upgrade" && changed(c.command) <= 1),
  ).toBe(true);
});
it("rechecks saved population-return options after earlier queued returns fill a track", () => {
  const state = game();
  state.seats[0].populationTracks.materials = -1;
  state.pendingDecision = {
    id: "return",
    owner: "a",
    kind: "population-return",
    resources: ["materials", "science"],
    count: 1,
    destination: "track",
  };
  const candidates = generateAiCandidates(getPlayerView(state, "a"));
  expect(candidates.length).toBeGreaterThan(0);
  for (const c of candidates)
    expect(processGameCommand(state, "a", c.command)).toMatchObject({
      ok: true,
    });
});
it("does not remove the last weapon just to add computers", () => {
  const state = game(),
    view = getPlayerView(state, "a");
  const blueprint = view.seats[0].blueprints.find(
    (b) => b.shipType === "interceptor",
  )!;
  expect(
    evaluateAiCommand(view, {
      type: "upgrade",
      blueprints: [
        {
          ...blueprint,
          parts: ["electron-computer", null, null, "electron-computer"],
        },
      ],
    }),
  ).toBeLessThan(0);
});
it("does not fortify a safe home with immobile starbases instead of mobile ships", () => {
  const view = getPlayerView(game(), "a");
  const sectorId = view.sectors.find((s) => s.owner === "a")!.id;
  expect(
    evaluateAiCommand(view, {
      type: "build",
      builds: [{ sectorId, component: "starbase" }],
    }),
  ).toBeLessThan(
    evaluateAiCommand(view, {
      type: "build",
      builds: [{ sectorId, component: "interceptor" }],
    }),
  );
});
it("can plan a power source and weapon together when the weapon alone is over budget", () => {
  const state = game();
  state.seats[0].technologies.grid.push("fusion-source");
  state.seats[0].technologies.military.push("antimatter-cannon");
  const candidates = generateAiCandidates(getPlayerView(state, "a"));
  const plan = candidates.find(
    (c) =>
      c.command.type === "upgrade" &&
      c.command.blueprints.some(
        (b) =>
          b.shipType === "interceptor" &&
          b.parts.includes("fusion-source") &&
          b.parts.includes("antimatter-cannon"),
      ),
  );
  expect(plan).toBeDefined();
  expect(processGameCommand(state, "a", plan!.command)).toMatchObject({
    ok: true,
  });
});
it("preserves late action families on a crowded board instead of filling a global candidate cap", () => {
  const view = getPlayerView(game(), "a"),
    home = view.sectors.find((s) => s.owner === "a")!;
  view.seats[0].resources = { money: 100, science: 100, materials: 100 };
  view.sectors = Array.from({ length: 80 }, (_, i) => ({
    ...home,
    id: `sector-${i}`,
    position: { q: i * 3, r: 0 },
    population: [],
  }));
  view.ships = [];
  const commands = generateAiCandidates(view).map((c) => c.command.type);
  expect(commands).toContain("upgrade");
  expect(commands).toContain("build");
  expect(commands).toContain("influence");
  expect(commands).toContain("explore");
  expect(commands).toContain("pass");
});
it("values Neutron Bombs for neighboring populated conquest rather than fleet damage", () => {
  const state = game();
  state.sectors
    .filter((s) => s.owner)
    .forEach((s) => {
      s.portalVp = 1;
    });
  state.ships.push({
    ...state.ships.find((s) => s.owner === "a")!,
    id: "support",
  });
  const view = getPlayerView(state, "a");
  const command = {
    type: "research",
    tileId: "neutron-bombs",
    track: "military",
  } as const;
  const populated = evaluateAiCommand(view, command);
  view.sectors
    .filter((s) => s.owner === "b")
    .forEach((s) => {
      s.population = [];
    });
  expect(populated).toBeGreaterThan(evaluateAiCommand(view, command));
});
it("recognizes that the next action crosses a nonlinear upkeep threshold", () => {
  const view = getPlayerView(game(), "a");
  view.seats[0].resources.money = 2;
  view.seats[0].populationTracks.money = 1;
  view.seats[0].influenceOnTrack = 7;
  const affordable = evaluateAiCommand(view, {
    type: "research",
    tileId: "improved-hull",
    track: "grid",
  });
  view.seats[0].influenceOnTrack = 6;
  expect(
    evaluateAiCommand(view, {
      type: "research",
      tileId: "improved-hull",
      track: "grid",
    }),
  ).toBeLessThan(affordable - 10);
});
it("evaluates a funded continuation after the last influence disc was already spent", () => {
  const view = getPlayerView(game(), "a");
  const sectorId = view.sectors.find((s) => s.owner === "a")!.id;
  view.seats[0].influenceOnTrack = 0;
  view.seats[0].resources = { money: 40, science: 0, materials: 2 };
  view.actionProgress = { owner: "a", action: "build", remaining: 1 };
  expect(
    Number.isFinite(
      evaluateAiCommand(view, {
        type: "trade-and-act",
        trades: [{ from: "money", to: "materials", amount: 1 }],
        action: {
          type: "build",
          builds: [{ sectorId, component: "interceptor" }],
        },
      }),
    ),
  ).toBe(true);
});
