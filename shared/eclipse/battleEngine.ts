import { bestReputation } from './reputation';
import { factionHasCapability, getFaction, reputationDrawMoney } from './catalog';
import {
  deriveBlueprintStats,
  neutralBlueprint,
  type ShipBlueprint,
} from "./blueprints";
import { attackDieHits, riftDieOutcome, allocateRiftBackfire } from "./combat";
import { isShipPartId, type ShipPartId, type ShipStats } from "./parts";
import { randomInt } from "./random";
import {
  connected,
  continuation,
  emit,
  hasEnemy,
  hasTech,
  player,
  requireRule,
  uniqueId,
} from "./rulesState";
import type {
  BattleGroup,
  BattleState,
  DecisionChoice,
  GameEvent,
  GameState,
  PendingDecision,
  Ship,
  Seat,
} from "./types";

const NEUTRALS = ["ancient", "guardian", "gcds"];
const VALUES: Record<Ship["type"], number> = {
  interceptor: 1,
  starbase: 1,
  ancient: 1,
  cruiser: 2,
  guardian: 2,
  dreadnought: 3,
  gcds: 3,
};
const SIZE: Record<Ship["type"], number> = {
  interceptor: 1,
  starbase: 2,
  ancient: 1,
  cruiser: 3,
  guardian: 3,
  dreadnought: 4,
  gcds: 5,
};
function neutral(owner: string): boolean {
  return NEUTRALS.includes(owner);
}
function stats(state: GameState, ship: Ship): ShipStats {
  if (
    ship.type === "ancient" ||
    ship.type === "guardian" ||
    ship.type === "gcds"
  )
    return neutralBlueprint(`${ship.type}-standard`).stats;
  const seat = player(state, ship.owner),
    bp = seat.blueprints.find((b) => b.shipType === ship.type);
  requireRule(!!bp, "Combat requires a complete ship blueprint.");
  const part = (id: string | null): ShipPartId | null => {
    requireRule(id === null || isShipPartId(id), "Unknown blueprint part.");
    return id as ShipPartId | null;
  };
  const blueprint: ShipBlueprint = {
    shipType: bp!.shipType,
    parts: bp!.parts.map(part),
    outsideParts: (bp!.outsideParts ?? []).map((id) => part(id)!),
  };
  return deriveBlueprintStats(seat.faction, blueprint);
}
function ships(state: GameState, b: BattleState, owner?: string): Ship[] {
  return state.ships.filter(
    (s) => s.sectorId === b.sectorId && (!owner || s.owner === owner),
  );
}
function opponents(state: GameState, a: string, b: string): boolean {
  return (
    a !== b &&
    !(
      (a === "ancient" &&
        !!state.seats.find((s) => s.id === b && factionHasCapability(s.faction, "ancient-coexistence"))) ||
      (b === "ancient" &&
        !!state.seats.find((s) => s.id === a && factionHasCapability(s.faction, "ancient-coexistence")))
    )
  );
}
function ownerOrder(state: GameState, sectorId: string): string[] {
  const present = state.ships.filter((s) => s.sectorId === sectorId),
    sector = state.sectors.find((s) => s.id === sectorId)!;
  const arrival = (id: string) =>
    Math.min(
      ...present.filter((s) => s.owner === id).map((s) => s.arrival ?? 0),
    );
  return [...new Set(present.map((s) => s.owner))].sort(
    (a, b) =>
      Number(neutral(b)) - Number(neutral(a)) ||
      Number(b === sector.owner) - Number(a === sector.owner) ||
      arrival(a) - arrival(b) ||
      a.localeCompare(b),
  );
}
function nextPair(state: GameState, sectorId: string): [string, string] | null {
  const order = ownerOrder(state, sectorId);
  for (let i = order.length - 1; i > 0; i--)
    for (let j = i - 1; j >= 0; j--)
      if (opponents(state, order[i], order[j])) return [order[i], order[j]];
  return null;
}
function startPair(
  state: GameState,
  b: BattleState,
  pair: [string, string],
  events: GameEvent[],
): void {
  b.attacker = pair[0];
  b.defender = pair[1];
  b.stage = "missiles";
  b.engagement = 0;
  b.groupIndex = 0;
  b.retreats = [];
  b.orderedGroups = [];
  b.forcedRetreat = false;
  const present = ships(state, b).filter((s) => pair.includes(s.owner));
  b.groups = [...new Set(present.map((s) => `${s.owner}/${s.type}`))]
    .map((id) => {
      const s = present.find((s) => `${s.owner}/${s.type}` === id)!;
      return {
        id,
        owner: s.owner,
        shipType: s.type,
        initiative: stats(state, s).initiative,
      };
    })
    .sort(
      (a, c) =>
        c.initiative - a.initiative ||
        Number(c.owner === b.defender) - Number(a.owner === b.defender) ||
        a.id.localeCompare(c.id),
    );
  for (const owner of pair)
    if (!neutral(owner) && !b.participants.includes(owner)) {
      b.participants.push(owner);
      b.participationEligible!.push(owner);
    }
  emit(
    events,
    null,
    `Battle in sector ${b.sectorId}: ${b.attacker} attacks ${b.defender}.`,
    "combat",
  );
}
function destinations(
  state: GameState,
  b: BattleState,
  group: BattleGroup,
): string[] {
  if (neutral(group.owner) || group.shipType === "starbase") return [];
  const seat = player(state, group.owner),
    from = state.sectors.find((s) => s.id === b.sectorId)!;
  return state.sectors
    .filter(
      (s) =>
        s.id !== from.id &&
        s.owner === group.owner &&
        !hasEnemy(state, seat, s.id) &&
        connected(from, s, seat),
    )
    .map((s) => s.id);
}
function destroy(
  state: GameState,
  b: BattleState,
  ship: Ship,
  killer: string | null,
): void {
  if (killer && !neutral(killer))
    b.kills.push({ owner: killer, value: VALUES[ship.type] });
  state.ships = state.ships.filter((s) => s.id !== ship.id);
}
function updatePenalty(state: GameState, b: BattleState, owner: string): void {
  const live = ships(state, b, owner);
  if (
    live.length &&
    live.every((s) =>
      b.retreats.some((r) => r.owner === owner && r.shipType === s.type),
    )
  ) {
    b.participationEligible = b.participationEligible!.filter(
      (id) => id !== owner,
    );
    if (!b.retreated.includes(owner)) b.retreated.push(owner);
  }
}
function settleRetreats(state: GameState, b: BattleState): void {
  for (const owner of [b.attacker, b.defender]) updatePenalty(state, b, owner);
  for (const retreat of b.retreats)
    if (retreat.engagement < b.engagement)
      for (const ship of ships(state, b, retreat.owner).filter(
        (s) => s.type === retreat.shipType,
      )) {
        ship.sectorId = retreat.destination;
        ship.arrival = continuation(state).nextId++;
      }
  b.retreats = [];
}
/** Publisher pp.26–29: ambassador-only spaces never hold reputation tiles. */
export function reputationCapacity(p: Seat): number {
  const track = getFaction(p.faction).capabilities;
  return Math.max(
    0,
    track.reputationSlots -
      Math.max(0, p.ambassadors.length - track.dedicatedAmbassadorSlots),
  );
}
/** Settlement is private bookkeeping and never creates a user decision. */
function settleReputation(state: GameState, owner: string, drawn: number[], capacity: number, events: GameEvent[]): void {
  const hidden = state.privateSeats.find(seat => seat.seatId === owner)!;
  const result = bestReputation(hidden.reputation, drawn, capacity);
  const battle = continuation(state).battle;
  hidden.reputationSummary = {
    id: uniqueId(state, "reputation"), round: state.round,
    battleId: battle?.id ?? null, sectorId: battle?.sectorId ?? null,
    drawn: [...drawn], ...result,
  };
  hidden.reputation = [...result.kept];
  state.supplies.reputation.push(...result.returned);
  events.push({
    type: "draw", seatId: owner, visibility: { seatId: owner },
    message: `Drew reputation tiles: ${drawn.join(", ")}. ${result.selected === null ? "Kept existing reputation; no improvement." : `Selected ${result.selected}.`} Kept: ${result.kept.join(", ") || "none"}.`,
  });
  emit(events, owner, "Reputation awarded automatically.", "combat");
}
function nextReputation(
  state: GameState,
  b: BattleState,
  events: GameEvent[],
): boolean {
  for (const owner of b.reputationOrder ?? []) {
    if (!b.participants.includes(owner) || b.awarded!.includes(owner)) continue;
    b.awarded!.push(owner);
    const count = Math.min(
      5,
      b.kills
        .filter((k) => k.owner === owner)
        .reduce((n, k) => n + k.value, 0) +
        (b.participationEligible!.includes(owner) ? 1 : 0),
    );
    const drawn: number[] = [];
    for (let i = 0; i < count && state.supplies.reputation.length; i++) {
      const roll = randomInt(state.random, state.supplies.reputation.length);
      state.random = roll.state;
      drawn.push(...state.supplies.reputation.splice(roll.value, 1));
    }
    if (!drawn.length) continue;
    const gained = reputationDrawMoney(player(state, owner).faction, drawn.length);
    if (gained) {
      player(state, owner).resources.money += gained;
      emit(events, owner, `Gained ${gained} money from reputation draws.`, "resource");
    }
    settleReputation(state, owner, drawn, reputationCapacity(player(state, owner)), events);
  }
  return true;
}
function rollAttack(
  state: GameState,
  b: BattleState,
  group: BattleGroup,
  events: GameEvent[],
): void {
  const firing = ships(state, b, group.owner).filter(
      (s) => s.type === group.shipType,
    ),
    enemy = group.owner === b.attacker ? b.defender : b.attacker;
  const targets = ships(state, b, enemy);
  b.dice = [];
  b.splitDice = [];
  b.attackingOwner = group.owner;
  for (const ship of firing) {
    const s = stats(state, ship);
    for (const weapon of s.weapons.filter(
      (w) => w.kind === (b.stage === "missiles" ? "missile" : "cannon"),
    ))
      for (let i = 0; i < weapon.dice; i++) {
        const roll = randomInt(state.random, 6);
        state.random = roll.state;
        const id = uniqueId(state, "die");
        b.dice.push({
          id,
          face: roll.value + 1,
          damage: weapon.color === "magenta" ? riftDieOutcome(roll.value + 1).damage : weapon.damage,
          computer: s.computer,
          sourceShipId: ship.id,
          sourceShipType: ship.type,
          weaponKind: weapon.kind,
          weaponColor: weapon.color,
        });
        if (
          weapon.kind === "cannon" &&
          weapon.color === "red" &&
          !neutral(group.owner) &&
          hasTech(player(state, group.owner), "antimatter-splitter")
        )
          b.splitDice.push(id);
      }
  }
  if (!b.dice.length) {
    b.groupIndex++;
    return;
  }
  emit(
    events,
    neutral(group.owner) ? null : group.owner,
    `${group.shipType} rolled ${b.dice.map((d) => d.weaponColor === "magenta"
      ? `Rift (${d.damage} damage, ${riftDieOutcome(d.face).backfire} backfire)` : d.face).join(", ")}.`,
    "combat",
  );
  const dice = b.dice.map((d) => {
    const split = b.splitDice!.includes(d.id);
    return {
      id: d.id,
      face: d.face,
      damage: d.damage,
      computer: d.computer,
      sourceShipId: d.sourceShipId,
      sourceShipType: d.sourceShipType,
      weaponKind: d.weaponKind,
      weaponColor: d.weaponColor,
      hitTargets: targets.filter(t=>attackDieHits(d,stats(state,t).shield)).map(t=>t.id),
      targets: targets
        .filter(
          (t) =>
            (d.weaponColor !== "magenta" || d.damage > 0) && (!split ||
            attackDieHits(d, stats(state, t).shield)),
        )
        .map((t) => t.id),
      ...(split ? { split: true } : {}),
    };
  });
  if (neutral(group.owner)) {
    applyAllocation(state, b, neutralAllocations(state, b), events);
    return;
  }
  state.pendingDecision = {
    id: uniqueId(state, "allocation"),
    kind: "combat-allocation",
    owner: group.owner,
    battleId: b.id,
    dice,
  };
}
function neutralAllocations(
  state: GameState,
  b: BattleState,
): { dieId: string; targetId: string }[] {
  const enemy = b.attackingOwner === b.attacker ? b.defender : b.attacker;
  const targets = ships(state, b, enemy).sort(
      (a, c) => SIZE[c.type] - SIZE[a.type] || a.id.localeCompare(c.id),
    ),
    remaining = [...(b.dice ?? [])].filter(d => d.weaponColor !== "magenta" || d.damage > 0),
    result: { dieId: string; targetId: string }[] = [],
    destroyed = new Set<string>();
  for (const target of targets) {
    const s = stats(state, target),
      needed = s.hull + 1 - target.damage;
    const subsets = new Map<number, string[]>([[0, []]]);
    for (const die of remaining.filter((d) =>
      attackDieHits(d, s.shield),
    ))
      for (const [damage, ids] of [...subsets]) {
        const sum = damage + die.damage;
        if (!subsets.has(sum)) subsets.set(sum, [...ids, die.id]);
      }
    const enough = [...subsets.keys()]
      .filter((n) => n >= needed)
      .sort((a, c) => a - c)[0];
    if (enough === undefined) continue;
    for (const id of subsets.get(enough)!) {
      result.push({ dieId: id, targetId: target.id });
      remaining.splice(
        remaining.findIndex((d) => d.id === id),
        1,
      );
    }
    destroyed.add(target.id);
  }
  for (const die of remaining) {
    const live = targets.filter((t) => !destroyed.has(t.id));
    const target =
      live.find((t) =>
        attackDieHits(die, stats(state, t).shield),
      ) ??
      live[0] ??
      targets[0];
    result.push({ dieId: die.id, targetId: target.id });
  }
  return result;
}
function applyAllocation(
  state: GameState,
  b: BattleState,
  allocations: Extract<
    DecisionChoice,
    { kind: "combat-allocation" }
  >["allocations"],
  events: GameEvent[],
): void {
  const enemy = b.attackingOwner === b.attacker ? b.defender : b.attacker,
    targets = ships(state, b, enemy),
    damage = new Map<string, number>(),
    backfireTargets = ships(state, b, b.attackingOwner).filter(ship => stats(state, ship).weapons.some(w => w.color === "magenta")),
    allTargets = [...targets, ...backfireTargets],
    hpBefore = new Map(allTargets.map((target) => [target.id, Math.max(0, stats(state, target).hull + 1 - target.damage)])),
    impacts: NonNullable<GameEvent["combatVolley"]>["impacts"] = [];
  for (const a of allocations) {
    requireRule(
      !!b.dice?.some((d) => d.id === a.dieId),
      "Only rolled dice may be assigned.",
    );
    requireRule(
      targets.some((t) => t.id === a.targetId),
      "Target must be an opposing ship in this battle.",
    );
  }
  for (const die of b.dice ?? []) {
    const assigned = allocations.filter((a) => a.dieId === die.id),
      split = b.splitDice?.includes(die.id) ?? false;
    if (split) {
      const hittable = targets.filter((t) =>
        attackDieHits(die, stats(state, t).shield),
      );
      requireRule(
        (hittable.length === 0 && assigned.length === 0) ||
          assigned.reduce((n, a) => n + (a.damage ?? die.damage), 0) ===
            die.damage,
        "Assign all four antimatter damage, or none when no target can be hit.",
      );
      for (const a of assigned) {
        const amount = a.damage ?? die.damage;
        requireRule(
          Number.isInteger(amount) &&
            amount > 0 &&
            hittable.some((t) => t.id === a.targetId),
          "Split damage must hit the chosen target.",
        );
        damage.set(a.targetId, (damage.get(a.targetId) ?? 0) + amount);
        impacts.push({ dieId: die.id, targetId: a.targetId, damage: amount, hit: true });
      }
    } else if (die.weaponColor === "magenta" && die.damage === 0) {
      requireRule(assigned.length === 0, "A Rift miss or backfire-only face has no opposing target.");
    } else {
      requireRule(assigned.length === 1, "Assign each die exactly once.");
      const a = assigned[0],
        target = targets.find((t) => t.id === a.targetId)!;
      requireRule(
        a.damage === undefined || a.damage === die.damage,
        "This weapon cannot split damage.",
      );
      if (
        attackDieHits(die, stats(state, target).shield)
      ) {
        damage.set(a.targetId, (damage.get(a.targetId) ?? 0) + die.damage);
        impacts.push({ dieId: die.id, targetId: a.targetId, damage: die.damage, hit: true });
      } else impacts.push({ dieId: die.id, targetId: a.targetId, damage: 0, hit: false });
    }
  }
  const backfireDice = (b.dice ?? []).filter(d => d.weaponColor === "magenta" && riftDieOutcome(d.face).backfire);
  let backfireIndex = 0;
  for (const allocation of allocateRiftBackfire(backfireTargets.map(target => ({ id: target.id, size: SIZE[target.type], hp: stats(state, target).hull + 1 - target.damage })), backfireDice.length)) {
    damage.set(allocation.targetId, allocation.damage);
    for (let i = 0; i < allocation.damage; i++) {
      impacts.push({dieId: backfireDice[backfireIndex++].id, targetId: allocation.targetId, damage: 1, hit: true});
    }
  }
  for (const target of allTargets) {
    target.damage += damage.get(target.id) ?? 0;
    if (target.damage > stats(state, target).hull) {
      destroy(state, b, target, target.owner === b.attackingOwner ? enemy : b.attackingOwner!);
      emit(
        events,
        b.attackingOwner!,
        `${target.type} ${target.id} destroyed${target.owner === b.attackingOwner ? " by Rift backfire" : ""}.`,
        "combat",
      );
    }
  }
  events.push({
    type: "combat",
    seatId: b.attackingOwner!,
    visibility: "public",
    message: `${new Set(impacts.filter(impact => impact.hit && targets.some(target => target.id === impact.targetId)).map(impact => impact.dieId)).size} attack dice hit their targets.${backfireDice.length ? ` Rift backfire dealt ${[...damage].filter(([id]) => backfireTargets.some(target => target.id === id)).reduce((sum, [, amount]) => sum + amount, 0)} damage to the firing fleet.` : ""}`,
    combatVolley: {
      battleId: b.id,
      sectorId: b.sectorId,
      attacker: b.attackingOwner!,
      dice: structuredClone(b.dice ?? []),
      impacts,
      targets: allTargets.filter(target => target.owner !== b.attackingOwner || damage.has(target.id)).map((target) => {
        const maximum = stats(state, target).hull + 1;
        const before = hpBefore.get(target.id) ?? 0;
        const applied = damage.get(target.id) ?? 0;
        return { id: target.id, shipType: target.type, owner: target.owner, hpBefore: before, hpAfter: Math.max(0, before - applied), excess: Math.max(0, applied - before), destroyed: target.damage >= maximum };
      }),
    },
  });
  updatePenalty(state, b, enemy);
  updatePenalty(state, b, b.attackingOwner!);
  b.dice = undefined;
  b.splitDice = undefined;
  b.attackingOwner = undefined;
  b.groupIndex++;
}

