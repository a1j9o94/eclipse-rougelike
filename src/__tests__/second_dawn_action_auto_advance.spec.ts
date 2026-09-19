import { describe, expect, it } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { legalCommands } from "../../shared/eclipse/legal";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type {
  Action,
  GameCommand,
  GameState,
} from "../../shared/eclipse/types";
function game(controller: "human" | "ai" = "human") {
  const state = createGame({
    seed: 42,
    seats: [
      { id: "a", faction: "terran-directorate", controller },
      { id: "b", faction: "hydran", controller: "ai" },
      { id: "c", faction: "planta", controller: "ai" },
    ],
  });
  state.seats[0].resources = { money: 30, science: 30, materials: 30 };
  return state;
}
function apply(
  state: GameState,
  command: GameCommand,
  actor = state.pendingDecision?.owner ?? state.activeSeatId!,
): GameState {
  const result = processGameCommand(state, actor, command);
  if (!result.ok) throw Error(result.error.message);
  return result.state;
}
function commandFor(state: GameState, action: Action): GameCommand {
  const home = state.sectors.find((s) => s.owner === "a")!;
  if (action === "build")
    return {
      type: "build",
      builds: [{ sectorId: home.id, component: "interceptor" }],
    };
  if (action === "research") {
    state.technologyMarket = ["fusion-source"];
    return { type: "research", tileId: "fusion-source", track: "grid" };
  }
  if (action === "upgrade") {
    const original = state.seats[0].blueprints.find(
      (b) => b.shipType === "interceptor",
    )!;
    return {
      type: "upgrade",
      blueprints: [
        {
          ...original,
          parts: original.parts.map((part, i) => (i === 3 ? "hull" : part)),
        },
      ],
    };
  }
  if (action === "influence")
    return { type: "influence", removeSectorIds: [], addSectorIds: [] };
  if (action === "move") {
    const target = state.sectors.find((s) => s.owner === "b")!;
    home.portalVp = 1;
    target.portalVp = 1;
    return {
      type: "move",
      moves: [
        {
          shipId: state.ships.find((s) => s.owner === "a")!.id,
          path: [target.id],
        },
      ],
    };
  }
  return legalCommands(getPlayerView(state, "a")).find(
    (c) => c.command.type === "explore",
  )!.command;
}
describe("automatic completion after the final action activation", () => {
  for (const controller of ["human", "ai"] as const)
    for (const action of [
      "explore",
      "research",
      "upgrade",
      "build",
      "move",
      "influence",
    ] as const)
      it(`${controller} ${action} finishes without an End action command`, () => {
        const state = game(controller);
        state.engine!.action = { owner: "a", action, remaining: 1 };
        const command = commandFor(state, action);
        let after = apply(state, command);
        if (action === "explore") {
          expect(after.activeSeatId).toBe("a");
          expect(after.pendingDecision?.kind).toBe("exploration");
          expect(after.engine!.action?.remaining).toBe(0);
          after = apply(after, {
            type: "resolve",
            decisionId: after.pendingDecision!.id,
            choice: { kind: "exploration", tileId: null, rotation: 0 },
          });
        }
        expect(after.engine!.action).toBeNull();
        expect(after.activeSeatId).toBe("b");
        expect(after.phase).toBe("action");
      });
  it("keeps an action open when capacity remains even if resources have run out", () => {
    const state = game();
    state.engine!.action = { owner: "a", action: "build", remaining: 2 };
    state.seats[0].resources.materials = 3;
    const after = apply(state, commandFor(state, "build"));
    expect(after.engine!.action).toMatchObject({ remaining: 1 });
    expect(after.activeSeatId).toBe("a");
    expect(
      legalCommands(getPlayerView(after, "a")).some(
        (c) => c.command.type === "build",
      ),
    ).toBe(false);
  });
  it("keeps a research reward pending and completes only after it is resolved", () => {
    const state = game();
    state.engine!.action = { owner: "a", action: "research", remaining: 1 };
    state.technologyMarket = ["warp-portal"];
    let after = apply(state, {
      type: "research",
      tileId: "warp-portal",
      track: "grid",
    });
    expect(after.pendingDecision?.kind).toBe("portal-placement");
    expect(after.activeSeatId).toBe("a");
    const decision = after.pendingDecision;
    if (decision?.kind !== "portal-placement")
      throw Error("Expected portal choice");
    after = apply(after, {
      type: "resolve",
      decisionId: decision.id,
      choice: { kind: "portal-placement", sectorId: decision.sectorIds[0] },
    });
    expect(after.engine!.action).toBeNull();
    expect(after.activeSeatId).toBe("b");
  });
  it("advances from the action owner after another player responds to the final pending choice", () => {
    const state = game();
    state.engine!.action = { owner: "a", action: "influence", remaining: 0 };
    state.pendingDecision = {
      id: "diplomacy",
      owner: "b",
      kind: "diplomacy",
      proposer: "a",
      populationSources: ["money"],
      proposerResource: "money",
    };
    const after = apply(
      state,
      {
        type: "resolve",
        decisionId: "diplomacy",
        choice: { kind: "diplomacy", accept: false, resource: "money" },
      },
      "b",
    );
    expect(after.engine!.action).toBeNull();
    expect(after.activeSeatId).toBe("b");
  });
  it("preserves old exhausted saves and never advances a rejected command", () => {
    const state = game();
    state.engine!.action = { owner: "a", action: "move", remaining: 0 };
    const before = structuredClone(state);
    expect(
      processGameCommand(state, "a", { type: "move", moves: [] }),
    ).toMatchObject({ ok: false });
    expect(state).toEqual(before);
    const after = apply(state, { type: "end-action" });
    expect(after.activeSeatId).toBe("b");
    expect(after.engine!.action).toBeNull();
  });
  it("previews and applies betrayal when the final move ends inside an allied sector", () => {
    const state = game();
    state.engine!.action = { owner: "a", action: "move", remaining: 1 };
    state.seats[0].ambassadors = ["b"];
    state.seats[1].ambassadors = ["a"];
    const command = commandFor(state, "move"),
      view = getPlayerView(state, "a");
    expect(previewCommand(view, command).betrayedPartners).toEqual(["b"]);
    const after = apply(state, command);
    expect(after.seats[0].traitor).toBe(true);
    expect(after.seats[0].ambassadors).toEqual([]);
    expect(after.seats[1].ambassadors).toEqual([]);
    expect(after.pendingDecision?.kind).toBe("population-return");
    expect(view.seats[0].traitor).toBe(false);
  });
});

