import { deriveBlueprintStats, effectiveBlueprintParts, type ShipBlueprint } from './blueprints';
import type { AncientShipPartId } from './discoveries';
import { publicBlueprint } from './legal';
import { getShipPart, SHIP_PARTS, shipPartResearched, type ShipStats } from './parts';
import { aiWeaponValue } from './aiWeaponValue';
import { planBlueprintUpgrade } from './upgradePlan';
import type { TechnologyId } from './technologies';
import type { Seat, Ship } from './types';

export function aiUpgradeBlueprintValue(stats: ShipStats): number {
  return (stats.weapons.length ? 0 : -12) + stats.hull * .9 + stats.shield * 1.1 + stats.movement * 1.1
    + stats.weapons.reduce((value, weapon) => value + aiWeaponValue(weapon, 1 + Math.min(4, stats.computer) * .45)
      * (weapon.kind === 'missile' ? .9 : 1.5), 0)
    + Math.max(0, stats.energyProduction - stats.energyConsumption) * .03;
}

/** Keep one legal, useful Rift fitting per deployed class, including a power-source swap if needed. */
export function riftFittingPlans(seat: Seat, ships: readonly Ship[], technologies: readonly TechnologyId[], limit: number): {
  blueprint: ShipBlueprint;
  fleetGain: number;
}[] {
  if (limit < 1 || !technologies.includes('rift-cannon')) return [];
  const powerSource = limit >= 2 ? SHIP_PARTS.filter(part => part.placement === 'grid' && part.energyProduction > 0 &&
    (part.access.kind === 'default' || part.access.kind === 'technology' && shipPartResearched(part, technologies)))
    .sort((a, b) => b.energyProduction - a.energyProduction)[0] : undefined;

  return seat.blueprints.flatMap(original => {
    const count = ships.filter(ship => ship.owner === seat.id && ship.type === original.shipType).length;
    if (!count) return [];
    const previous = publicBlueprint(original);
    const effective = effectiveBlueprintParts(seat.faction, previous);
    const ancientParts = [...(seat.storedParts ?? []), ...previous.parts, ...previous.outsideParts].filter(
      (id): id is AncientShipPartId => id !== null && SHIP_PARTS.some(part => part.id === id && part.access.kind === 'ancient'),
    );
    const before = aiUpgradeBlueprintValue(deriveBlueprintStats(seat.faction, previous));
    let best: ShipBlueprint | null = null;
    let fleetGain = 0;
    const consider = (parts: ShipBlueprint['parts']) => {
      const blueprint = { ...previous, parts };
      const gain = (aiUpgradeBlueprintValue(deriveBlueprintStats(seat.faction, blueprint)) - before) * (.4 + count * .7);
      if (gain <= fleetGain) return;
      const plan = planBlueprintUpgrade(seat.faction, previous, blueprint, technologies, ancientParts);
      if (!plan.ok || plan.installations > limit) return;
      best = blueprint;
      fleetGain = gain;
    };

    for (const [slot, installed] of effective.entries()) {
      if (installed === 'rift-cannon') continue;
      const parts = [...previous.parts];
      parts[slot] = 'rift-cannon';
      consider(parts);
      if (!powerSource) continue;
      for (const [sourceSlot, current] of effective.entries()) {
        if (sourceSlot === slot || current === 'rift-cannon' ||
          (current && getShipPart(current).energyProduction >= powerSource.energyProduction)) continue;
        const powered = [...parts];
        powered[sourceSlot] = powerSource.id;
        consider(powered);
      }
    }
    return best ? [{ blueprint: best, fleetGain }] : [];
  });
}
