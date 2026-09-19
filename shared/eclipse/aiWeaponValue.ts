import type { ShipWeapon } from "./parts";

/** Normalized heuristic, not a win probability: standard weapons keep their
 * existing damage multiplier. Rift deals 1 expected enemy damage minus 1/3
 * expected backfire per die, normalized against a cannon with +1 computer (1/3 hit rate).
 * Computers never improve that estimate; actual battle odds use simulation. */
export function aiWeaponValue(
  weapon: ShipWeapon,
  computerMultiplier = 1,
): number {
  return (
    weapon.dice *
    (weapon.color === "magenta" ? 2 : weapon.damage * computerMultiplier)
  );
}
