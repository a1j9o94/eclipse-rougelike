import type { CatalogResources } from './catalog';

/** Publisher-linked 2021-04-27 rulebook p9 and publisher-verified Dized transcription. */
export const DISCOVERY_SOURCE =
  'https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/R2QHlAXtT2GyP-v4XJNiWA/discovery-tiles-1';
export type AncientShipPartId =
  | 'rift-conductor'
  | 'ion-disruptor'
  | 'ion-turret'
  | 'plasma-turret'
  | 'soliton-charger'
  | 'ion-missile'
  | 'axion-computer'
  | 'antimatter-missile'
  | 'flux-shield'
  | 'conformal-drive'
  | 'nonlinear-drive'
  | 'shard-hull'
  | 'hypergrid-source'
  | 'inversion-shield'
  | 'soliton-missile'
  | 'muon-source';
export type DiscoveryId =
  | 'materials'
  | 'science'
  | 'money'
  | 'mixed-resources'
  | 'ancient-tech'
  | 'ancient-cruiser'
  | 'ancient-orbital'
  | 'ancient-monolith'
  | 'ancient-warp-portal'
  | AncientShipPartId;
export type DiscoveryEffect =
  | { kind: 'resources'; resources: CatalogResources }
  | {
      kind: 'free-technology';
      selection: 'lowest-printed-cost-unowned-regular-market-tech';
      ties: 'player-choice';
    }
  | { kind: 'place-unbuilt-ship'; ship: 'cruiser' }
  | {
      kind: 'place-structure';
      structure: 'orbital' | 'monolith';
      bonusMaterials: number;
    }
  | {
      kind: 'ancient-ship-part';
      part: AncientShipPartId;
      placement: 'grid' | 'outside-grid';
      mayStore: true;
      removedDisposition: 'removed-from-game';
    }
  | { kind: 'place-warp-portal'; controlledSectorVp: 2 };
export interface Discovery {
  expansion?: 'rift-cannon';
  id: DiscoveryId;
  name: string;
  copies: number;
  vpAlternative: 2;
  effect: DiscoveryEffect;
}
function discovery(
  id: DiscoveryId,
  name: string,
  copies: number,
  effect: DiscoveryEffect,
): Discovery {
  return { id, name, copies, vpAlternative: 2, effect };
}
function ancientPart(id: AncientShipPartId, name: string): Discovery {
  return discovery(id, name, 1, {
    kind: 'ancient-ship-part',
    part: id,
    placement: id === 'muon-source' ? 'outside-grid' : 'grid',
    mayStore: true,
    removedDisposition: 'removed-from-game',
  });
}
/** Each of the fourteen pictured grid parts, Muon Source and Ancient Warp Portal is unique.
 * Their individual counts reconcile p9's grouped quantities with p3's 36 tiles/24 types.
 * Part combat statistics are intentionally separate from reward acquisition effects.
 * Placement rewards normally target the found sector; Ancient Labs uses starting sector
 * and requires taking the VP alternative if it is not controlled (p30 FAQ).
 */
export const DISCOVERIES: readonly Discovery[] = [
  { ...ancientPart('rift-conductor', 'Rift Conductor'), expansion: 'rift-cannon' },
  discovery('materials', 'Materials Cache', 3, {
    kind: 'resources',
    resources: { materials: 6, science: 0, money: 0 },
  }),
  discovery('science', 'Science Cache', 3, {
    kind: 'resources',
    resources: { materials: 0, science: 5, money: 0 },
  }),
  discovery('money', 'Money Cache', 3, {
    kind: 'resources',
    resources: { materials: 0, science: 0, money: 8 },
  }),
  discovery('mixed-resources', 'Resource Cache', 2, {
    kind: 'resources',
    resources: { materials: 2, science: 2, money: 3 },
  }),
  discovery('ancient-tech', 'Ancient Tech', 3, {
    kind: 'free-technology',
    selection: 'lowest-printed-cost-unowned-regular-market-tech',
    ties: 'player-choice',
  }),
  discovery('ancient-cruiser', 'Ancient Cruiser', 3, {
    kind: 'place-unbuilt-ship',
    ship: 'cruiser',
  }),
  discovery('ancient-orbital', 'Ancient Orbital', 2, {
    kind: 'place-structure',
    structure: 'orbital',
    bonusMaterials: 2,
  }),
  discovery('ancient-monolith', 'Ancient Monolith', 1, {
    kind: 'place-structure',
    structure: 'monolith',
    bonusMaterials: 0,
  }),
  ancientPart('ion-disruptor', 'Ion Disruptor'),
  ancientPart('ion-turret', 'Ion Turret'),
  ancientPart('plasma-turret', 'Plasma Turret'),
  ancientPart('soliton-charger', 'Soliton Charger'),
  ancientPart('ion-missile', 'Ion Missile'),
  ancientPart('axion-computer', 'Axion Computer'),
  ancientPart('antimatter-missile', 'Antimatter Missile'),
  ancientPart('flux-shield', 'Flux Shield'),
  ancientPart('conformal-drive', 'Conformal Drive'),
  ancientPart('nonlinear-drive', 'Nonlinear Drive'),
  ancientPart('shard-hull', 'Shard Hull'),
  ancientPart('hypergrid-source', 'Hypergrid Source'),
  ancientPart('inversion-shield', 'Inversion Shield'),
  ancientPart('soliton-missile', 'Soliton Missile'),
  ancientPart('muon-source', 'Muon Source'),
  discovery('ancient-warp-portal', 'Ancient Warp Portal', 1, {
    kind: 'place-warp-portal',
    controlledSectorVp: 2,
  }),
];
export function getDiscovery(id: DiscoveryId): Discovery {
  const tile = DISCOVERIES.find((candidate) => candidate.id === id);
  if (!tile) throw new Error(`Discovery is absent from this catalog: ${id}`);
  return tile;
}
/** Fresh unshuffled base-box inventory; the authoritative seeded shuffle chooses order. */
export function createDiscoverySupply(warpPortals = true, riftCannons = false): DiscoveryId[] {
  return DISCOVERIES.filter(
    (tile) => (riftCannons || tile.expansion !== 'rift-cannon') && (warpPortals || tile.id !== 'ancient-warp-portal'),
  ).flatMap((tile) => Array.from({ length: tile.copies }, () => tile.id));
}
