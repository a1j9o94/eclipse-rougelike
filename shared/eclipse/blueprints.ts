import { getFaction, type FactionBlueprintDefinition, type FactionId } from './catalog';
import type { AncientShipPartId } from './discoveries';
import type { TechnologyId } from './technologies';
import { EMPTY_SHIP_STATS, getShipPart, sumShipStats, type ShipPartId, type ShipStats } from './parts';

export type BlueprintShipType = 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase';
export interface ShipBlueprint {
  shipType: BlueprintShipType;
  /** Installed overlays. null means reveal the preprinted part at this index. */
  parts: (ShipPartId | null)[];
  outsideParts: ShipPartId[];
}
export type BlueprintDefinition = FactionBlueprintDefinition;
const TYPES: readonly BlueprintShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];
/** Index order is stable catalog order, not physical row-major positions. */
export function blueprintDefinition(faction: FactionId, shipType: BlueprintShipType): BlueprintDefinition {
  const definition = getFaction(faction).blueprints[shipType];
  return {
    ...definition,
    preprinted: [...definition.preprinted],
    permanent: { ...definition.permanent, weapons: [...definition.permanent.weapons] },
  };
}
export function initialBlueprints(faction: FactionId): ShipBlueprint[] {
  return TYPES.map(shipType => ({ shipType, parts: blueprintDefinition(faction, shipType).preprinted.map(() => null), outsideParts: [] }));
}
export function effectiveBlueprintParts(faction: FactionId, blueprint: ShipBlueprint): (ShipPartId | null)[] {
  return blueprintDefinition(faction, blueprint.shipType).preprinted.map((printed, index) => blueprint.parts[index] ?? printed);
}
export function deriveBlueprintStats(faction: FactionId, blueprint: ShipBlueprint): ShipStats {
  const definition = blueprintDefinition(faction, blueprint.shipType);
  const ids = [...effectiveBlueprintParts(faction, blueprint), ...blueprint.outsideParts].filter((id): id is ShipPartId => id !== null);
  return sumShipStats([definition.permanent, ...ids.map(getShipPart)]);
}
export type BlueprintIssueCode = 'SLOT_COUNT' | 'ENERGY_DEFICIT' | 'DRIVE_REQUIRED' | 'STARBASE_DRIVE' | 'TECHNOLOGY_REQUIRED' | 'PART_PLACEMENT' | 'ANCIENT_PART_UNAVAILABLE' | 'PERMANENT_PART_REMOVED';
export interface BlueprintIssue { code: BlueprintIssueCode; message: string; part: ShipPartId | null; slot: number | null }
/** Ancient budget includes parts already on this blueprint; exclude those installed on other blueprints.
 * Command processor must also enforce upgrade activation counts and discard removed ancient parts.
 */
export function validateBlueprint(faction: FactionId, blueprint: ShipBlueprint, researched: readonly TechnologyId[], availableAncientParts: readonly AncientShipPartId[], previous?: ShipBlueprint): BlueprintIssue[] {
  const issues: BlueprintIssue[] = [];
  const issue = (code: BlueprintIssueCode, message: string, part: ShipPartId | null = null, slot: number | null = null): void => { issues.push({ code, message, part, slot }); };
  const definition = blueprintDefinition(faction, blueprint.shipType);
  if (blueprint.parts.length !== definition.preprinted.length) issue('SLOT_COUNT', `This blueprint has exactly ${definition.preprinted.length} slots.`);
  const ancientUsed = new Map<ShipPartId, number>();
  const check = (id: ShipPartId, placement: 'grid' | 'outside', slot: number | null): void => {
    const part = getShipPart(id);
    if (part.placement !== placement) issue('PART_PLACEMENT', `${part.name} must be placed ${part.placement === 'outside' ? 'outside the grid' : 'in a grid slot'}.`, id, slot);
    if (part.access.kind === 'technology' && !researched.includes(part.access.technology)) issue('TECHNOLOGY_REQUIRED', `Research ${part.name} before installing this part.`, id, slot);
    if (part.access.kind === 'ancient') {
      const count = (ancientUsed.get(id) ?? 0) + 1; ancientUsed.set(id, count);
      if (count > availableAncientParts.filter(owned => owned === id).length || count > 1) issue('ANCIENT_PART_UNAVAILABLE', `No available ${part.name} discovery part.`, id, slot);
    }
  };
  blueprint.parts.forEach((part, index) => { if (part !== null) check(part, 'grid', index); });
  blueprint.outsideParts.forEach(part => check(part, 'outside', null));
  if (previous) for (const id of previous.outsideParts) {
    if (!blueprint.outsideParts.includes(id)) issue('PERMANENT_PART_REMOVED', 'Outside-grid parts cannot be removed or replaced.', id);
  }
  const stats = deriveBlueprintStats(faction, blueprint);
  if (stats.energyConsumption > stats.energyProduction) issue('ENERGY_DEFICIT', `Requires ${stats.energyConsumption} energy; produces ${stats.energyProduction}.`);
  if (blueprint.shipType === 'starbase' && stats.movement > 0) issue('STARBASE_DRIVE', 'Starbases cannot contain drives.');
  if (blueprint.shipType !== 'starbase' && stats.movement === 0) issue('DRIVE_REQUIRED', 'Mobile ships must contain at least one drive.');
  return issues;
}

