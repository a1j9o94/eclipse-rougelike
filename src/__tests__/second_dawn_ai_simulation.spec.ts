import {
  advanceCombat,
  resolveCombatChoice,
} from "../../shared/eclipse/battleEngine";
import { dieHits, type DieFace } from "../../shared/eclipse/combat";
import { randomSeed, randomInt } from "../../shared/eclipse/random";
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

function duel() {
  const state = createGame({
    seed: 19,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "ai" },
      { id: "b", faction: "terran-federation", controller: "human" },
    ],
  });
  const view = getPlayerView(state, "a");
  view.ships = view.ships.filter(
    (ship) => ship.owner === "a" || ship.owner === "b",
  );
  const attacker = view.ships.find((ship) => ship.owner === "a")!;
  const defender = view.ships.find((ship) => ship.owner === "b")!;
  attacker.sectorId = defender.sectorId;
  return {
    state,
    view,
    attacker,
    defender,
    attackBlueprint: view.seats[0].blueprints.find(
      (blueprint) => blueprint.shipType === "interceptor",
    )!,
    defendBlueprint: view.seats[1].blueprints.find(
      (blueprint) => blueprint.shipType === "interceptor",
    )!,
  };
}

describe("combat estimate outcome and phase fidelity", () => {
  it("separates capped unresolved fights from either side winning", () => {
    const { view, attacker, defender } = duel();
    const result = estimatePublicBattle(
      view,
      [attacker.id],
      [defender.id],
      1,
      16,
      { stage: "cannons", maxCannonRounds: 0 },
    );
    expect(result).toMatchObject({
      attackerWinProbability: 0,
      defenderWinProbability: 0,
      unresolvedProbability: 1,
      winProbability: 0,
      expectedSurvivors: 1,
      expectedDefenderSurvivors: 1,
    });
  });

  it("does not give spent missiles another volley in an ongoing cannon engagement", () => {
    const { view, attacker, defender, attackBlueprint, defendBlueprint } =
      duel();
    attackBlueprint.parts = [
      "plasma-missile",
      "nuclear-source",
      "nuclear-drive",
      "electron-computer",
    ];
    defendBlueprint.parts = [
      "gauss-shield",
      "nuclear-source",
      "nuclear-drive",
      null,
    ];
    const fresh = estimatePublicBattle(
      view,
      [attacker.id],
      [defender.id],
      42,
      128,
    );
    expect(fresh.attackerWinProbability).toBeGreaterThan(0);
    view.battle = {
      id: "battle",
      sectorId: defender.sectorId,
      attacker: "a",
      defender: "b",
      stage: "engagement",
      engagement: 2,
    };
    const underway = estimatePublicBattle(
      view,
      [attacker.id],
      [defender.id],
      42,
      128,
    );
    expect(underway).toMatchObject({
      attackerWinProbability: 0,
      defenderWinProbability: 1,
      unresolvedProbability: 0,
    });
    expect(
      estimatePublicBattle(view, [attacker.id], [defender.id], 42, 128, {
        stage: "missiles",
      }),
    ).toEqual(fresh);
  });

  it("treats missing attackers as a defender victory, and an empty encounter as unresolved", () => {
    const { view, defender } = duel();
    expect(estimatePublicBattle(view, [], [defender.id], 1)).toMatchObject({
      attackerWinProbability: 0,
      defenderWinProbability: 1,
      unresolvedProbability: 0,
      trials: 0,
    });
    expect(estimatePublicBattle(view, [], [], 1)).toMatchObject({
      attackerWinProbability: 0,
      defenderWinProbability: 0,
      unresolvedProbability: 1,
      trials: 0,
    });
  });

  it("does not silently invent an alliance between multiple opposing owners", () => {
    const { view, attacker, defender } = duel();
    view.ships.push({
      id: "ancient",
      owner: "ancient",
      type: "ancient",
      sectorId: defender.sectorId,
      damage: 0,
    });
    expect(
      estimatePublicBattle(view, [attacker.id], [defender.id, "ancient"], 9),
    ).toMatchObject({
      model: "multiple-owners",
      attackerWinProbability: 0,
      defenderWinProbability: 0,
      unresolvedProbability: 1,
      trials: 0,
    });
  });

  it("rejects overlapping, missing and invalid simulation inputs", () => {
    const { view, attacker, defender } = duel();
    expect(() =>
      estimatePublicBattle(view, [attacker.id], [attacker.id], 1),
    ).toThrow();
    expect(() =>
      estimatePublicBattle(view, ["not-visible"], [defender.id], 1),
    ).toThrow();
    expect(() =>
      estimatePublicBattle(view, [attacker.id], [defender.id], 1, 0),
    ).toThrow();
    expect(() =>
      estimatePublicBattle(view, [attacker.id], [defender.id], 1, 8, {
        maxCannonRounds: -1,
      }),
    ).toThrow();
  });

  it("uses the authoritative natural-1, natural-6, computer and shield hit rule", () => {
    const { view, attacker, defender, attackBlueprint, defendBlueprint } =
      duel();
    attackBlueprint.parts = [
      "ion-cannon",
      "nuclear-source",
      "nuclear-drive",
      "electron-computer",
    ];
    defendBlueprint.parts = [
      "gauss-shield",
      "nuclear-source",
      "nuclear-drive",
      null,
    ];
    let rng = randomSeed(123),
      hits = 0;
    for (let i = 0; i < 128; i++) {
      const roll = randomInt(rng, 6);
      rng = roll.state;
      if (dieHits((roll.value + 1) as DieFace, 1, 1)) hits++;
    }
    const estimate = estimatePublicBattle(
      view,
      [attacker.id],
      [defender.id],
      123,
      128,
      { stage: "cannons", maxCannonRounds: 1 },
    );
    expect(estimate.attackerWinProbability).toBe(hits / 128);
    expect(estimate.defenderWinProbability).toBe(0);
    expect(estimate.unresolvedProbability).toBe(1 - hits / 128);
  });

  it("uses Antimatter Splitter to kill several hittable ships in one cannon volley", () => {
    const { view, attacker, defender, attackBlueprint, defendBlueprint } =
      duel();
    attackBlueprint.parts = [
      "antimatter-cannon",
      "fusion-source",
      "nuclear-drive",
      "electron-computer",
    ];
    defendBlueprint.parts = [
      "gauss-shield",
      "nuclear-source",
      "nuclear-drive",
      null,
    ];
    view.ships.push(
      { ...defender, id: "b-second" },
      { ...defender, id: "b-third" },
    );
    const ids = [defender.id, "b-second", "b-third"];
    const ordinary = estimatePublicBattle(view, [attacker.id], ids, 42, 128, {
      stage: "cannons",
      maxCannonRounds: 1,
    });
    view.seats[0].technologies.nano.push("antimatter-splitter");
    const split = estimatePublicBattle(view, [attacker.id], ids, 42, 128, {
      stage: "cannons",
      maxCannonRounds: 1,
    });
    expect(ordinary.attackerWinProbability).toBe(0);
    expect(split.attackerWinProbability).toBeGreaterThan(0);
    expect(split.expectedDefenderSurvivors).toBeLessThan(
      ordinary.expectedDefenderSurvivors,
    );
  });

  it("never applies Antimatter Splitter to red missiles", () => {
    const { view, attacker, defender, attackBlueprint, defendBlueprint } =
      duel();
    attackBlueprint.parts = [
      "antimatter-missile",
      "nuclear-source",
      "nuclear-drive",
      "electron-computer",
    ];
    defendBlueprint.parts = [
      "gauss-shield",
      "nuclear-source",
      "nuclear-drive",
      null,
    ];
    view.ships.push({ ...defender, id: "b-second" });
    const before = estimatePublicBattle(
      view,
      [attacker.id],
      [defender.id, "b-second"],
      42,
      128,
    );
    view.seats[0].technologies.nano.push("antimatter-splitter");
    expect(
      estimatePublicBattle(
        view,
        [attacker.id],
        [defender.id, "b-second"],
        42,
        128,
      ),
    ).toEqual(before);
    expect(before.attackerWinProbability).toBe(0);
  });
});