it("finishes a full batch Build with one action disc and no extra command", () => {
  const state = game(),
    home = state.sectors.find((s) => s.owner === "a")!,
    before = state.seats[0].influenceOnTrack;
  const after = apply(state, {
    type: "build",
    builds: [
      { sectorId: home.id, component: "interceptor" },
      { sectorId: home.id, component: "interceptor" },
    ],
  });
  expect(after.activeSeatId).toBe("b");
  expect(after.engine!.action).toBeNull();
  expect(after.seats[0].influenceOnTrack).toBe(before - 1);
  expect(after.seats[0].actionDiscs.build).toBe(1);
});
it("finishes a full batch Move using the printed faction activation count", () => {
  const state = game(),
    home = state.sectors.find((s) => s.owner === "a")!,
    target = state.sectors.find((s) => s.owner === "b")!,
    ship = state.ships.find((s) => s.owner === "a")!;
  home.portalVp = 1;
  target.portalVp = 1;
  state.ships = state.ships.filter((s) => s.owner !== "b");
  const after = apply(state, {
    type: "move",
    moves: [
      { shipId: ship.id, path: [target.id] },
      { shipId: ship.id, path: [home.id] },
      { shipId: ship.id, path: [target.id] },
    ],
  });
  expect(after.activeSeatId).toBe("b");
  expect(after.engine!.action).toBeNull();
  expect(after.ships.find((s) => s.id === ship.id)?.sectorId).toBe(target.id);
});
it("finishes a full multi-blueprint Upgrade without spending an extra action disc", () => {
  const state = game(),
    interceptor = structuredClone(
      state.seats[0].blueprints.find((b) => b.shipType === "interceptor")!,
    ),
    cruiser = structuredClone(
      state.seats[0].blueprints.find((b) => b.shipType === "cruiser")!,
    );
  interceptor.parts[3] = "hull";
  cruiser.parts[5] = "hull";
  const after = apply(state, {
    type: "upgrade",
    blueprints: [interceptor, cruiser],
  });
  expect(after.activeSeatId).toBe("b");
  expect(after.engine!.action).toBeNull();
  expect(after.seats[0].actionDiscs.upgrade).toBe(1);
});
it("automatically completes a passed player’s one-activation reaction", () => {
  const state = game();
  state.seats[0].passed = true;
  const after = apply(state, commandFor(state, "build"));
  expect(after.activeSeatId).toBe("b");
  expect(after.engine!.action).toBeNull();
  expect(after.seats[0].passed).toBe(true);
});
it("does not betray an ally when the full Move command passes through and finishes elsewhere", () => {
  const state = game(),
    home = state.sectors.find((s) => s.owner === "a")!,
    target = state.sectors.find((s) => s.owner === "b")!,
    ship = state.ships.find((s) => s.owner === "a")!;
  state.engine!.action = { owner: "a", action: "move", remaining: 2 };
  home.portalVp = 1;
  target.portalVp = 1;
  state.ships = state.ships.filter((s) => s.owner !== "b");
  state.seats[0].ambassadors = ["b"];
  state.seats[1].ambassadors = ["a"];
  const command: GameCommand = {
    type: "move",
    moves: [
      { shipId: ship.id, path: [target.id] },
      { shipId: ship.id, path: [home.id] },
    ],
  };
  expect(
    previewCommand(getPlayerView(state, "a"), command).betrayedPartners,
  ).toEqual([]);
  const after = apply(state, command);
  expect(after.seats[0].traitor).toBe(false);
  expect(after.seats[0].ambassadors).toEqual(["b"]);
  expect(after.activeSeatId).toBe("b");
});
it("does not invent a colonization confirmation after researching an advanced population technology", () => {
  const state = game();
  state.technologyMarket = ["advanced-labs"];
  const after = apply(state, {
    type: "research",
    tileId: "advanced-labs",
    track: "nano",
  });
  expect(after.pendingDecision).toBeNull();
  expect(after.engine!.action).toBeNull();
  expect(after.activeSeatId).toBe("b");
  expect(after.seats[0].colonyShipsAvailable).toBe(
    state.seats[0].colonyShipsAvailable,
  );
});
it("does not skip a queued choice after resolving the last Explore control decision", () => {
  const state = game();
  state.engine!.action = { owner: "a", action: "explore", remaining: 0 };
  const sector = state.sectors.find((s) => s.owner === null)!;
  state.ships = state.ships.filter((s) => s.sectorId !== sector.id);
  state.pendingDecision = {
    id: "control-after-explore",
    kind: "control",
    owner: "a",
    sectorId: sector.id,
  };
  state.engine!.decisions.push({
    id: "discovery-after-control",
    kind: "discovery",
    owner: "a",
    tileId: "money",
    options: ["keep", "use"],
  });
  let after = apply(state, {
    type: "resolve",
    decisionId: "control-after-explore",
    choice: { kind: "control", accept: true },
  });
  expect(after.activeSeatId).toBe("a");
  expect(after.pendingDecision?.id).toBe("discovery-after-control");
  expect(after.engine!.action?.remaining).toBe(0);
  after = apply(after, {
    type: "resolve",
    decisionId: "discovery-after-control",
    choice: { kind: "discovery", option: "keep" },
  });
  expect(after.activeSeatId).toBe("b");
  expect(after.engine!.action).toBeNull();
});
