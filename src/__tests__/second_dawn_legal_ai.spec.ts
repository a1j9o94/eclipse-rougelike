import { describe, expect, it } from "vitest";
import { legalCommands } from "../../shared/eclipse/legal";
import { chooseAiCommand } from "../../shared/eclipse/ai";
import { initialBlueprints } from "../../shared/eclipse/blueprints";
import type { PlayerView, Seat } from "../../shared/eclipse/types";
function view(): PlayerView {
  const seat: Seat = {
    id: "s1",
    faction: "terran-directorate",
    controller: "ai",
    resources: { money: 8, science: 8, materials: 8 },
    populationTracks: { money: 1, science: 1, materials: 1 },
    influenceOnTrack: 12,
    actionDiscs: {
      explore: 0,
      influence: 0,
      research: 0,
      upgrade: 0,
      build: 0,
      move: 0,
    },
    colonyShipsAvailable: 3,
    passed: false,
    eliminated: false,
    technologies: { military: ["starbase"], grid: [], nano: [] },
    blueprints: initialBlueprints("terran-directorate"),
    ambassadors: [],
    traitor: false,
  };
  return {
    rulesVersion: "r",
    catalogVersion: "c",
    revision: 0,
    round: 1,
    phase: "action",
    activeSeatId: "s1",
    startSeatId: "s1",
    viewerSeatId: "s1",
    seats: [seat, { ...structuredClone(seat), id: "s2", faction: "hydran" }],
    sectors: [
      {
        id: "home",
        tileId: "221",
        position: { q: 0, r: 0 },
        rotation: 0,
        owner: "s1",
        population: [{ resource: "money", squareId: "p0" }],
        orbital: false,
        monolith: false,
        discovery: false,
      },
    ],
    ships: [
      {
        id: "ship",
        owner: "s1",
        type: "interceptor",
        sectorId: "home",
        damage: 0,
      },
    ],
    technologyMarket: ["fusion-source"],
    private: { seatId: "s1", reputation: [], discoveriesKept: [] },
    pendingDecision: null,
    waitingFor: null,
    hiddenTileCounts: [],
    actionProgress: null,
  };
}
describe("public-view action candidates and normal AI", () => {
  it("offers researched affordable options without mutating the public view", () => {
    const input = view(),
      before = structuredClone(input);
    const options = legalCommands(input);
    expect(options.some((c) => c.command.type === "research")).toBe(true);
    expect(options.some((c) => c.command.type === "explore")).toBe(true);
    expect(input).toEqual(before);
    expect(options.length).toBeLessThanOrEqual(500);
  });
  it("restricts continuation to the active action plus optional turn operations", () => {
    const input = view();
    input.actionProgress = { owner: "s1", action: "build", remaining: 0 };
    const options = legalCommands(input);
    expect(options.some((c) => c.command.type === "end-action")).toBe(true);
    expect(
      options.some(
        (c) =>
          c.command.type === "explore" ||
          c.command.type === "build" ||
          c.command.type === "research",
      ),
    ).toBe(false);
  });
  it("resolves a full combat hit pool from explicit legal targets and deterministically chooses as AI", () => {
    const input = view();
    input.pendingDecision = {
      id: "d",
      owner: "s1",
      kind: "combat-allocation",
      battleId: "b",
      dice: [{ id: "die", face: 6, damage: 2, targets: ["enemy"] }],
    };
    const result = chooseAiCommand(input, 9);
    expect(result).toEqual(chooseAiCommand(input, 9));
    expect(result?.command).toEqual({
      type: "resolve",
      decisionId: "d",
      choice: {
        kind: "combat-allocation",
        allocations: [{ dieId: "die", targetId: "enemy" }],
      },
    });
  });
  it("does not offer a hidden other-seat decision or act for an eliminated seat", () => {
    const input = view();
    input.waitingFor = { owner: "s2", kind: "exploration" };
    input.activeSeatId = "s2";
    expect(legalCommands(input)).toEqual([]);
    input.seats[0].eliminated = true;
    expect(chooseAiCommand(input, 1)).toBeNull();
  });
});

it("offers a single-command influence transfer with only the action disc available", () => {
  const input = view();
  input.seats[0].influenceOnTrack = 1;
  input.sectors.push({
    ...structuredClone(input.sectors[0]),
    id: "frontier",
    tileId: "201",
    position: { q: 1, r: 0 },
    owner: null,
    population: [],
  });
  input.ships[0].sectorId = "frontier";
  expect(
    legalCommands(input).some(
      (c) =>
        c.command.type === "influence" &&
        c.command.removeSectorIds[0] === "home" &&
        c.command.addSectorIds[0] === "frontier",
    ),
  ).toBe(true);
});
it("offers a stored Muon Source outside the blueprint grid", () => {
  const input = view();
  input.seats[0].storedParts = ["muon-source"];
  expect(
    legalCommands(input).some(
      (c) =>
        c.command.type === "upgrade" &&
        c.command.blueprints.some((b) =>
          b.outsideParts?.includes("muon-source"),
        ),
    ),
  ).toBe(true);
});

it("allows returning reputation while another seat resolves diplomacy", () => {
  const input = view();
  input.activeSeatId = "s2";
  input.waitingFor = { owner: "s2", kind: "diplomacy" };
  input.private.reputation = [1, 3];
  expect(legalCommands(input).map((c) => c.command)).toEqual([
    { type: "discard-reputation", values: [1] },
    { type: "discard-reputation", values: [3] },
  ]);
});
it("offers and finishes a post-combat diplomacy window", () => {
  const input = view();
  input.phase = "combat";
  input.pendingDecision = {
    id: "window",
    owner: "s1",
    kind: "diplomacy-window",
    eligibleSeatIds: ["s2"],
    populationSources: ["science"],
  };
  expect(legalCommands(input).map((c) => c.command)).toContainEqual({
    type: "resolve",
    decisionId: "window",
    choice: { kind: "diplomacy-window", offerTo: "s2", resource: "science" },
  });
  expect(legalCommands(input).map((c) => c.command)).toContainEqual({
    type: "resolve",
    decisionId: "window",
    choice: { kind: "diplomacy-window", offerTo: null, resource: "science" },
  });
});

it("AI finishes diplomacy after a declined offer while preserving the human retry option", () => {
  const input = view();
  input.phase = "combat";
  input.pendingDecision = {
    id: "window",
    owner: "s1",
    kind: "diplomacy-window",
    eligibleSeatIds: ["s2"],
    declinedSeatIds: ["s2"],
    populationSources: ["money"],
  };
  expect(
    legalCommands(input).some(
      (c) =>
        c.command.type === "resolve" &&
        c.command.choice.kind === "diplomacy-window" &&
        c.command.choice.offerTo === "s2",
    ),
  ).toBe(true);
  expect(chooseAiCommand(input, 2)?.command).toEqual({
    type: "resolve",
    decisionId: "window",
    choice: { kind: "diplomacy-window", offerTo: null, resource: "money" },
  });
});
