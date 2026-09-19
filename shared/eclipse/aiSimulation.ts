import { deriveBlueprintStats, neutralBlueprint } from "./blueprints";
import { factionHasCapability } from "./catalog";
import { publicBlueprint } from "./legal";
import { dieHits, type DieFace } from "./combat";
import { connectionBetween } from "./geometry";
import { mapSector, movementAbilities } from "./rulesState";
import { randomInt, randomSeed } from "./random";
import type { ShipStats } from "./parts";
import type { PlayerView, Ship } from "./types";

export interface CombatEstimate {
  /** Compatibility alias for attackerWinProbability. Never invert to estimate defender wins. */
  winProbability: number;
  attackerWinProbability: number;
  defenderWinProbability: number;
  /** Work limit reached, or input needs a multi-owner battle-order model. */
  unresolvedProbability: number;
  /** Surviving attacker ships, including survivors of a forced retreat. */
  expectedSurvivors: number;
  expectedDefenderSurvivors: number;
  trials: number;
  model: "duel" | "multiple-owners" | "non-opponents";
}
export interface CombatEstimateOptions {
  /** Omit to infer a matching active battle's stage, otherwise begin with missiles. */
  stage?: "missiles" | "cannons";
  /** A bounded search may request a smaller horizon; unfinished fights remain unresolved. */
  maxCannonRounds?: number;
}
interface SimulatedShip {
  id: string;
  owner: string;
  defender: boolean;
  damage: number;
  stats: ShipStats;
  splitter: boolean;
  canRetreat: boolean;
}

function canRetreat(view: PlayerView, ship: Ship, sectorId: string): boolean {
  const seat = view.seats.find((candidate) => candidate.id === ship.owner);
  const source = view.sectors.find((sector) => sector.id === sectorId);
  if (!seat || !source || ship.type === "starbase") return false;
  const abilities = movementAbilities(seat);
  return view.sectors.some(
    (sector) =>
      sector.id !== source.id &&
      sector.owner === seat.id &&
      !view.ships.some(
        (other) =>
          other.sectorId === sector.id &&
          other.owner !== seat.id &&
          !(factionHasCapability(seat.faction, "ancient-coexistence") && other.type === "ancient"),
      ) &&
      connectionBetween(
        mapSector(source),
        mapSector(sector),
        abilities.wormholeGenerator,
      ) !== "none",
  );
}

/** Public-only, bounded duel estimate using independent randomness and authoritative hit rules.
 * It models full volleys and forced unarmed retreat, but not voluntary retreats or chosen tied
 * initiative order. Mid-engagement estimates restart the cannon round, never spent missiles.
 * Multiple owners need sequential pair selection by the caller; they are never simulated as allies.
 */