export type NeutralBlueprintId = 'ancient-standard' | 'ancient-advanced-computer' | 'ancient-advanced-plasma' | 'guardian-standard' | 'guardian-advanced-missile' | 'guardian-advanced-shield' | 'gcds-standard' | 'gcds-advanced-missile' | 'gcds-advanced-shield';
export interface NeutralBlueprint { id: NeutralBlueprintId; type: 'ancient' | 'guardian' | 'gcds'; advanced: boolean; stats: ShipStats; source: string }
function neutral(id: NeutralBlueprintId, type: NeutralBlueprint['type'], initiative: number, computer: number, hull: number, shield: number, weapons: ShipStats['weapons']): NeutralBlueprint {
  return { id, type, advanced: !id.endsWith('standard'), stats: { ...EMPTY_SHIP_STATS, initiative, computer, hull, shield, weapons }, source: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2414358241' };
}
export const NEUTRAL_BLUEPRINTS: readonly NeutralBlueprint[] = [
  neutral('ancient-standard', 'ancient', 2, 1, 1, 0, [{ kind: 'cannon', color: 'yellow', dice: 2, damage: 1 }]),
  neutral('ancient-advanced-computer', 'ancient', 3, 2, 1, 0, [{ kind: 'cannon', color: 'yellow', dice: 1, damage: 1 }]),
  neutral('ancient-advanced-plasma', 'ancient', 1, 1, 2, 0, [{ kind: 'cannon', color: 'orange', dice: 1, damage: 2 }]),
  neutral('guardian-standard', 'guardian', 3, 2, 2, 0, [{ kind: 'cannon', color: 'yellow', dice: 3, damage: 1 }]),
  neutral('guardian-advanced-missile', 'guardian', 1, 1, 3, 0, [{ kind: 'missile', color: 'orange', dice: 2, damage: 2 }, { kind: 'cannon', color: 'red', dice: 1, damage: 4 }]),
  neutral('guardian-advanced-shield', 'guardian', 2, 1, 3, 1, [{ kind: 'cannon', color: 'orange', dice: 2, damage: 2 }]),
  neutral('gcds-standard', 'gcds', 0, 2, 7, 0, [{ kind: 'cannon', color: 'yellow', dice: 4, damage: 1 }]),
  neutral('gcds-advanced-missile', 'gcds', 2, 2, 3, 0, [{ kind: 'missile', color: 'yellow', dice: 4, damage: 1 }, { kind: 'cannon', color: 'red', dice: 1, damage: 4 }]),
  neutral('gcds-advanced-shield', 'gcds', 3, 2, 4, 2, [{ kind: 'cannon', color: 'orange', dice: 2, damage: 2 }]),
];
export function neutralBlueprint(id: NeutralBlueprintId): NeutralBlueprint {
  const found = NEUTRAL_BLUEPRINTS.find(blueprint => blueprint.id === id);
  if (!found) throw new RangeError(`Neutral blueprint not in base catalog: ${id}`);
  return found;
}
