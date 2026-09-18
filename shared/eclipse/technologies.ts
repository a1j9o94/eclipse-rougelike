/** Publisher-linked 2021-04-27 rulebook pp10–11,31.
 * Per-type regular inventory uses attributed Second Dawn community inventory;
 * publisher rules corroborate the 114-tile total and singleton rare technologies.
 */
import { RULEBOOK_URL } from './catalog';

export const TECHNOLOGY_INVENTORY_SOURCE =
  'https://videogamegeek.com/wiki/page/thing:246900:moreinfo';
export type TechnologyTrack = 'military' | 'grid' | 'nano';
export type TechnologyId =
  | 'neutron-bombs'
  | 'starbase'
  | 'plasma-cannon'
  | 'phase-shield'
  | 'advanced-mining'
  | 'tachyon-source'
  | 'gluon-computer'
  | 'plasma-missile'
  | 'gauss-shield'
  | 'fusion-source'
  | 'improved-hull'
  | 'positron-computer'
  | 'advanced-economy'
  | 'tachyon-drive'
  | 'antimatter-cannon'
  | 'quantum-grid'
  | 'nanorobots'
  | 'fusion-drive'
  | 'orbital'
  | 'advanced-robotics'
  | 'advanced-labs'
  | 'monolith'
  | 'wormhole-generator'
  | 'artifact-key'
  | 'antimatter-splitter'
  | 'conifold-field'
  | 'neutron-absorber'
  | 'absorption-shield'
  | 'cloaking-device'
  | 'improved-logistics'
  | 'sentient-hull'
  | 'soliton-cannon'
  | 'transition-drive'
  | 'warp-portal'
  | 'flux-missile'
  | 'pico-modulator'
  | 'ancient-labs'
  | 'zero-point-source'
  | 'metasynthesis';
export type ResearchedShipPart =
  | 'plasma-cannon'
  | 'phase-shield'
  | 'tachyon-source'
  | 'gluon-computer'
  | 'plasma-missile'
  | 'gauss-shield'
  | 'fusion-source'
  | 'improved-hull'
  | 'positron-computer'
  | 'tachyon-drive'
  | 'antimatter-cannon'
  | 'fusion-drive'
  | 'conifold-field'
  | 'absorption-shield'
  | 'sentient-hull'
  | 'soliton-cannon'
  | 'transition-drive'
  | 'flux-missile'
  | 'zero-point-source';
export type TechnologyEffect =
  | { kind: 'ship-part'; part: ResearchedShipPart }
  | { kind: 'construct'; piece: 'starbase' | 'orbital' | 'monolith' }
  | {
      kind: 'colonize-advanced';
      resource: 'materials' | 'science' | 'money' | 'all';
    }
  | { kind: 'automatic-population-bombardment' }
  | {
      kind: 'extra-activation';
      action: 'build' | 'move' | 'upgrade';
      amount: 1 | 2;
    }
  | { kind: 'gain-influence'; amount: 1 | 2 }
  | { kind: 'wormhole-generator' }
  | { kind: 'artifact-resources'; perArtifact: 5 }
  | { kind: 'split-antimatter-damage' }
  | { kind: 'ignore-neutron-bombs' }
  | { kind: 'cloaking'; enemiesRequiredToPin: 2 }
  | { kind: 'place-warp-portal'; controlledSectorVp: 1 }
  | { kind: 'draw-discovery'; count: 1 };
