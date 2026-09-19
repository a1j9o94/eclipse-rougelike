import { incomeForPopulationAway } from "../../shared/eclipse/tracks";
import { recoverHistoryCheckpoint } from "../../shared/eclipse/historyRecovery";
import { validateDiplomacy } from "../../shared/eclipse/decisions";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import { fundingActionCost } from "../../shared/eclipse/funding";
import { describe, it, expect } from "vitest";
import {
  MINOR_SPECIES,
  constructionCostForSeat,
  researchCostForSeat,
  minorSpeciesPoints,
  minorSpeciesPurchaseOptions,
} from "../../shared/eclipse/minorSpecies";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView, commitCommand } from "../../shared/eclipse/protocol";
import { reputationCapacity } from "../../shared/eclipse/battleEngine";
import { scoreSeat } from "../../shared/eclipse/rounds";
import type { GameState, GameCommand } from "../../shared/eclipse/types";
const config = {
  seed: 49,
  warpPortals: true,
  seats: [
    { id: "a", faction: "terran-directorate", controller: "human" },
    { id: "b", faction: "hydran", controller: "ai" },
  ],
} as const;
function game(): GameState {
  const state = createGame({
    ...config,
    seats: [...config.seats],
    minorSpecies: true,
  });
  state.activeSeatId = "a";
  state.seats[0].resources.money = 30;
  return state;
}
function buy(
  state: GameState,
  minorSpeciesId: (typeof MINOR_SPECIES)[number]["id"],
  extra: Partial<Extract<GameCommand, { type: "buy-minor-species" }>> = {},
) {
  state.minorSpecies!.market = [minorSpeciesId];
  return processGameCommand(state, "a", {
    type: "buy-minor-species",
    minorSpeciesId,
    ...extra,
  });
}
describe("official Minor Species", () => {
  it("has nine verified costs and selects exactly four unique market tiles only when enabled", () => {
    expect(MINOR_SPECIES.map((t) => t.cost)).toEqual([
      8, 4, 8, 9, 4, 4, 4, 6, 4,
    ]);
    const state = game();
    expect(state.minorSpecies!.market).toHaveLength(4);
    expect(new Set(state.minorSpecies!.market).size).toBe(4);
    expect(
      createGame({ ...config, seats: [...config.seats], minorSpecies: true }),
    ).toEqual(
      createGame({ ...config, seats: [...config.seats], minorSpecies: true }),
    );
    const omitted = createGame({ ...config, seats: [...config.seats] });
    expect(omitted.minorSpecies).toBeUndefined();
    expect(
      createGame({ ...config, seats: [...config.seats], minorSpecies: false }),
    ).toEqual(omitted);
    expect(state.rulesVersion).toContain("+minor-species-v1");
  });
  it("buys in two-player games without an activation or ending the turn and applies immediate discounts", () => {
    const state = game(),
      before = structuredClone(state);
    const result = buy(state, "researchers");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.seats[0].resources.money).toBe(26);
    expect(result.state.seats[0].influenceOnTrack).toBe(
      before.seats[0].influenceOnTrack,
    );
    expect(result.state.engine!.action).toBeNull();
    expect(result.state.activeSeatId).toBe("a");
    expect(result.state.minorSpecies!.market).toEqual([]);
    expect(
      researchCostForSeat("plasma-cannon", "military", result.state.seats[0]),
    ).toMatchObject({ ok: true, scienceCost: 4 });
    expect(
      researchCostForSeat("neutron-bombs", "military", result.state.seats[0]),
    ).toMatchObject({ ok: true, scienceCost: 2 });
  });
  it("preserves an in-progress mixed action and uses no colony ship for population", () => {
    const state = game();
    state.engine!.action = {
      owner: "a",
      action: "move",
      remaining: 2,
      budgets: { move: 1, build: 1 },
    };
    const result = buy(state, "population", { resource: "science" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.engine!.action).toEqual(state.engine!.action);
    expect(result.state.seats[0].populationTracks.science).toBe(
      state.seats[0].populationTracks.science + 1,
    );
    expect(result.state.seats[0].colonyShipsAvailable).toBe(
      state.seats[0].colonyShipsAvailable,
    );
    expect(result.state.seats[0].minorSpecies).toEqual([
      { id: "population", resource: "science" },
    ]);
  });
  it("shares ambassador spaces with reputation and privately returns a chosen owned tile atomically", () => {
    const state = game();
    state.seats[0].ambassadors = ["b"];
    state.privateSeats[0].reputation = [4, 3, 2, 1];
    state.minorSpecies!.market = ["researchers"];
    expect(
      processGameCommand(state, "a", {
        type: "buy-minor-species",
        minorSpeciesId: "researchers",
      }).ok,
    ).toBe(false);
    const result = buy(state, "researchers", { returnReputation: [1] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.privateSeats[0].reputation).toEqual([4, 3, 2]);
    expect(reputationCapacity(result.state.seats[0])).toBe(3);
    expect(
      result.events.every((event) => !event.message.includes("1-point")),
    ).toBe(true);
    const other = getPlayerView(result.state, "b");
    expect(other.seats[0].minorSpecies).toEqual([{ id: "researchers" }]);
    expect(
      other.hiddenTileCounts.find((s) => s.seatId === "a")!.reputation,
    ).toBe(3);
    expect(other.private.reputation).not.toEqual([4, 3, 2]);
  });
  it("rejects unavailable, unaffordable, wrong-turn, pending and invalid population choices without mutation", () => {
    const state = game();
    state.minorSpecies!.market = ["population"];
    const before = structuredClone(state);
    for (const command of [
      { type: "buy-minor-species", minorSpeciesId: "researchers" },
      { type: "buy-minor-species", minorSpeciesId: "population" },
      {
        type: "buy-minor-species",
        minorSpeciesId: "population",
        resource: "science",
        returnReputation: [4],
      },
    ] satisfies GameCommand[])
      expect(processGameCommand(state, "a", command).ok).toBe(false);
    expect(state).toEqual(before);
    expect(
      processGameCommand(state, "b", {
        type: "buy-minor-species",
        minorSpeciesId: "population",
        resource: "science",
      }).ok,
    ).toBe(false);
    state.seats[0].resources.money = 8;
    expect(buy(state, "population", { resource: "science" }).ok).toBe(false);
    state.seats[0].resources.money = 30;
    state.seats[0].populationTracks.science = 11;
    expect(buy(state, "population", { resource: "science" }).ok).toBe(false);
    state.pendingDecision = {
      id: "private",
      owner: "a",
      kind: "free-technology",
      technologyIds: ["plasma-cannon"],
    };
    expect(buy(state, "population", { resource: "money" }).ok).toBe(false);
  });
  it("scores scaling species from tile counts, including itself, without reputation values", () => {
    expect(
      minorSpeciesPoints(
        [{ id: "ambassadors" }, { id: "reputation" }, { id: "prestige" }],
        2,
        4,
      ),
    ).toBe(12);
    const state = game();
    state.seats[0].minorSpecies = [{ id: "reputation" }];
    state.privateSeats[0].reputation = [1, 4];
    expect(scoreSeat(state, state.seats[0]).minorSpecies).toBe(2);
  });
  it("discounts every matching build while preserving faction costs and other components", () => {
    const seat = game().seats[0];
    seat.minorSpecies = [
      { id: "cruisers" },
      { id: "dreadnoughts" },
      { id: "orbitals" },
      { id: "monoliths" },
    ];
    expect(
      ["cruiser", "dreadnought", "orbital", "monolith", "interceptor"].map(
        (type) => constructionCostForSeat(seat, type as "cruiser"),
      ),
    ).toEqual([4, 6, 3, 8, 3]);
  });
  it("offers legal public purchases and preserves duplicate/stale command replay", () => {
    const state = game();
    state.minorSpecies!.market = ["researchers"];
    const view = getPlayerView(state, "a");
    const options = minorSpeciesPurchaseOptions(view);
    expect(options).toHaveLength(1);
    const request = {
      commandId: "minor-buy",
      expectedRevision: state.revision,
      command: options[0],
    };
    const pin = {
      rulesVersion: state.rulesVersion,
      catalogVersion: state.catalogVersion,
    };
    const accepted = commitCommand(
      { state, journal: [] },
      "a",
      request,
      pin,
      processGameCommand,
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const duplicate = commitCommand(
      accepted.aggregate,
      "a",
      request,
      pin,
      processGameCommand,
    );
    expect(duplicate).toMatchObject({ ok: true, duplicate: true });
    expect(duplicate.aggregate).toEqual(accepted.aggregate);
    expect(
      commitCommand(
        accepted.aggregate,
        "a",
        { ...request, commandId: "new" },
        pin,
        processGameCommand,
      ),
    ).toMatchObject({ ok: false, error: { code: "STALE_REVISION" } });
  });
});

it("preserves Orion reputation-only space and prohibits new relations while traitor", () => {
  const state = game(),
    seat = state.seats[0];
  seat.faction = "orion";
  seat.minorSpecies = [
    { id: "cruisers" },
    { id: "dreadnoughts" },
    { id: "orbitals" },
    { id: "monoliths" },
  ];
  expect(reputationCapacity(seat)).toBe(1);
  expect(buy(state, "researchers").ok).toBe(false);
  expect(minorSpeciesPurchaseOptions(getPlayerView(state, "a"))).toEqual([]);
  seat.minorSpecies = [];
  seat.traitor = true;
  expect(buy(state, "researchers").ok).toBe(false);
  seat.traitor = false;
  seat.passed = true;
  const result = buy(state, "researchers");
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.state.seats[0].passed).toBe(true);
});

it("charges discounted authoritative research and every build component, preserving minimum science cost", () => {
  const state = game(),
    seat = state.seats[0];
  seat.minorSpecies = [{ id: "researchers" }, { id: "cruisers" }];
  state.technologyMarket = ["plasma-cannon"];
  seat.resources.science = 4;
  const researched = processGameCommand(state, "a", {
    type: "research",
    tileId: "plasma-cannon",
    track: "military",
  });
  expect(researched.ok).toBe(true);
  if (researched.ok)
    expect(researched.state.seats[0].resources.science).toBe(0);
  const home = state.sectors.find((s) => s.owner === "a")!;
  seat.resources.materials = 8;
  const built = processGameCommand(state, "a", {
    type: "build",
    builds: [
      { sectorId: home.id, component: "cruiser" },
      { sectorId: home.id, component: "cruiser" },
    ],
  });
  expect(built.ok).toBe(true);
  if (built.ok) expect(built.state.seats[0].resources.materials).toBe(0);
  seat.technologies.military = [
    "improved-hull",
    "fusion-drive",
    "gauss-shield",
  ];
  expect(researchCostForSeat("plasma-cannon", "military", seat)).toMatchObject({
    ok: true,
    scienceCost: 4,
  });
});

it("matches purchase money/population previews and discounted action funding to authoritative outcomes", () => {
  const state = game();
  state.minorSpecies!.market = ["population"];
  const command = {
    type: "buy-minor-species",
    minorSpeciesId: "population",
    resource: "money",
  } as const;
  const before = getPlayerView(state, "a"),
    preview = previewCommand(before, command),
    result = processGameCommand(state, "a", command);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(preview.resourcesAfter).toEqual(result.state.seats[0].resources);
  expect(preview.influenceAfter).toBe(result.state.seats[0].influenceOnTrack);
  expect(preview.moneyIncomeAfter).toBe(
    incomeForPopulationAway(result.state.seats[0].populationTracks.money),
  );
  const seat = state.seats[0];
  seat.minorSpecies = [{ id: "researchers" }, { id: "cruisers" }];
  const view = getPlayerView(state, "a");
  const research = {
    type: "research",
    tileId: "plasma-cannon",
    track: "military",
  } as const;
  expect(fundingActionCost(seat, research)).toBe(4);
  expect(previewCommand(view, research).resourcesAfter.science).toBe(
    seat.resources.science - 4,
  );
  const build = {
    type: "build",
    builds: [
      {
        sectorId: state.sectors.find((s) => s.owner === "a")!.id,
        component: "cruiser" as const,
      },
    ],
  } as const;
  expect(fundingActionCost(seat, { ...build, builds: [...build.builds] })).toBe(
    4,
  );
  expect(
    previewCommand(view, { ...build, builds: [...build.builds] }).resourcesAfter
      .materials,
  ).toBe(seat.resources.materials - 4);
});

it.each([false, true])(
  "recovers exact setup before an acquired Minor Species with Rift enabled=%s",
  (riftCannons) => {
    const initial = createGame({
      seed: 10,
      warpPortals: true,
      minorSpecies: true,
      riftCannons,
      seats: [
        { id: "a", faction: "eridani", controller: "human" },
        { id: "b", faction: "hydran", controller: "ai" },
      ],
    });
    const command = minorSpeciesPurchaseOptions(getPlayerView(initial, "a"))[0];
    expect(command).toBeDefined();
    const accepted = commitCommand(
      { state: initial, journal: [] },
      "a",
      { commandId: "buy-replay", expectedRevision: 0, command },
      initial,
      processGameCommand,
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(
      recoverHistoryCheckpoint({
        anchor: accepted.aggregate.state,
        entries: accepted.aggregate.journal,
        targetRevision: 1,
      }),
    ).toEqual({ ok: true, checkpoint: initial });
  },
);

it("does not allow ordinary ambassadors to displace permanent Minor Species even after reputation is removed", () => {
  const state = createGame({
    seed: 9,
    warpPortals: true,
    minorSpecies: true,
    seats: [
      { id: "a", faction: "eridani", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
      { id: "c", faction: "planta", controller: "ai" },
      { id: "d", faction: "orion", controller: "ai" },
    ],
  });
  state.seats[0].minorSpecies = [
    { id: "cruisers" },
    { id: "dreadnoughts" },
    { id: "orbitals" },
    { id: "monoliths" },
  ];
  state.privateSeats[0].reputation = [];
  expect(() =>
    validateDiplomacy(state, state.seats[0], "b", "money", true),
  ).toThrow("All ambassador spaces are occupied.");
});
