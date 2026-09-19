import { deriveBlueprintStats } from "./blueprints";
import { factionHasCapability } from "./catalog";
import { dieHits, type DieFace } from "./combat";
import { publicBlueprint } from "./legal";
import { researchTrackVp } from "./scoring";
import type { ShipStats } from "./parts";
import type { GameCommand, PlayerView, Seat, Ship } from "./types";

const ANCIENT_PREPARATION = new Set([
  "gauss-shield",
  "improved-hull",
  "plasma-cannon",
  "positron-computer",
]);

function hasTechnology(seat: Seat, id: string): boolean {
  return Object.values(seat.technologies).some((track) => track.includes(id));
}

function projectedDestination(
  command: Extract<GameCommand, { type: "move" }>,
  ship: Ship,
): string {
  for (let index = command.moves.length - 1; index >= 0; index--) {
    const move = command.moves[index];
    if (move.shipId === ship.id) return move.path.at(-1) ?? ship.sectorId;
  }
  return ship.sectorId;
}

function expectedBombardmentHits(
  view: PlayerView,
  seat: Seat,
  command: Extract<GameCommand, { type: "move" }>,
  sectorId: string,
): number {
  return view.ships
    .filter(
      (ship) =>
        ship.owner === seat.id &&
        projectedDestination(command, ship) === sectorId,
    )
    .reduce((total, ship) => {
      const blueprint = seat.blueprints.find(
        (candidate) => candidate.shipType === ship.type,
      );
      if (!blueprint) return total;
      const stats = deriveBlueprintStats(
        seat.faction,
        publicBlueprint(blueprint),
      );
      const chance = ([1, 2, 3, 4, 5, 6] as const).filter((face: DieFace) =>
        dieHits(face, stats.computer, 0),
      ).length / 6;
      return (
        total +
        stats.weapons
          .filter((weapon) => weapon.kind === "cannon")
          .reduce(
            (sum, weapon) =>
              sum + weapon.dice * weapon.damage * chance,
            0,
          )
      );
    }, 0);
}

function conquestAdjustment(
  view: PlayerView,
  command: Extract<GameCommand, { type: "move" }>,
): number {
  const seat = view.seats.find((candidate) => candidate.id === view.viewerSeatId);
  if (!seat) return 0;
  const destinations = new Set(
    command.moves.map((move) => move.path.at(-1)).filter(Boolean),
  );
  let adjustment = 0;
  for (const sectorId of destinations) {
    const sector = view.sectors.find((candidate) => candidate.id === sectorId);
    if (!sector || sector.owner === seat.id) continue;
    const hostile = view.ships.some(
      (ship) => ship.sectorId === sector.id && ship.owner !== seat.id,
    );
    if (!hostile && sector.owner === null && !sector.discovery) continue;

    // Starting Move spends one disc. A victory without another disc cannot be
    // converted into control during the ordinary end-of-round aftermath.
    const reserveAfterAction =
      seat.influenceOnTrack - (view.actionProgress ? 0 : 1);
    adjustment += reserveAfterAction > 0 ? 3 : -24;

    if (!sector.owner || !sector.population.length) continue;
    const defender = view.seats.find((candidate) => candidate.id === sector.owner);
    const automatic =
      (!!defender &&
        factionHasCapability(defender.faction, "destroyed-population-when-occupied")) ||
      (hasTechnology(seat, "neutron-bombs") &&
        (!defender || !hasTechnology(defender, "neutron-absorber")));
    if (automatic) {
      adjustment += 10;
      continue;
    }
    const expected = expectedBombardmentHits(view, seat, command, sector.id);
    const uncleared = Math.max(0, sector.population.length - expected);
    adjustment -= 12 * (uncleared / sector.population.length);
  }
  return adjustment;
}

function combatValue(stats: ShipStats, enemy: ShipStats | null): number {
  const hostileComputer = enemy?.computer ?? 1;
  const hostileShield = enemy?.shield ?? 0;
  const hostileDamage =
    enemy?.weapons.reduce(
      (sum, weapon) => sum + weapon.dice * weapon.damage,
      0,
    ) ?? 2;
  const weapons = stats.weapons.reduce(
    (sum, weapon) =>
      sum +
      weapon.dice *
        weapon.damage *
        (weapon.kind === "missile" ? 0.8 : 1.1) *
        Math.max(0.35, 1 + (stats.computer - hostileShield) * 0.14),
    0,
  );
  return (
    weapons +
    stats.hull * Math.min(1.8, 0.7 + hostileDamage * 0.2) +
    stats.shield * Math.min(1.8, 0.65 + hostileComputer * 0.25) +
    stats.movement * 0.25
  );
}