export interface Technology {
  id: TechnologyId;
  name: string;
  track: TechnologyTrack | 'rare';
  baseCost: number;
  minimumCost: number;
  /** Null means not verified, never zero or permission to make unlimited copies. */
  copies: number | null;
  inventorySource: string;
  inventoryVerification: 'publisher-rulebook' | 'community-inventory';
  effect: TechnologyEffect;
}
function tech(
  id: TechnologyId,
  name: string,
  track: Technology['track'],
  baseCost: number,
  minimumCost: number,
  effect: TechnologyEffect,
): Technology {
  // BGG lists this distribution separately for each of the three regular tracks.
  const regularCopies: Record<number, number> = {
    2: 5,
    4: 5,
    6: 5,
    8: 5,
    10: 4,
    12: 3,
    14: 3,
    16: 3,
  };
  const copies = track === 'rare' ? 1 : regularCopies[baseCost];
  if (!copies) throw new Error(`Missing technology inventory entry: ${id}`);
  return {
    id,
    name,
    track,
    baseCost,
    minimumCost,
    copies,
    effect,
    inventorySource:
      track === 'rare' ? RULEBOOK_URL : TECHNOLOGY_INVENTORY_SOURCE,
    inventoryVerification:
      track === 'rare' ? 'publisher-rulebook' : 'community-inventory',
  };
}
function part(
  id: TechnologyId & ResearchedShipPart,
  name: string,
  track: Technology['track'],
  baseCost: number,
  minimumCost: number,
): Technology {
  return tech(id, name, track, baseCost, minimumCost, {
    kind: 'ship-part',
    part: id,
  });
}
export const TECHNOLOGIES: readonly Technology[] = [
  tech('neutron-bombs', 'Neutron Bombs', 'military', 2, 2, {
    kind: 'automatic-population-bombardment',
  }),
  tech('starbase', 'Starbase', 'military', 4, 3, {
    kind: 'construct',
    piece: 'starbase',
  }),
  part('plasma-cannon', 'Plasma Cannon', 'military', 6, 4),
  part('phase-shield', 'Phase Shield', 'military', 8, 5),
  tech('advanced-mining', 'Advanced Mining', 'military', 10, 6, {
    kind: 'colonize-advanced',
    resource: 'materials',
  }),
  part('tachyon-source', 'Tachyon Source', 'military', 12, 6),
  part('gluon-computer', 'Gluon Computer', 'military', 14, 7),
  part('plasma-missile', 'Plasma Missile', 'military', 16, 8),
  part('gauss-shield', 'Gauss Shield', 'grid', 2, 2),
  part('fusion-source', 'Fusion Source', 'grid', 4, 3),
  part('improved-hull', 'Improved Hull', 'grid', 6, 4),
  part('positron-computer', 'Positron Computer', 'grid', 8, 5),
  tech('advanced-economy', 'Advanced Economy', 'grid', 10, 6, {
    kind: 'colonize-advanced',
    resource: 'money',
  }),
  part('tachyon-drive', 'Tachyon Drive', 'grid', 12, 6),
  part('antimatter-cannon', 'Antimatter Cannon', 'grid', 14, 7),
  tech('quantum-grid', 'Quantum Grid', 'grid', 16, 8, {
    kind: 'gain-influence',
    amount: 2,
  }),
  tech('nanorobots', 'Nanorobots', 'nano', 2, 2, {
    kind: 'extra-activation',
    action: 'build',
    amount: 1,
  }),
  part('fusion-drive', 'Fusion Drive', 'nano', 4, 3),
  tech('orbital', 'Orbital', 'nano', 6, 4, {
    kind: 'construct',
    piece: 'orbital',
  }),
  tech('advanced-robotics', 'Advanced Robotics', 'nano', 8, 5, {
    kind: 'gain-influence',
    amount: 1,
  }),
  tech('advanced-labs', 'Advanced Labs', 'nano', 10, 6, {
    kind: 'colonize-advanced',
    resource: 'science',
  }),
  tech('monolith', 'Monolith', 'nano', 12, 6, {
    kind: 'construct',
    piece: 'monolith',
  }),
  tech('wormhole-generator', 'Wormhole Generator', 'nano', 14, 7, {
    kind: 'wormhole-generator',
  }),
  tech('artifact-key', 'Artifact Key', 'nano', 16, 8, {
    kind: 'artifact-resources',
    perArtifact: 5,
  }),
  tech('antimatter-splitter', 'Antimatter Splitter', 'rare', 5, 5, {
    kind: 'split-antimatter-damage',
  }),
  part('conifold-field', 'Conifold Field', 'rare', 5, 5),
  tech('neutron-absorber', 'Neutron Absorber', 'rare', 5, 5, {
    kind: 'ignore-neutron-bombs',
  }),
  part('absorption-shield', 'Absorption Shield', 'rare', 7, 6),
  tech('cloaking-device', 'Cloaking Device', 'rare', 7, 6, {
    kind: 'cloaking',
    enemiesRequiredToPin: 2,
  }),
  tech('improved-logistics', 'Improved Logistics', 'rare', 7, 6, {
    kind: 'extra-activation',
    action: 'move',
    amount: 1,
  }),
  part('sentient-hull', 'Sentient Hull', 'rare', 7, 6),
  part('soliton-cannon', 'Soliton Cannon', 'rare', 9, 7),
  part('transition-drive', 'Transition Drive', 'rare', 9, 7),
  tech('warp-portal', 'Warp Portal', 'rare', 9, 7, {
    kind: 'place-warp-portal',
    controlledSectorVp: 1,
  }),
  part('flux-missile', 'Flux Missile', 'rare', 11, 8),
  tech('pico-modulator', 'Pico Modulator', 'rare', 11, 8, {
    kind: 'extra-activation',
    action: 'upgrade',
    amount: 2,
  }),
  tech('ancient-labs', 'Ancient Labs', 'rare', 13, 9, {
    kind: 'draw-discovery',
    count: 1,
  }),
  part('zero-point-source', 'Zero-Point Source', 'rare', 15, 10),
  tech('metasynthesis', 'Metasynthesis', 'rare', 17, 11, {
    kind: 'colonize-advanced',
    resource: 'all',
  }),
];
export function getTechnology(id: TechnologyId): Technology {
  const technology = TECHNOLOGIES.find((candidate) => candidate.id === id);
  if (!technology)
    throw new Error(`Technology is absent from this catalog: ${id}`);
  return technology;
}
/** Discount indexed by the number of already occupied slots, including printed starting techs. */
export const RESEARCH_DISCOUNTS = [0, 1, 2, 3, 4, 6, 8] as const;
export const RESEARCH_TRACK_CAPACITY = 7;
export interface ResearchEntry {
  technology: TechnologyId;
  track: TechnologyTrack;
}
export type ResearchCostResult =
  | { ok: true; scienceCost: number; discount: number }
  | { ok: false; code: 'wrong-track' | 'already-researched' | 'track-full' };
