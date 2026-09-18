import { describe, expect, it } from "vitest";
import {
  advanceCombat,
  resolveCombatChoice,
  reputationCapacity,
} from "../../shared/eclipse/battleEngine";
import { initialBlueprints } from "../../shared/eclipse/blueprints";
import { randomInt, randomSeed } from "../../shared/eclipse/random";
import { getPlayerView, visibleEvents } from "../../shared/eclipse/protocol";
import { projectHistoryEntry } from "../../shared/eclipse/history";
import type {
  DecisionChoice,
  GameEvent,
  GameState,
  Seat,
} from "../../shared/eclipse/types";
function seat(id: string): Seat {
  return {
    id,
    faction: "terran-directorate",
    controller: "human",
    resources: { money: 0, science: 0, materials: 0 },
    populationTracks: { money: 1, science: 1, materials: 1 },
    influenceOnTrack: 12,
    actionDiscs: {
      explore: 0,
      research: 0,
      build: 0,
      move: 0,
      influence: 0,
      upgrade: 0,
    },
    colonyShipsAvailable: 3,
    passed: true,
    eliminated: false,
    technologies: { military: [], grid: [], nano: [] },
    blueprints: initialBlueprints("terran-directorate"),
    ambassadors: [],
    traitor: false,
  };
}
function fixture(): GameState {
  return {
    rulesVersion: "test",
    catalogVersion: "test",
    revision: 0,
    round: 1,
    phase: "combat",
    activeSeatId: null,
    startSeatId: "a",
    firstPasser: "a",
    seats: [seat("a"), seat("b"), seat("c")],
    sectors: [
      {
        id: "s",
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
        id: "home",
        tileId: "001",
        position: { q: 1, r: 0 },
        rotation: 0,
        owner: "b",
        population: [],
        orbital: false,
        monolith: false,
        discovery: false,
      },
    ],
    ships: [
      {
        id: "a-i",
        owner: "a",
        type: "interceptor",
        sectorId: "s",
        damage: 0,
        arrival: 1,
      },
      {
        id: "b-i",
        owner: "b",
        type: "interceptor",
        sectorId: "s",
        damage: 0,
        arrival: 2,
      },
    ],
    technologyMarket: [],
    pendingDecision: null,
    privateSeats: ["a", "b", "c"].map((seatId) => ({
      seatId,
      reputation: [],
      discoveriesKept: [],
    })),
    random: randomSeed(9),
    supplies: {
      inner: [],
      middle: [],
      outer: [],
      technology: [],
      discovery: [],
      reputation: [1, 1, 1, 2, 2, 2, 3, 3, 4],
    },
    engine: {
      warpPortals: true,
      action: null,
      decisions: [],
      sectorDiscoveries: [],
      discardedSectors: { inner: [], middle: [], outer: [] },
      discardedDiscoveries: [],
      boxedSectors: [],
      battle: null,
      battleSectors: [],
      upkeepDone: [],
      scores: null,
      nextId: 1,
    },
  };
}
function choose(
  s: GameState,
  choice: DecisionChoice,
  events: GameEvent[] = [],
): void {
  const d = s.pendingDecision!;
  s.pendingDecision = null;
  resolveCombatChoice(s, d.owner, d, choice, events);
  advanceCombat(s, events);
}
function attackThrough(s: GameState, max = 250): void {
  for (let i = 0; i < max; i++) {
    if (advanceCombat(s, [])) return;
    const d = s.pendingDecision!;
    if (d.kind === "combat-turn")
      choose(s, { kind: "combat-turn", retreatTo: null });
    else if (d.kind === "initiative-order")
      choose(s, { kind: "initiative-order", groupIds: d.groupIds });
    else if (d.kind === "combat-allocation")
      choose(s, {
        kind: "combat-allocation",
        allocations: d.dice.map((die) => ({
          dieId: die.id,
          targetId: die.targets[0],
        })),
      });
    else if (d.kind === "reputation")
      choose(s, {
        kind: "reputation",
        kept: [
          ...s.privateSeats.find((p) => p.seatId === d.owner)!.reputation,
          ...d.drawn.slice(0, 1),
        ].slice(-d.capacity),
      });
    else throw new Error(d.kind);
  }
  throw new Error("did not finish");
}
describe("persisted complete battles", () => {
  it("lets the owner choose tied activation order again in each engagement round", () => {
    const s = fixture();
    s.ships.push({
      id: "a-s",
      owner: "a",
      type: "starbase",
      sectorId: "s",
      damage: 0,
    });
    advanceCombat(s, []);
    expect(s.pendingDecision?.kind).toBe("initiative-order");
    choose(s, {
      kind: "initiative-order",
      groupIds: ["a/interceptor", "a/starbase"],
    });
    const b = s.engine!.battle!;
    b.groupIndex = b.groups.length;
    s.pendingDecision = null;
    advanceCombat(s, []);
    expect(s.pendingDecision?.kind).toBe("initiative-order");
    choose(s, {
      kind: "initiative-order",
      groupIds: ["a/starbase", "a/interceptor"],
    });
    expect(s.engine!.battle!.groups[0].shipType).toBe("starbase");
  });

  it("applies retreat penalty when an immobile unarmed ship is lost during forced retreat", () => {
    const s = fixture();
    for (const p of s.seats) {
      p.blueprints[0].parts[0] = "hull";
      p.blueprints.find((b) => b.shipType === "starbase")!.parts[1] = "hull";
    }
    s.ships.push({
      id: "b-s",
      owner: "b",
      type: "starbase",
      sectorId: "s",
      damage: 0,
    });
    advanceCombat(s, []);
    expect(s.pendingDecision?.kind).toBe("initiative-order");
    const d = s.pendingDecision!;
    if (d.kind !== "initiative-order") throw new Error("tie");
    choose(s, {
      kind: "initiative-order",
      groupIds: ["b/interceptor", "b/starbase"],
    });
    choose(s, { kind: "combat-turn", retreatTo: "home" });
    attackThrough(s);
    expect(s.privateSeats.find((p) => p.seatId === "b")?.reputation).toEqual(
      [],
    );
  });

  it("automatically assigns neutral hits to destroy an interceptor then damage a surviving dreadnought", () => {
    const s = fixture();
    s.ships = s.ships.filter((x) => x.owner === "a");
    s.ships.push(
      {
        id: "a-d",
        owner: "a",
        type: "dreadnought",
        sectorId: "s",
        damage: 0,
        arrival: 1,
      },
      {
        id: "anc",
        owner: "ancient",
        type: "ancient",
        sectorId: "s",
        damage: 0,
      },
    );
    advanceCombat(s, []);
    const b = s.engine!.battle!;
    b.stage = "engagement";
    b.engagement = 1;
    b.groupIndex = b.groups.findIndex((g) => g.owner === "ancient");
    s.pendingDecision = null;
    for (let seed = 0; seed < 1000; seed++) {
      const one = randomInt(randomSeed(seed), 6),
        two = randomInt(one.state, 6);
      if (one.value >= 4 && two.value >= 4) {
        s.random = randomSeed(seed);
        break;
      }
    }
    advanceCombat(s, []);
    expect(s.ships.some((x) => x.id === "a-i")).toBe(false);
    expect(s.ships.find((x) => x.id === "a-d")?.damage).toBe(1);
  });
  it("completes voluntary retreat on the next activation and removes participation-only reputation", () => {
    const s = fixture();
    s.seats[0].blueprints[0].parts[0] = "hull";
    advanceCombat(s, []);
    choose(s, { kind: "combat-turn", retreatTo: null });
    expect(s.pendingDecision?.owner).toBe("b");
    choose(s, { kind: "combat-turn", retreatTo: "home" });
    expect(s.ships.find((x) => x.id === "b-i")?.sectorId).toBe("s");
    choose(s, { kind: "combat-turn", retreatTo: null });
    expect(s.ships.find((x) => x.id === "b-i")?.sectorId).toBe("home");
    attackThrough(s);
    expect(s.privateSeats.find((p) => p.seatId === "b")?.reputation).toEqual(
      [],
    );
    expect(
      s.privateSeats.find((p) => p.seatId === "a")?.reputation,
    ).toHaveLength(1);
  });
  it("checks higher numbered sectors before the galactic center", () => {
    const s = fixture();
    s.sectors.push({
      ...s.sectors[0],
      id: "outer",
      tileId: "318",
      position: { q: 3, r: 0 },
    });
    s.ships.push(
      {
        id: "a-outer",
        owner: "a",
        type: "interceptor",
        sectorId: "outer",
        damage: 0,
      },
      {
        id: "b-outer",
        owner: "b",
        type: "interceptor",
        sectorId: "outer",
        damage: 0,
      },
    );
    advanceCombat(s, []);
    expect(s.engine!.battle!.sectorId).toBe("outer");
  });

  it("reserves dedicated ambassador and reputation spaces", () => {
    const p = seat("a");
    expect(reputationCapacity(p)).toBe(4);
    p.ambassadors = ["b"];
    expect(reputationCapacity(p)).toBe(4);
    p.faction = "planta";
    expect(reputationCapacity(p)).toBe(3);
    p.ambassadors = ["b", "c"];
    expect(reputationCapacity(p)).toBe(2);
    p.faction = "orion";
    expect(reputationCapacity(p)).toBe(3);
    p.faction = "eridani";
    expect(reputationCapacity(p)).toBe(2);
  });
  it("defender fires first on tied initiative and roll is not repeated after reconnect", () => {
    const s = fixture();
    advanceCombat(s, []);
    expect(s.pendingDecision).toMatchObject({
      kind: "combat-turn",
      owner: "a",
    });
    choose(s, { kind: "combat-turn", retreatTo: null });
    expect(s.pendingDecision?.kind).toBe("combat-allocation");
    const copy = structuredClone(s);
    const draws = s.random.draws;
    advanceCombat(copy, []);
    expect(copy.pendingDecision).toEqual(s.pendingDecision);
    expect(copy.random.draws).toBe(draws);
  });
  it("publishes which targets a rolled die can actually hit", () => {
    const s=fixture();advanceCombat(s,[]);
    for(let seed=0;seed<100;seed++){if(randomInt(randomSeed(seed),6).value===2){s.random=randomSeed(seed);break;}}
    choose(s,{kind:'combat-turn',retreatTo:null});
    const d=s.pendingDecision;if(d?.kind!=='combat-allocation')throw new Error('Expected saved roll.');
    expect(d.dice[0]).toMatchObject({face:3,hitTargets:[]});
    expect(d.dice[0].targets.length).toBeGreaterThan(0);
  });
  it("publishes additive weapon provenance and a structured volley result without another draw", () => {
    const s=fixture(); advanceCombat(s,[]); choose(s,{kind:"combat-turn",retreatTo:null});
    const d=s.pendingDecision;if(d?.kind!=="combat-allocation")throw new Error("expected volley");
    expect(d.dice[0]).toMatchObject({sourceShipId:"a-i",sourceShipType:"interceptor",weaponKind:"cannon",weaponColor:"yellow",computer:0});
    const draws=s.random.draws, events:GameEvent[]=[];
    choose(s,{kind:"combat-allocation",allocations:d.dice.map(die=>({dieId:die.id,targetId:die.targets[0]}))},events);
    expect(s.random.draws).toBe(draws);
    const volley=events.find(event=>event.combatVolley)?.combatVolley;
    expect(volley).toMatchObject({battleId:"battle-1",attacker:"a",dice:[{sourceShipId:"a-i",weaponKind:"cannon"}],targets:[{id:"b-i"}]});
    expect(volley?.impacts).toHaveLength(d.dice.length);
  });
  it.each(["interceptor", "ancient"] as const)("retains destroyed %s identity in public combat history", (shipType) => {
    const s = fixture();
    advanceCombat(s, []);
    expect(getPlayerView(s, "a")?.battle).toMatchObject({ id: "battle-1" });
    choose(s, { kind: "combat-turn", retreatTo: null });
    const d = s.pendingDecision;
    if (d?.kind !== "combat-allocation") throw new Error("Expected saved volley");
    const target = s.ships.find(ship => ship.id === "b-i")!;
    const owner = shipType === "ancient" ? "ancient" : "b";
    target.type = shipType;
    target.owner = owner;
    s.engine!.battle!.attacker = owner;
    for (const die of s.engine!.battle!.dice!) { die.face = 6; die.damage = 20; }
    const events: GameEvent[] = [];
    const choice: DecisionChoice = { kind: "combat-allocation", allocations: d.dice.map(die => ({ dieId: die.id, targetId: target.id })) };
    choose(s, choice, events);
    expect(s.ships.some(ship => ship.id === target.id)).toBe(false);
    const expected = { id: target.id, shipType, owner, destroyed: true, hpAfter: 0 };
    expect(visibleEvents(events, "c").find(event => event.combatVolley)?.combatVolley?.targets).toEqual([expect.objectContaining(expected)]);
    const history = projectHistoryEntry({ actor: "a", request: { commandId: "allocation", expectedRevision: 0, command: { type: "resolve", decisionId: d.id, choice } }, receipt: { commandId: "allocation", revision: 1, eventCount: events.length }, events }, s.seats);
    expect(history.combatVolley?.targets).toEqual([expect.objectContaining(expected)]);
    expect(history).not.toHaveProperty("random");
    expect(history).not.toHaveProperty("privateSeats");
  });
  it("keeps retreating ships targetable until their next activation", () => {
    const s = fixture();
    advanceCombat(s, []);
    s.engine!.battle!.groups.reverse();
    s.engine!.battle!.groupIndex = 0;
    s.pendingDecision = null;
    advanceCombat(s, []);
    expect(s.pendingDecision?.owner).toBe("b");
    choose(s, { kind: "combat-turn", retreatTo: "home" });
    expect(s.ships.find((x) => x.id === "b-i")?.sectorId).toBe("s");
    expect(s.engine!.battle!.retreats).toHaveLength(1);
  });
  it("resolves reverse arrival before the controlling defender, then awards once per sector", () => {
    const s = fixture();
    s.ships.push({
      id: "c-i",
      owner: "c",
      type: "interceptor",
      sectorId: "s",
      damage: 0,
      arrival: 3,
    });
    advanceCombat(s, []);
    expect(s.engine!.battle).toMatchObject({ attacker: "c", defender: "b" });
    attackThrough(s);
    expect(
      new Set(s.ships.filter((x) => x.sectorId === "s").map((x) => x.owner))
        .size,
    ).toBe(1);
    expect(s.privateSeats.every((p) => p.reputation.length <= 1)).toBe(true);
    expect(s.privateSeats.flatMap((p) => p.reputation).length).toBe(3);
  });
  it("forces an unarmed attacker to retreat or destroys it when no retreat exists", () => {
    const s = fixture();
    for (const p of s.seats)
      p.blueprints.find((b) => b.shipType === "interceptor")!.parts[0] = "hull";
    s.sectors = s.sectors.filter((x) => x.id === "s");
    advanceCombat(s, []);
    expect(s.ships.map((x) => x.owner)).toEqual(["a"]);
    expect(s.pendingDecision?.kind).toBe("reputation");
  });
  it("does not battle peaceful Draco and Ancients", () => {
    const s = fixture();
    s.seats[0].faction = "draco";
    s.ships = s.ships.filter((x) => x.owner === "a");
    s.ships.push({
      id: "anc",
      owner: "ancient",
      type: "ancient",
      sectorId: "s",
      damage: 0,
    });
    expect(advanceCombat(s, [])).toBe(true);
    expect(s.ships).toHaveLength(2);
  });
  it("finishes deterministic replay with conserved reputation tiles", () => {
    const s = fixture(),
      copy = structuredClone(s);
    attackThrough(s);
    attackThrough(copy);
    expect(copy).toEqual(s);
    expect(
      s.supplies.reputation.length +
        s.privateSeats.flatMap((p) => p.reputation).length,
    ).toBe(9);
  });
  it("splits antimatter cannon damage only among targets actually hit", () => {
    const s = fixture();
    s.seats[0].technologies.nano.push("antimatter-splitter");
    s.seats[0].blueprints[0].parts[0] = "antimatter-cannon";
    s.ships.push({
      id: "b-j",
      owner: "b",
      type: "interceptor",
      sectorId: "s",
      damage: 0,
      arrival: 2,
    });
    advanceCombat(s, []);
    choose(s, { kind: "combat-turn", retreatTo: null });
    const b = s.engine!.battle!;
    b.dice![0].face = 6;
    const dieId = b.dice![0].id;
    choose(s, {
      kind: "combat-allocation",
      allocations: [
        { dieId, targetId: "b-i", damage: 1 },
        { dieId, targetId: "b-j", damage: 3 },
      ],
    });
    expect(s.ships.filter((x) => x.owner === "b")).toHaveLength(0);
    expect(b.kills).toEqual([
      { owner: "a", value: 1 },
      { owner: "a", value: 1 },
    ]);
  });
  it("does not permit antimatter missiles to split", () => {
    const s = fixture();
    s.seats[0].technologies.nano.push("antimatter-splitter");
    s.seats[0].blueprints[0].parts[0] = "antimatter-missile";
    advanceCombat(s, []);
    const b = s.engine!.battle!;
    expect(b.splitDice).toEqual([]);
    const d = s.pendingDecision!;
    expect(d.kind).toBe("combat-allocation");
    expect(() =>
      resolveCombatChoice(
        s,
        "a",
        d,
        {
          kind: "combat-allocation",
          allocations: [
            { dieId: b.dice![0].id, targetId: "b-i", damage: 2 },
            { dieId: b.dice![0].id, targetId: "b-i", damage: 2 },
          ],
        },
        [],
      ),
    ).toThrow();
  });
  it("draws at most five reputation tiles and permits at most one new tile", () => {
    const s = fixture();
    advanceCombat(s, []);
    const b = s.engine!.battle!;
    b.kills = Array.from({ length: 6 }, () => ({ owner: "a", value: 3 }));
    s.ships = s.ships.filter((x) => x.owner === "a");
    s.pendingDecision = null;
    advanceCombat(s, []);
    const d = s.pendingDecision!;
    expect(d.kind).toBe("reputation");
    if (d.kind !== "reputation") throw new Error("expected reputation");
    expect(d.drawn).toHaveLength(5);
    expect(() =>
      resolveCombatChoice(
        s,
        "a",
        d,
        { kind: "reputation", kept: d.drawn.slice(0, 2) },
        [],
      ),
    ).toThrow();
  });
  it("cancels a retreat declared in the same engagement round the battle ends", () => {
    const s = fixture();
    advanceCombat(s, []);
    const b = s.engine!.battle!;
    b.retreats = [
      {
        owner: "a",
        shipType: "interceptor",
        destination: "home",
        engagement: b.engagement,
      },
    ];
    s.ships = s.ships.filter((x) => x.owner === "a");
    s.pendingDecision = null;
    advanceCombat(s, []);
    expect(s.ships[0].sectorId).toBe("s");
  });
  it("completes an earlier retreat when the battle ends before its activation", () => {
    const s = fixture();
    advanceCombat(s, []);
    const b = s.engine!.battle!;
    b.engagement = 2;
    b.retreats = [
      {
        owner: "a",
        shipType: "interceptor",
        destination: "home",
        engagement: 1,
      },
    ];
    s.ships = s.ships.filter((x) => x.owner === "a");
    s.pendingDecision = null;
    advanceCombat(s, []);
    expect(s.ships[0].sectorId).toBe("home");
  });
  it("fires missiles only before the first engagement round", () => {
    const s = fixture();
    s.seats[0].blueprints[0].parts[3] = "plasma-missile";
    advanceCombat(s, []);
    expect(s.engine!.battle!.stage).toBe("missiles");
    expect(s.pendingDecision?.kind).toBe("combat-allocation");
    const b = s.engine!.battle!;
    for (const die of b.dice!) die.face = 1;
    const d = s.pendingDecision!;
    if (d.kind !== "combat-allocation") throw new Error("expected missiles");
    choose(s, {
      kind: "combat-allocation",
      allocations: d.dice.map((die) => ({ dieId: die.id, targetId: "b-i" })),
    });
    expect(b.stage).toBe("engagement");
    choose(s, { kind: "combat-turn", retreatTo: null });
    expect(b.dice).toHaveLength(1);
  });
  it("rejects assigning an unavailable die or another player choice", () => {
    const s = fixture();
    advanceCombat(s, []);
    expect(() =>
      resolveCombatChoice(
        s,
        "b",
        s.pendingDecision!,
        { kind: "combat-turn", retreatTo: null },
        [],
      ),
    ).toThrow();
    choose(s, { kind: "combat-turn", retreatTo: null });
    expect(() =>
      resolveCombatChoice(
        s,
        "a",
        s.pendingDecision!,
        {
          kind: "combat-allocation",
          allocations: [{ dieId: "invented", targetId: "b-i" }],
        },
        [],
      ),
    ).toThrow();
  });
});
