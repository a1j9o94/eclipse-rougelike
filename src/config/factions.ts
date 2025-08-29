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
  startingShopItemsDelta?: number; // influence shop size
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
    startingShopItemsDelta: 0,
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

// ------------------------------- Boss Fleets per Faction --------------------
export type BossShipSpec = { frame: 'interceptor'|'cruiser'|'dread'; parts: string[] };
export type BossFleetSpec = { sector: 5|10; name: string; ships: BossShipSpec[] };

const BOSS_FLEETS: Record<FactionId, { five: BossFleetSpec; ten: BossFleetSpec }> = {
  scientists: {
    five: { sector:5, name:'Scholars Tactics', ships:[
      { frame:'cruiser', parts:['tachyon_source','tachyon_drive','gluon','antimatter','phase'] },
      { frame:'interceptor', parts:['fusion_source','fusion_drive','positron','plasma'] },
    ]},
    ten: { sector:10, name:'Quantum Phalanx', ships:[
      { frame:'dread', parts:['quantum_source','warp_drive','neutrino','singularity','omega','reinforced'] },
      { frame:'cruiser', parts:['tachyon_source','warp_drive','gluon','rift_cannon','phase'] },
    ]},
  },
  warmongers: {
    five: { sector:5, name:'Vanguard Spear', ships:[
      { frame:'cruiser', parts:['fusion_source','tachyon_drive','positron','gauss_array','gauss'] },
      { frame:'interceptor', parts:['micro_fusion','ion_thruster','plasma'] },
    ]},
    ten: { sector:10, name:'Crimson Armada', ships:[
      { frame:'dread', parts:['zero_point','transition_drive','neutrino','rift_cannon','omega','adamantine'] },
      { frame:'cruiser', parts:['tachyon_source','warp_drive','gluon','antimatter','phase'] },
    ]},
  },
  industrialists: {
    five: { sector:5, name:'Helios Bulwark', ships:[
      { frame:'cruiser', parts:['tachyon_source','tachyon_drive','positron','gauss','reinforced'] },
      { frame:'interceptor', parts:['fusion_source','ion_thruster','plasma','composite'] },
    ]},
    ten: { sector:10, name:'Cartel Citadel', ships:[
      { frame:'dread', parts:['quantum_source','transition_drive','neutrino','singularity','omega','monolith_plating'] },
      { frame:'cruiser', parts:['tachyon_source','warp_drive','gluon','gauss_array','phase'] },
    ]},
  },
  raiders: {
    five: { sector:5, name:'Corsair Ambush', ships:[
      { frame:'cruiser', parts:['micro_fusion','tachyon_drive','gluon','antimatter','gauss'] },
      { frame:'interceptor', parts:['fusion_source','ion_thruster','antimatter'] },
    ]},
    ten: { sector:10, name:'Void Reavers', ships:[
      { frame:'dread', parts:['quantum_source','warp_drive','neutrino','rift_cannon','omega','adamantine'] },
      { frame:'cruiser', parts:['tachyon_source','warp_drive','gluon','rift_cannon','phase'] },
    ]},
  },
};

export function getBossFleetFor(fid: FactionId|undefined|null, sector:number){
  const id = (fid||'warmongers') as FactionId;
  const def = BOSS_FLEETS[id];
  return sector>=10 ? def.ten : def.five;
}