/** Price and board-placement validation only; market stock, affordability, action and identity
 * checks belong to the authoritative command processor. Does not mutate researched entries.
 */
export function researchCost(
  id: TechnologyId,
  chosenTrack: TechnologyTrack,
  researched: readonly ResearchEntry[],
): ResearchCostResult {
  const technology = getTechnology(id);
  if (technology.track !== 'rare' && technology.track !== chosenTrack)
    return { ok: false, code: 'wrong-track' };
  if (researched.some((entry) => entry.technology === id))
    return { ok: false, code: 'already-researched' };
  const count = researched.filter(
    (entry) => entry.track === chosenTrack,
  ).length;
  if (count >= RESEARCH_TRACK_CAPACITY)
    return { ok: false, code: 'track-full' };
  const discount = RESEARCH_DISCOUNTS[count];
  return {
    ok: true,
    scienceCost: Math.max(
      technology.minimumCost,
      technology.baseCost - discount,
    ),
    discount,
  };
}

/** Lowest printed-price regular tiles first; a full track never licenses a costlier reward. */
export function ancientTechnologyChoices(market:readonly string[],tracks:Record<TechnologyTrack,readonly string[]>):TechnologyId[] {
  const available=TECHNOLOGIES.filter(t=>t.track!=='rare'&&market.includes(t.id)&&!Object.values(tracks).some(ids=>ids.includes(t.id)));
  const lowest=Math.min(...available.map(t=>t.baseCost));
  return available.filter(t=>t.baseCost===lowest&&t.track!=='rare'&&tracks[t.track].length<7).map(t=>t.id);
}
