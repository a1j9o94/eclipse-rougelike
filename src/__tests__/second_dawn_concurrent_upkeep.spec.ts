import { describe, it, expect } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { commitCommand, getPlayerView } from "../../shared/eclipse/protocol";
import { legalCommands } from "../../shared/eclipse/legal";
import type {
  GameState,
  GameCommand,
  MatchAggregate,
} from "../../shared/eclipse/types";
function fixture() {
  const state = createGame({
    seed: 29,
    warpPortals: true,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "terran-federation", controller: "human" },
      { id: "c", faction: "terran-union", controller: "ai" },
    ],
  });
  state.phase = "upkeep";
  state.activeSeatId = "a";
  state.engine!.upkeepDone = [];
  state.engine!.aftermath = "done";
  state.seats.forEach((s) => {
    s.resources.money = 20;
    s.resources.materials = 20;
    s.influenceOnTrack = 6;
  });
  return state;
}
function run(state: GameState, actor: string, command: GameCommand) {
  const result = processGameCommand(state, actor, command);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}
function submit(
  aggregate: MatchAggregate,
  actor: string,
  command: GameCommand,
  id: string,
) {
  const result = commitCommand(
    aggregate,
    actor,
    { commandId: id, expectedRevision: aggregate.state.revision, command },
    aggregate.state,
    processGameCommand,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.aggregate;
}
describe("concurrent independent upkeep", () => {
  it("lets every unfinished seat prepare and pay in any order and advances only once all finish", () => {
    let state = fixture();
    const home = state.sectors.find((s) => s.owner === "b")!;
    home.orbital = true;
    expect(
      legalCommands(getPlayerView(state, "b")!).some(
        (c) => c.command.type === "finish-upkeep",
      ),
    ).toBe(true);
    state = run(state, "b", {
      type: "colonize",
      placements: [
        { sectorId: home.id, squareId: "orbital", resource: "science" },
      ],
    });
    state = run(state, "b", {
      type: "trade",
      from: "materials",
      to: "money",
      amount: 1,
    });
    state = run(state, "b", { type: "finish-upkeep" });
    const paid = structuredClone(state.seats[1]);
    expect(state.phase).toBe("upkeep");
    expect(getPlayerView(state, "c")!.upkeepDone).toEqual(["b"]);
    for (const command of [
      { type: "finish-upkeep" },
      { type: "trade", from: "materials", to: "money", amount: 1 },
      {
        type: "colonize",
        placements: [
          { sectorId: home.id, squareId: "orbital", resource: "money" },
        ],
      },
    ] satisfies GameCommand[])
      expect(processGameCommand(state, "b", command).ok).toBe(false);
    expect(legalCommands(getPlayerView(state, "b")!)).toEqual([]);
    state = run(state, "c", { type: "finish-upkeep" });
    expect(state.phase).toBe("upkeep");
    expect(state.seats[1].resources).toEqual(paid.resources);
    state = run(state, "a", { type: "finish-upkeep" });
    expect(state.phase).toBe("action");
    expect(state.round).toBe(2);
    expect(state.seats[1].resources).toEqual(paid.resources);
  });
  it("persists two bankrupt players separately while a third completes, then lets each resolve without waiting", () => {
    let aggregate: MatchAggregate = { state: fixture(), journal: [] };
    aggregate.state.seats[0].resources.money = 0;
    aggregate.state.seats[1].resources.money = 0;
    aggregate = submit(aggregate, "a", { type: "finish-upkeep" }, "bank-a");
    aggregate = submit(aggregate, "b", { type: "finish-upkeep" }, "bank-b");
    const a = getPlayerView(aggregate.state, "a")!,
      b = getPlayerView(aggregate.state, "b")!,
      c = getPlayerView(aggregate.state, "c")!;
    expect(a.pendingDecision?.kind).toBe("bankruptcy");
    expect(b.pendingDecision?.kind).toBe("bankruptcy");
    expect(a.pendingDecision?.id).not.toBe(b.pendingDecision?.id);
    expect(c.pendingDecision).toBeNull();
    expect(c.waitingFor).toBeNull();
    aggregate = submit(aggregate, "c", { type: "finish-upkeep" }, "pay-c");
    expect(aggregate.state.phase).toBe("upkeep");
    const before = structuredClone(aggregate.state),
      decisionB = getPlayerView(before, "b")!.pendingDecision!;
    expect(
      commitCommand(
        aggregate,
        "a",
        {
          commandId: "steal",
          expectedRevision: before.revision,
          command: {
            type: "resolve",
            decisionId: decisionB.id,
            choice: {
              kind: "bankruptcy",
              abandonSectorId: before.sectors.find((s) => s.owner === "b")!.id,
            },
          },
        },
        before,
        processGameCommand,
      ).ok,
    ).toBe(false);
    expect(aggregate.state).toEqual(before);
    aggregate = submit(
      aggregate,
      "b",
      { type: "trade", from: "materials", to: "money", amount: 4 },
      "trade-b",
    );
    expect(aggregate.state.engine!.upkeepDone).toContain("b");
    expect(getPlayerView(aggregate.state, "a")!.pendingDecision?.id).toBe(
      a.pendingDecision?.id,
    );
    expect(getPlayerView(aggregate.state, "b")!.pendingDecision).toBeNull();
    aggregate = submit(
      aggregate,
      "a",
      { type: "trade", from: "materials", to: "money", amount: 4 },
      "trade-a",
    );
    expect(aggregate.state.phase).toBe("action");
    expect(aggregate.state.round).toBe(2);
    expect(aggregate.state.pendingDecision).toBeNull();
    expect(aggregate.state.engine!.decisions).toEqual([]);
  });
  it("keeps old singleton bankruptcy saves usable and refuses other-player choices outside upkeep", () => {
    let state = fixture();
    state.seats[0].resources.money = 0;
    state = run(state, "a", { type: "finish-upkeep" });
    const oldId = state.pendingDecision!.id;
    state = run(state, "b", { type: "finish-upkeep" });
    expect(getPlayerView(state, "a")!.pendingDecision?.id).toBe(oldId);
    state.phase = "action";
    const rejected = commitCommand(
      { state, journal: [] },
      "c",
      {
        commandId: "outside",
        expectedRevision: state.revision,
        command: { type: "colonize", placements: [] },
      },
      state,
      processGameCommand,
    );
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: "DECISION_PENDING" },
    });
  });
  it("retries a committed payment without paying twice and stale parallel writes refresh", () => {
    const state = fixture(),
      request = {
        commandId: "same",
        expectedRevision: 0,
        command: { type: "finish-upkeep" } as const,
      };
    const first = commitCommand(
      { state, journal: [] },
      "b",
      request,
      state,
      processGameCommand,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(
      commitCommand(first.aggregate, "b", request, state, processGameCommand),
    ).toMatchObject({ ok: true, duplicate: true });
    expect(
      commitCommand(
        first.aggregate,
        "c",
        { ...request, commandId: "stale" },
        state,
        processGameCommand,
      ),
    ).toMatchObject({ ok: false, error: { code: "STALE_REVISION" } });
  });
  it("lets a paid seat return an ambassador cube after elimination without reopening its economy or paying again", () => {
    let state = fixture();
    state.seats[1].ambassadors = ["a"];
    state.seats[0].ambassadors = ["b"];
    state.seats[0].resources = { money: 0, materials: 0, science: 0 };
    state.sectors = state.sectors.filter((sector) => sector.owner !== "a");
    state = run(state, "b", { type: "finish-upkeep" });
    const paidResources = { ...state.seats[1].resources };
    state = run(state, "c", { type: "finish-upkeep" });
    state = run(state, "a", { type: "finish-upkeep" });
    expect(state.seats[0].eliminated).toBe(true);
    expect(state.phase).toBe("upkeep");
    const decision = getPlayerView(state, "b")!.pendingDecision;
    expect(decision?.kind).toBe("population-return");
    expect(
      legalCommands(getPlayerView(state, "b")!).every(
        (candidate) => candidate.command.type === "resolve",
      ),
    ).toBe(true);
    expect(
      processGameCommand(state, "b", {
        type: "trade",
        from: "materials",
        to: "money",
        amount: 1,
      }).ok,
    ).toBe(false);
    state = run(state, "b", {
      type: "resolve",
      decisionId: decision!.id,
      choice: { kind: "population-return", resources: ["money"] },
    });
    expect(state.phase).toBe("action");
    expect(state.round).toBe(2);
    expect(state.seats[1].resources).toEqual(paidResources);
  });
});
