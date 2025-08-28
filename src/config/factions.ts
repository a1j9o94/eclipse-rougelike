import { type Research, type Resources } from './defaults'
import { type FrameId } from './frames'
import { PARTS, type Part } from './parts'

export type FactionId = 'scientists' | 'warmongers' | 'industrialists' | 'raiders';

export type Faction = {
  id: FactionId;
  name: string;
  description: string;
  // Optional starting overrides
  startingFrame?: FrameId; // e.g., start with a cruiser
  startingBlueprintOverrides?: Partial<Record<FrameId, Part[]>>; // swap class blueprints
  startingResearchDelta?: Partial<Research>; // add to initial research
  startingResourcesDelta?: Partial<Resources>; // add resources
  startingCapacityDelta?: number; // add to initial dock capacity
};

export const FACTIONS: readonly Faction[] = [
  {
    id: 'scientists',
    name: 'Consortium of Scholars',
    description: 'All tech tracks start at Tier 2. Better shop quality early.',
    startingResearchDelta: { Military: 1, Grid: 1, Nano: 1 },
  },
  {
    id: 'warmongers',
    name: 'Crimson Vanguard',
    description: 'Begin with a Cruiser-class hull blueprint, one Cruiser deployed, and +2 dock capacity.',
    startingFrame: 'cruiser',
    startingCapacityDelta: 3,
    startingResearchDelta: { Military: 1 },
  },
  {
    id: 'industrialists',
    name: 'Helios Cartel',
    description: '+10¢ +3🧱 to jumpstart the economy; rerolls become cheaper to start.',
    startingResourcesDelta: { credits: 10, materials: 3 },
  },
  {
    id: 'raiders',
    name: 'Void Corsairs',
    description: 'Interceptors start with Tier 2 cannon and +1 initiative (better drives).',
    startingBlueprintOverrides: {
      interceptor: [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[1], PARTS.computers[0]],
    },
  },
];

export function getFaction(id: FactionId): Faction {
  const f = FACTIONS.find(x => x.id === id);
  if (!f) throw new Error(`Unknown faction: ${id}`);
  return f;
}


