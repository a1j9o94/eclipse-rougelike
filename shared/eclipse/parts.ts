import type { TechnologyId, ResearchedShipPart } from './technologies';
import type { AncientShipPartId } from './discoveries';

export type DefaultShipPartId = 'ion-cannon' | 'nuclear-source' | 'nuclear-drive' | 'hull' | 'electron-computer';
export type ShipPartId = DefaultShipPartId | ResearchedShipPart | AncientShipPartId;
export type WeaponColor = 'yellow' | 'orange' | 'blue' | 'red' | 'magenta';
export interface ShipWeapon { kind: 'cannon' | 'missile'; color: WeaponColor; dice: number; damage: 1 | 2 | 3 | 4 }
export interface ShipStats {
  energyProduction: number;
  energyConsumption: number;
  initiative: number;
  movement: number;
  computer: number;
  /** Positive magnitude subtracted from the attacker's computer bonus. */
  shield: number;
  /** Ship is destroyed when damage exceeds hull (hit points = hull + 1). */
  hull: number;
  weapons: ShipWeapon[];
}
export interface ShipPart extends ShipStats {
  expansion?: 'rift-cannon';
  id: ShipPartId;
  name: string;
  placement: 'grid' | 'outside';
  access: { kind: 'default' } | { kind: 'technology'; technology: TechnologyId } | { kind: 'ancient' };
  source: string;
  verification: 'component-scan-crosschecked-rulebook' | 'publisher-rulebook';
}
export const EMPTY_SHIP_STATS: ShipStats = { energyProduction: 0, energyConsumption: 0, initiative: 0, movement: 0, computer: 0, shield: 0, hull: 0, weapons: [] };
const SCANS = 'https://steamcommunity.com/sharedfiles/filedetails/?id=2414358241';
function part(id: ShipPartId, access: ShipPart['access'], stats: Partial<ShipStats>, placement: ShipPart['placement'] = 'grid'): ShipPart {
  return { ...EMPTY_SHIP_STATS, weapons: [], ...stats, id, name: id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '), placement, access, source: SCANS, verification: 'component-scan-crosschecked-rulebook' };
}
function standard(id: DefaultShipPartId, stats: Partial<ShipStats>): ShipPart { return part(id, { kind: 'default' }, stats); }
function researched(id: ResearchedShipPart, stats: Partial<ShipStats>): ShipPart { return part(id, { kind: 'technology', technology: id }, stats); }
function ancient(id: AncientShipPartId, stats: Partial<ShipStats>, placement: ShipPart['placement'] = 'grid'): ShipPart { return part(id, { kind: 'ancient' }, stats, placement); }
function weapon(color: WeaponColor, dice = 1, kind: ShipWeapon['kind'] = 'cannon'): ShipWeapon[] {
  // Magenta uses face-dependent Rift damage in combat; this nominal value is not its roll result.
  const damage: Record<WeaponColor, ShipWeapon['damage']> = { yellow: 1, orange: 2, blue: 3, red: 4, magenta: 1 };
  return [{ color, dice, kind, damage: damage[color] }];
}
/** Base-box components and explicitly marked Rift expansion parts. */
export const SHIP_PARTS: readonly ShipPart[] = [
  { ...researched('rift-cannon', { energyConsumption: 2, weapons: weapon('magenta') }), expansion: 'rift-cannon', verification: 'publisher-rulebook', source: 'https://www.lautapelit.fi/files/Online%20rules/Eclipse2_RC_rules_web.pdf' },
  { ...ancient('rift-conductor', { hull: 1, energyConsumption: 1, weapons: weapon('magenta') }), expansion: 'rift-cannon', verification: 'publisher-rulebook', source: 'https://www.lautapelit.fi/files/Online%20rules/Eclipse2_RC_rules_web.pdf' },
  standard('ion-cannon', { energyConsumption: 1, weapons: weapon('yellow') }),
  standard('nuclear-source', { energyProduction: 3 }),
  standard('nuclear-drive', { energyConsumption: 1, movement: 1, initiative: 1 }),
  standard('hull', { hull: 1 }),
  standard('electron-computer', { computer: 1 }),
  researched('plasma-cannon', { energyConsumption: 2, weapons: weapon('orange') }),
  researched('soliton-cannon', { energyConsumption: 3, weapons: weapon('blue') }),
  researched('antimatter-cannon', { energyConsumption: 4, weapons: weapon('red') }),
  researched('plasma-missile', { energyConsumption: 1, weapons: weapon('orange', 2, 'missile') }),
  researched('flux-missile', { initiative: 1, weapons: weapon('yellow', 2, 'missile') }),
  researched('fusion-drive', { energyConsumption: 2, movement: 2, initiative: 2 }),
  researched('tachyon-drive', { energyConsumption: 3, movement: 3, initiative: 3 }),
  researched('transition-drive', { movement: 3 }),
  researched('fusion-source', { energyProduction: 6 }),
  researched('tachyon-source', { energyProduction: 9 }),
  researched('zero-point-source', { energyProduction: 12 }),
  researched('positron-computer', { computer: 2, energyConsumption: 1 }),
  researched('gluon-computer', { computer: 3, energyConsumption: 2 }),
  researched('gauss-shield', { shield: 1 }),
  researched('phase-shield', { shield: 2, energyConsumption: 1 }),
  researched('absorption-shield', { shield: 1, energyProduction: 4 }),
  researched('improved-hull', { hull: 2 }),
  researched('conifold-field', { hull: 3, energyConsumption: 2 }),
  researched('sentient-hull', { hull: 1, computer: 1 }),
  ancient('ion-disruptor', { weapons: weapon('yellow'), initiative: 3 }),
  ancient('ion-turret', { weapons: weapon('yellow', 2) }),
  ancient('plasma-turret', { weapons: weapon('orange', 2), energyConsumption: 3 }),
  ancient('soliton-charger', { weapons: weapon('blue'), energyConsumption: 1 }),
  ancient('ion-missile', { weapons: weapon('yellow', 3, 'missile') }),
  ancient('axion-computer', { computer: 2, initiative: 1 }),
  ancient('antimatter-missile', { weapons: weapon('red', 1, 'missile') }),
  ancient('flux-shield', { shield: 3, energyConsumption: 2, initiative: 1 }),
  ancient('conformal-drive', { movement: 4, energyConsumption: 2, initiative: 2 }),
  ancient('nonlinear-drive', { movement: 2, energyProduction: 2 }),
  ancient('shard-hull', { hull: 3 }),
  ancient('hypergrid-source', { energyProduction: 11 }),
  ancient('inversion-shield', { shield: 2, energyProduction: 2 }),
  ancient('soliton-missile', { weapons: weapon('blue', 1, 'missile'), initiative: 1 }),
  ancient('muon-source', { energyProduction: 2, initiative: 1 }, 'outside'),
];
export function getShipPart(id: ShipPartId): ShipPart {
  const found = SHIP_PARTS.find(item => item.id === id);
  if (!found) throw new RangeError(`Ship part not in base catalog: ${id}`);
  return found;
}
export function isShipPartId(value: string): value is ShipPartId { return SHIP_PARTS.some(part => part.id === value); }
export function sumShipStats(parts: readonly ShipStats[]): ShipStats {
  const total: ShipStats = { ...EMPTY_SHIP_STATS, weapons: [] };
  for (const stats of parts) {
    total.energyProduction += stats.energyProduction; total.energyConsumption += stats.energyConsumption;
    total.initiative += stats.initiative; total.movement += stats.movement; total.computer += stats.computer;
    total.shield += stats.shield; total.hull += stats.hull;
    total.weapons.push(...stats.weapons.map(weapon => ({ ...weapon })));
  }
  return total;
}