it("matches authoritative Antimatter Splitter outcomes for 24 seeded one-volley fights", () => {
  for (let seed = 1; seed <= 24; seed++) {
    const {
      state,
      view,
      attacker,
      defender,
      attackBlueprint,
      defendBlueprint,
    } = duel();
    attackBlueprint.parts = [
      "antimatter-cannon",
      "fusion-source",
      "nuclear-drive",
      "electron-computer",
    ];
    defendBlueprint.parts = [
      "gauss-shield",
      "nuclear-source",
      "nuclear-drive",
      null,
    ];
    view.seats[0].technologies.nano.push("antimatter-splitter");
    view.ships.push(
      { ...defender, id: "b-second" },
      { ...defender, id: "b-third" },
    );
    const defenderIds = [defender.id, "b-second", "b-third"];
    const estimated = estimatePublicBattle(
      view,
      [attacker.id],
      defenderIds,
      seed,
      1,
      { stage: "cannons", maxCannonRounds: 1 },
    );
    state.seats = structuredClone(view.seats);
    state.ships = structuredClone(view.ships);
    state.phase = "combat";
    state.activeSeatId = null;
    state.pendingDecision = null;
    state.random = randomSeed(seed);
    state.engine!.battleSectors = [defender.sectorId];
    advanceCombat(state, []);
    for (
      let step = 0;
      step < 3 && state.pendingDecision?.kind === "combat-turn";
      step++
    ) {
      const decision = state.pendingDecision;
      resolveCombatChoice(
        state,
        decision.owner,
        decision,
        { kind: "combat-turn", retreatTo: null },
        [],
      );
      advanceCombat(state, []);
    }
    const allocation = state.pendingDecision;
    expect(allocation?.kind).toBe("combat-allocation");
    if (allocation?.kind !== "combat-allocation")
      throw new Error("Expected authoritative volley.");
    expect(allocation.owner).toBe("a");
    const die = allocation.dice[0];
    expect(die.split).toBe(true);
    resolveCombatChoice(
      state,
      "a",
      allocation,
      {
        kind: "combat-allocation",
        allocations: dieHits(die.face as DieFace, 1, 1)
          ? defenderIds.map((targetId, index) => ({
              dieId: die.id,
              targetId,
              damage: index === 2 ? 2 : 1,
            }))
          : [],
      },
      [],
    );
    const actualSurvivors = state.ships.filter(
      (ship) => ship.owner === "b",
    ).length;
    expect(estimated.expectedDefenderSurvivors).toBe(actualSurvivors);
    expect(estimated.attackerWinProbability).toBe(
      Number(actualSurvivors === 0),
    );
  }
});