export function estimatePublicBattle(
  view: PlayerView,
  attackerIds: readonly string[],
  defenderIds: readonly string[],
  simulationSeed: number,
  trials = 24,
  options: CombatEstimateOptions = {},
): CombatEstimate {
  if (!Number.isInteger(trials) || trials < 1 || trials > 128)
    throw new RangeError("Simulation trials must be between 1 and 128.");
  const rounds = options.maxCannonRounds ?? 32;
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 32)
    throw new RangeError("Simulation cannon rounds must be between 0 and 32.");
  const attackers = new Set(attackerIds),
    defenders = new Set(defenderIds);
  if (
    attackers.size !== attackerIds.length ||
    defenders.size !== defenderIds.length ||
    attackerIds.some((id) => defenders.has(id))
  )
    throw new RangeError(
      "Each visible ship may belong to only one simulation side.",
    );
  const selected = view.ships.filter(
    (ship) => attackers.has(ship.id) || defenders.has(ship.id),
  );
  if (selected.length !== attackers.size + defenders.size)
    throw new RangeError("Combat estimate requires visible ships.");
  const attackerOwners = new Set(
    selected.filter((ship) => attackers.has(ship.id)).map((ship) => ship.owner),
  );
  const defenderOwners = new Set(
    selected.filter((ship) => defenders.has(ship.id)).map((ship) => ship.owner),
  );
  const staticResult = (
    attacker: number,
    defender: number,
    unresolved: number,
    model: CombatEstimate["model"] = "duel",
  ): CombatEstimate => ({
    winProbability: attacker,
    attackerWinProbability: attacker,
    defenderWinProbability: defender,
    unresolvedProbability: unresolved,
    expectedSurvivors: attackers.size,
    expectedDefenderSurvivors: defenders.size,
    trials: 0,
    model,
  });
  if (attackerOwners.size > 1 || defenderOwners.size > 1)
    return staticResult(0, 0, 1, "multiple-owners");
  const attackerOwner = [...attackerOwners][0],
    defenderOwner = [...defenderOwners][0];
  if (
    attackerOwner &&
    defenderOwner &&
    (attackerOwner === defenderOwner ||
      (attackerOwner === "ancient" &&
        !!view.seats.find((seat) => seat.id === defenderOwner && factionHasCapability(seat.faction, "ancient-coexistence"))) ||
      (defenderOwner === "ancient" &&
        !!view.seats.find((seat) => seat.id === attackerOwner && factionHasCapability(seat.faction, "ancient-coexistence"))))
  )
    return staticResult(0, 0, 1, "non-opponents");
  if (!attackers.size || !defenders.size)
    return staticResult(
      Number(attackers.size > 0),
      Number(defenders.size > 0),
      Number(!attackers.size && !defenders.size),
    );

  const matchingBattle =
    view.battle?.attacker === attackerOwner &&
    view.battle.defender === defenderOwner &&
    selected.every((ship) => ship.sectorId === view.battle!.sectorId);
  const startWithMissiles = options.stage
    ? options.stage === "missiles"
    : !(matchingBattle && view.battle?.stage === "engagement");
  const defenderSectors = new Set(
    selected
      .filter((ship) => defenders.has(ship.id))
      .map((ship) => ship.sectorId),
  );
  const encounterSectorId =
    defenderSectors.size === 1 ? [...defenderSectors][0] : undefined;
  const templates: SimulatedShip[] = selected
    .map((ship) => {
      const seat = view.seats.find((candidate) => candidate.id === ship.owner);
      const blueprint = seat?.blueprints.find(
        (candidate) => candidate.shipType === ship.type,
      );
      const stats =
        seat && blueprint
          ? deriveBlueprintStats(seat.faction, publicBlueprint(blueprint))
          : ship.type === "ancient" ||
              ship.type === "guardian" ||
              ship.type === "gcds"
            ? neutralBlueprint(`${ship.type}-standard`).stats
            : null;
      if (!stats)
        throw new Error("Combat estimate requires a visible blueprint.");
      return {
        id: ship.id,
        owner: ship.owner,
        defender: defenders.has(ship.id),
        damage: ship.damage,
        stats,
        splitter:
          !!seat &&
          Object.values(seat.technologies).some((track) =>
            track.includes("antimatter-splitter"),
          ),
        canRetreat: canRetreat(view, ship, encounterSectorId ?? ship.sectorId),
      };
    })
    .sort(
      (a, b) =>
        b.stats.initiative - a.stats.initiative ||
        Number(b.defender) - Number(a.defender) ||
        a.id.localeCompare(b.id),
    );

  let random = randomSeed(simulationSeed >>> 0),
    attackerWins = 0,
    defenderWins = 0,
    unresolved = 0,
    attackerSurvivors = 0,
    defenderSurvivors = 0;
  for (let trial = 0; trial < trials; trial++) {
    const fleet = templates.map((ship) => ({ ...ship }));
    const alive = (ship: SimulatedShip) => ship.damage <= ship.stats.hull;
    let forcedRetreat = false;
    for (let round = startWithMissiles ? -1 : 0; round < rounds; round++) {
      if (
        !fleet.some((ship) => ship.defender && alive(ship)) ||
        !fleet.some((ship) => !ship.defender && alive(ship))
      )
        break;
      if (
        round >= 0 &&
        !fleet.some(
          (ship) =>
            alive(ship) &&
            ship.stats.weapons.some(
              (weapon) => weapon.kind === "cannon" && weapon.dice > 0,
            ),
        )
      ) {
        forcedRetreat = true;
        break;
      }
      for (const ship of fleet) {
        if (!alive(ship)) continue;
        const targets = fleet.filter(
          (target) => target.defender !== ship.defender && alive(target),
        );
        if (!targets.length) break;
        for (const weapon of ship.stats.weapons.filter(
          (weapon) => weapon.kind === (round < 0 ? "missile" : "cannon"),
        ))
          for (let die = 0; die < weapon.dice; die++) {
            const roll = randomInt(random, 6);
            random = roll.state;
            const face = (roll.value + 1) as DieFace;
            let remaining = weapon.damage;
            const split =
              ship.splitter &&
              weapon.kind === "cannon" &&
              weapon.color === "red";
            do {
              const target = targets
                .filter(
                  (candidate) =>
                    alive(candidate) &&
                    dieHits(face, ship.stats.computer, candidate.stats.shield),
                )
                .sort(
                  (a, b) =>
                    a.stats.hull +
                      1 -
                      a.damage -
                      (b.stats.hull + 1 - b.damage) || a.id.localeCompare(b.id),
                )[0];
              if (!target) break;
              const damage = split
                ? Math.min(remaining, target.stats.hull + 1 - target.damage)
                : remaining;
              target.damage += damage;
              remaining -= damage;
            } while (split && remaining > 0);
          }
      }
    }
    const own = fleet.filter((ship) => !ship.defender && alive(ship));
    const enemy = fleet.filter((ship) => ship.defender && alive(ship));
    // Even a zero-round horizon knows that an unarmed attacker cannot hold a drawn encounter.
    if (
      own.length &&
      enemy.length &&
      !fleet.some(
        (ship) =>
          alive(ship) &&
          ship.stats.weapons.some(
            (weapon) => weapon.kind === "cannon" && weapon.dice > 0,
          ),
      )
    )
      forcedRetreat = true;
    attackerSurvivors += own.filter(
      (ship) => !forcedRetreat || ship.canRetreat,
    ).length;
    defenderSurvivors += enemy.length;
    if (own.length && !enemy.length) attackerWins++;
    else if (enemy.length && (!own.length || forcedRetreat)) defenderWins++;
    else unresolved++;
  }
  return {
    winProbability: attackerWins / trials,
    attackerWinProbability: attackerWins / trials,
    defenderWinProbability: defenderWins / trials,
    unresolvedProbability: unresolved / trials,
    expectedSurvivors: attackerSurvivors / trials,
    expectedDefenderSurvivors: defenderSurvivors / trials,
    trials,
    model: "duel",
  };
}