/** Mutates an engine-owned working copy; every player choice stops progression durably. */
export function advanceCombat(state: GameState, events: GameEvent[]): boolean {
  const e = continuation(state);
  if (state.pendingDecision) return false;
  if (!e.combatInitialized) {
    e.combatInitialized = true;
    e.battleSectors = state.sectors
      .filter((s) => nextPair(state, s.id) !== null)
      .sort((a, b) => Number(b.tileId) - Number(a.tileId))
      .map((s) => s.id);
  }
  for (;;) {
    if (!e.battle) {
      const sectorId = e.battleSectors[0];
      if (!sectorId) return true;
      const pair = nextPair(state, sectorId);
      if (!pair) {
        e.battleSectors.shift();
        continue;
      }
      e.battle = {
        id: uniqueId(state, "battle"),
        sectorId,
        attacker: pair[0],
        defender: pair[1],
        stage: "missiles",
        engagement: 0,
        groups: [],
        groupIndex: 0,
        retreats: [],
        kills: [],
        participants: [],
        retreated: [],
        reputationOrder: ownerOrder(state, sectorId).filter((o) => !neutral(o)),
        awarded: [],
        participationEligible: [],
      };
      startPair(state, e.battle, pair, events);
    }
    const b = e.battle;
    if (
      !ships(state, b, b.attacker).length ||
      !ships(state, b, b.defender).length
    ) {
      settleRetreats(state, b);
      const pair = nextPair(state, b.sectorId);
      if (pair) {
        startPair(state, b, pair, events);
        continue;
      }
      if (!nextReputation(state, b, events)) return false;
      e.battle = null;
      e.battleSectors.shift();
      continue;
    }
    if (b.groupIndex >= b.groups.length) {
      b.stage = "engagement";
      b.engagement++;
      b.groupIndex = 0;
      b.orderedGroups = [];
      const armed = [b.attacker, b.defender].some((o) =>
        ships(state, b, o).some((s) =>
          stats(state, s).weapons.some(
            (w) => w.kind === "cannon" && w.dice > 0,
          ),
        ),
      );
      b.forcedRetreat = !armed;
    }
    // Owners may revise tied ordering independently for missiles and every engagement.
    const activeGroup = (g: BattleGroup): boolean =>
      ships(state, b, g.owner).some(
        (ship) =>
          ship.type === g.shipType &&
          (b.stage === "engagement" ||
            stats(state, ship).weapons.some(
              (w) => w.kind === "missile" && w.dice > 0,
            )),
      );
    const tie = b.groups.find(
      (g) =>
        activeGroup(g) &&
        !b.orderedGroups!.includes(g.id) &&
        b.groups.filter(
          (h) =>
            activeGroup(h) &&
            h.owner === g.owner &&
            h.initiative === g.initiative,
        ).length > 1,
    );
    if (tie) {
      const ids = b.groups
        .filter(
          (g) =>
            activeGroup(g) &&
            g.owner === tie.owner &&
            g.initiative === tie.initiative,
        )
        .map((g) => g.id);
      if (neutral(tie.owner)) {
        b.orderedGroups!.push(...ids);
      } else {
        state.pendingDecision = {
          id: uniqueId(state, "initiative"),
          owner: tie.owner,
          kind: "initiative-order",
          battleId: b.id,
          groupIds: ids,
        };
        return false;
      }
    }
    const group = b.groups[b.groupIndex],
      present = ships(state, b, group.owner).filter(
        (s) => s.type === group.shipType,
      );
    if (!present.length) {
      b.groupIndex++;
      continue;
    }
    if (b.stage === "engagement") {
      const retreat = b.retreats.find(
        (r) => r.owner === group.owner && r.shipType === group.shipType,
      );
      if (retreat && retreat.engagement < b.engagement) {
        for (const s of present) {
          s.sectorId = retreat.destination;
          s.arrival = e.nextId++;
        }
        b.retreats = b.retreats.filter((r) => r !== retreat);
        b.groupIndex++;
        continue;
      }
      if (b.forcedRetreat && group.owner === b.defender) {
        b.groupIndex++;
        continue;
      }
      const destinationIds = destinations(state, b, group);
      if (
        b.forcedRetreat &&
        group.owner === b.attacker &&
        !destinationIds.length
      ) {
        for (const s of present) destroy(state, b, s, null);
        updatePenalty(state, b, group.owner);
        emit(
          events,
          group.owner,
          "Unarmed attacker destroyed because no legal retreat exists.",
          "combat",
        );
        continue;
      }
      if (!neutral(group.owner)) {
        state.pendingDecision = {
          id: uniqueId(state, "combat-turn"),
          owner: group.owner,
          kind: "combat-turn",
          battleId: b.id,
          shipType: group.shipType,
          destinationIds,
          ...(b.forcedRetreat && group.owner === b.attacker
            ? { forcedRetreat: true }
            : {}),
        };
        return false;
      }
    }
    rollAttack(state, b, group, events);
    if (state.pendingDecision) return false;
  }
}