it("estimates forced-retreat survivors from the destination of a proposed attack", () => {
  const { view, attacker, defender, attackBlueprint, defendBlueprint } = duel();
  attackBlueprint.parts = [
    "gauss-shield",
    "nuclear-source",
    "nuclear-drive",
    null,
  ];
  defendBlueprint.parts = [
    "gauss-shield",
    "nuclear-source",
    "nuclear-drive",
    null,
  ];
  const target = view.sectors.find(
    (sector) => sector.id === defender.sectorId,
  )!;
  target.tileId = "001";
  target.position = { q: 0, r: 0 };
  target.rotation = 0;
  const safe = {
    ...structuredClone(target),
    id: "safe",
    owner: "a",
    position: { q: 1, r: 0 },
  };
  view.sectors = [target, safe];
  attacker.sectorId = safe.id;
  const retreat = estimatePublicBattle(
    view,
    [attacker.id],
    [defender.id],
    3,
    8,
    { stage: "cannons" },
  );
  expect(retreat).toMatchObject({
    defenderWinProbability: 1,
    expectedSurvivors: 1,
  });
  safe.owner = "b";
  expect(
    estimatePublicBattle(view, [attacker.id], [defender.id], 3, 8, {
      stage: "cannons",
    }),
  ).toMatchObject({ defenderWinProbability: 1, expectedSurvivors: 0 });
});
