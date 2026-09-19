import { estimatePublicBattle as estimateRiftBattle } from "./aiSimulation";
import { deriveBlueprintStats, neutralBlueprint } from "./blueprints";
import { publicBlueprint } from "./legal";
import { dieHits, type DieFace } from "./combat";
import { randomInt, randomSeed } from "./random";
import type { ShipStats } from "./parts";
import type { PlayerView } from "./types";
export interface CombatEstimate {
  winProbability: number;
  expectedSurvivors: number;
  trials: number;
}
interface SimulatedShip {
  id: string;
  defender: boolean;
  damage: number;
  stats: ShipStats;
}
/** Bounded Monte Carlo estimate, not authoritative combat: no retreats, politics, or hidden data.
 * Randomness is supplied by the controller and never touches the match RNG.
 */
export function estimatePublicBattle(
  view: PlayerView,
  attackerIds: readonly string[],
  defenderIds: readonly string[],
  simulationSeed: number,
  trials = 24,
): CombatEstimate {
  if (!Number.isInteger(trials) || trials < 1 || trials > 128)
    throw new RangeError("Simulation trials must be between 1 and 128.");
  // Keep the historical baseline for base weapons, but never use ordinary-die
  // assumptions for Rift-equipped fleets.
  if (view.seats.some((seat) => seat.blueprints.some((blueprint) => blueprint.parts.some((part) => part === "rift-cannon" || part === "rift-conductor")))) {
    return estimateRiftBattle(view, attackerIds, defenderIds, simulationSeed, trials);
  }
  const selected = view.ships.filter(
    (s) => attackerIds.includes(s.id) || defenderIds.includes(s.id),
  );
  const templates: SimulatedShip[] = selected
    .map((ship) => {
      const seat = view.seats.find((s) => s.id === ship.owner),
        blueprint = seat?.blueprints.find((b) => b.shipType === ship.type);
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
        defender: defenderIds.includes(ship.id),
        damage: ship.damage,
        stats,
      };
    })
    .sort(
      (a, b) =>
        b.stats.initiative - a.stats.initiative ||
        Number(b.defender) - Number(a.defender),
    );
  if (!templates.some((s) => s.defender))
    return {
      winProbability: 1,
      expectedSurvivors: templates.length,
      trials: 0,
    };
  let random = randomSeed(simulationSeed >>> 0),
    wins = 0,
    survivors = 0;
  for (let trial = 0; trial < trials; trial++) {
    const fleet = templates.map((s) => ({ ...s }));
    const alive = (s: SimulatedShip) => s.damage <= s.stats.hull;
    for (let engagement = 0; engagement < 33; engagement++) {
      for (const ship of fleet) {
        if (!alive(ship)) continue;
        const targets = fleet.filter(
          (s) => s.defender !== ship.defender && alive(s),
        );
        if (!targets.length) break;
        for (const weapon of ship.stats.weapons.filter(
          (w) => w.kind === (engagement === 0 ? "missile" : "cannon"),
        ))
          for (let die = 0; die < weapon.dice; die++) {
            const roll = randomInt(random, 6);
            random = roll.state;
            const face = (roll.value + 1) as DieFace;
            const hitTargets = targets
              .filter(
                (s) =>
                  alive(s) &&
                  dieHits(face, ship.stats.computer, s.stats.shield),
              )
              .sort(
                (a, b) =>
                  a.stats.hull + 1 - a.damage - (b.stats.hull + 1 - b.damage),
              );
            if (hitTargets.length) hitTargets[0].damage += weapon.damage;
          }
      }
      if (
        !fleet.some((s) => s.defender && alive(s)) ||
        !fleet.some((s) => !s.defender && alive(s))
      )
        break;
    }
    const remaining = fleet.filter(alive),
      own = remaining.filter((s) => !s.defender);
    survivors += own.length;
    if (!remaining.some((s) => s.defender) && own.length) wins++;
  }
  return {
    winProbability: wins / trials,
    expectedSurvivors: survivors / trials,
    trials,
  };
}