export function resolveCombatChoice(
  state: GameState,
  actor: string,
  decision: PendingDecision,
  choice: DecisionChoice,
  events: GameEvent[],
): void {
  requireRule(
    decision.owner === actor,
    "Only the decision owner can choose.",
    "WRONG_DECISION",
  );
  requireRule(
    decision.kind === choice.kind,
    "Choose an option for the current decision.",
  );
  if (decision.kind === "reputation" && choice.kind === "reputation") {
    // Old saves and older clients may still submit a selection. Validate its
    // provenance, then retain the best legal holding regardless of that draft.
    if (choice.kept) {
      const hidden = state.privateSeats.find(seat => seat.seatId === actor)!;
      const remaining = [...hidden.reputation, ...decision.drawn];
      requireRule(choice.kept.length <= decision.capacity, "Your reputation track has too few free spaces.");
      for (const value of choice.kept) {
        const index = remaining.indexOf(value);
        requireRule(index >= 0, "Only owned or drawn reputation tiles may be kept.");
        remaining.splice(index, 1);
      }
      const owned = [...hidden.reputation];
      let newlyKept = 0;
      for (const value of choice.kept) {
        const index = owned.indexOf(value);
        if (index >= 0) owned.splice(index, 1); else newlyKept++;
      }
      requireRule(newlyKept <= 1, "Keep at most one newly drawn reputation tile.");
    }
    state.pendingDecision = null;
    settleReputation(state, actor, decision.drawn, Math.min(decision.capacity, reputationCapacity(player(state, actor))), events);
    return;
  }
  const b = continuation(state).battle;
  requireRule(!!b, "No active battle.");
  state.pendingDecision = null;
  if ("battleId" in decision)
    requireRule(
      decision.battleId === b!.id,
      "This decision belongs to another battle.",
    );
  if (
    decision.kind === "initiative-order" &&
    choice.kind === "initiative-order"
  ) {
    requireRule(
      choice.groupIds.length === decision.groupIds.length &&
        new Set(choice.groupIds).size === choice.groupIds.length &&
        choice.groupIds.every((id) => decision.groupIds.includes(id)),
      "Order every tied ship type exactly once.",
    );
    const ordered = choice.groupIds.map(
      (id) => b!.groups.find((g) => g.id === id)!,
    );
    let next = 0;
    b!.groups = b!.groups.map((g) =>
      decision.groupIds.includes(g.id) ? ordered[next++] : g,
    );
    b!.orderedGroups!.push(...ordered.map((g) => g.id));
    return;
  }
  if (decision.kind === "combat-turn" && choice.kind === "combat-turn") {
    const group = b!.groups[b!.groupIndex];
    requireRule(
      group.owner === actor && group.shipType === decision.shipType,
      "This ship type is not currently activated.",
    );
    if (choice.retreatTo !== null) {
      requireRule(
        decision.destinationIds.includes(choice.retreatTo) &&
          destinations(state, b!, group).includes(choice.retreatTo),
        "Choose a connected, controlled, unoccupied retreat destination.",
      );
      b!.retreats.push({
        owner: actor,
        shipType: group.shipType,
        destination: choice.retreatTo,
        engagement: b!.engagement,
      });
      updatePenalty(state, b!, actor);
      b!.groupIndex++;
      emit(
        events,
        actor,
        `${group.shipType} begins retreat toward ${choice.retreatTo}.`,
        "combat",
      );
    } else {
      requireRule(
        !b!.forcedRetreat || actor !== b!.attacker,
        "In a stalemate the attacker must retreat.",
      );
      rollAttack(state, b!, group, events);
    }
    return;
  }
  if (
    decision.kind === "combat-allocation" &&
    choice.kind === "combat-allocation"
  ) {
    requireRule(
      b!.attackingOwner === actor,
      "Only the attacking ship owner allocates these dice.",
    );
    applyAllocation(state, b!, choice.allocations, events);
    return;
  }
  requireRule(false, "Unsupported battle decision.");
}