function visibleEnemyStats(view: PlayerView, seat: Seat): ShipStats | null {
  const enemy = view.ships.find(
    (ship) =>
      ship.owner !== seat.id &&
      view.seats.some((candidate) => candidate.id === ship.owner),
  );
  if (!enemy) return null;
  const owner = view.seats.find((candidate) => candidate.id === enemy.owner);
  const blueprint = owner?.blueprints.find(
    (candidate) => candidate.shipType === enemy.type,
  );
  return owner && blueprint
    ? deriveBlueprintStats(owner.faction, publicBlueprint(blueprint))
    : null;
}

function upgradeAdjustment(
  view: PlayerView,
  command: Extract<GameCommand, { type: "upgrade" }>,
): number {
  const seat = view.seats.find((candidate) => candidate.id === view.viewerSeatId);
  if (!seat) return 0;
  const enemy = visibleEnemyStats(view, seat);
  const visibleAncients = view.ships.some(
    (ship) =>
      ship.type === "ancient" &&
      !factionHasCapability(seat.faction, "ancient-coexistence"),
  );
  const urgency = view.round >= 7 ? 1.15 : 0.8;
  let adjustment = 0;
  for (const next of command.blueprints) {
    const previous = seat.blueprints.find(
      (candidate) => candidate.shipType === next.shipType,
    );
    if (!previous) continue;
    const deployed = view.ships.filter(
      (ship) => ship.owner === seat.id && ship.type === next.shipType,
    ).length;
    if (!deployed) {
      adjustment -= view.round >= 6 ? 10 : 6;
      continue;
    }
    const before = deriveBlueprintStats(
      seat.faction,
      publicBlueprint(previous),
    );
    const after = deriveBlueprintStats(seat.faction, publicBlueprint(next));
    const payoff = combatValue(after, enemy) - combatValue(before, enemy);
    adjustment += payoff * Math.min(3, deployed) * urgency;
    if (
      visibleAncients &&
      view.round <= 5 &&
      (after.hull > before.hull ||
        after.computer > before.computer ||
        after.shield > before.shield)
    )
      adjustment += 6;
  }
  return adjustment;
}

function researchAdjustment(
  view: PlayerView,
  command: Extract<GameCommand, { type: "research" }>,
): number {
  const seat = view.seats.find((candidate) => candidate.id === view.viewerSeatId);
  if (!seat) return 0;
  const count = seat.technologies[command.track].length;
  const marginalVp =
    count < 7 ? researchTrackVp(count + 1) - researchTrackVp(count) : 0;
  let adjustment = marginalVp * (view.round >= 7 ? 6 : 2);
  if (view.round === 8 && marginalVp === 0) adjustment -= 6;

  const hasAncientTarget = view.ships.some(
    (ship) =>
      ship.type === "ancient" &&
      !factionHasCapability(seat.faction, "ancient-coexistence"),
  );
  const hasMobileFleet = view.ships.some(
    (ship) => ship.owner === seat.id && ship.type !== "starbase",
  );
  if (
    ANCIENT_PREPARATION.has(command.tileId) &&
    hasAncientTarget &&
    hasMobileFleet &&
    view.round <= 5 &&
    seat.influenceOnTrack >= 2
  )
    adjustment += 5;
  return adjustment;
}

/**
 * Cheap, deterministic follow-through value for Hard/Expert candidate ranking.
 * The function reads only PlayerView, performs no sampling, and does not alter
 * the legal command or the existing search budget.
 */
export function strategicCommandAdjustment(
  view: PlayerView,
  command: GameCommand,
): number {
  const action = command.type === "trade-and-act" ? command.action : command;
  switch (action.type) {
    case "move":
      return conquestAdjustment(view, action);
    case "upgrade":
      return upgradeAdjustment(view, action);
    case "research":
      return researchAdjustment(view, action);
    default:
      return 0;
  }
}
