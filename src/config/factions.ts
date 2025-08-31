import { PARTS, type Part } from './parts'
import { buildFactionConfig, type GameConfig } from './game'
import { type ResearchState as Research, type Ship } from './types'

export type FactionId = 'scientists' | 'warmongers' | 'industrialists' | 'raiders' | 'timekeepers' | 'collective';

export type UnlockContext = { research: Research; fleet: Ship[]; victory: boolean };
export type Faction = {
  id: FactionId;
  name: string;
  description: string;
  config: GameConfig;
  unlock?: (ctx: UnlockContext) => boolean;
};

export const FACTIONS: readonly Faction[] = [
  {
    id: 'scientists',
    name: 'Consortium of Scholars',
    description: 'All tech tracks start at Tier 2. Better shop quality early.',
    config: buildFactionConfig({
      research: { Military: 2, Grid: 2, Nano: 2 },
      rareChance: 0.2,
    }),
    unlock: ({ research }) => research.Military >= 3 && research.Grid >= 3 && research.Nano >= 3,
  },
  {
    id: 'warmongers',
    name: 'Crimson Vanguard',
    description: 'Begin with a Cruiser-class hull blueprint, one Cruiser deployed, and +2 dock capacity.',
    config: buildFactionConfig({
      startingFrame: 'cruiser',
      capacity: 14,
      research: { Military: 2 },
    }),
    unlock: ({ fleet, victory }) => victory && fleet.some(s => s.frame.id === 'cruiser'),
  },
  {
    id: 'industrialists',
    name: 'Helios Cartel',
    description: '+10¢ +3🧱 to jumpstart the economy; rerolls free initially and actions cost less.',
    config: buildFactionConfig({
      resources: { credits: 20, materials: 8 },
      economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
    }),
  },
  {
    id: 'raiders',
    name: 'Void Corsairs',
    description: 'Interceptors start with Tier 2 cannon and +1 initiative (better drives).',
    config: buildFactionConfig({
      blueprints: {
        interceptor: [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[1], PARTS.computers[0]] as Part[],
      },
    }),
    unlock: ({ fleet, victory }) =>
      victory && fleet.length > 0 && fleet.every(s => s.frame.id === 'interceptor'),
  },
  {
    id: 'timekeepers',
    name: 'Temporal Vanguard',
    description: 'Start with Disruptor Beam blueprint and advanced drives.',
    config: buildFactionConfig({
      research: { Grid: 2 },
      blueprints: {
        interceptor: [PARTS.sources[0], PARTS.drives[1], PARTS.weapons.find(p=>p.id==='disruptor') as Part, PARTS.computers[0]] as Part[],
      },
    }),
    unlock: ({ research }) => research.Grid >= 3,
  },
  {
    id: 'collective',
    name: 'Regenerative Swarm',
    description: 'Begin with Auto-Repair Hull blueprint and ships that mend each round.',
    config: buildFactionConfig({
      blueprints: {
        interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.hull.find(p=>p.id==='auto_repair') as Part],
      },
      research: { Nano: 2 },
    }),
    unlock: ({ research }) => research.Nano >= 3,
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
      { frame:'cruiser', parts:['tachyon_source','micro_fusion','tachyon_drive','quantum_cpu','sentient_hull','phase','antimatter'] },
      { frame:'interceptor', parts:['fusion_source','micro_fusion','ion_thruster','gluon','absorption','antimatter'] },
    ]},
    ten: { sector:10, name:'Quantum Phalanx', ships:[
      { frame:'dread', parts:['zero_point','quantum_source','transition_drive','sentient_ai','neutrino','omega','rift_cannon','monolith_plating'] },
      { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','neutrino','omega','rift_cannon','reinforced'] },
    ]},
  },
  warmongers: {
    five: { sector:5, name:'Vanguard Spear', ships:[
      { frame:'cruiser', parts:['tachyon_source','micro_fusion','tachyon_drive','plasma_array','positron','gauss','composite'] },
      { frame:'interceptor', parts:['fusion_source','micro_fusion','ion_thruster','plasma','positron','gauss'] },
    ]},
    ten: { sector:10, name:'Crimson Armada', ships:[
      { frame:'dread', parts:['zero_point','quantum_source','transition_drive','rift_cannon','neutrino','omega','adamantine'] },
      { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','antimatter','gluon','phase','reinforced'] },
    ]},
  },
  industrialists: {
    five: { sector:5, name:'Helios Bulwark', ships:[
      { frame:'cruiser', parts:['tachyon_source','tachyon_drive','gauss','improved','composite','quantum_cpu','plasma'] },
      { frame:'interceptor', parts:['fusion_source','ion_thruster','composite','positron','plasma','absorption'] },
    ]},
    ten: { sector:10, name:'Cartel Citadel', ships:[
      { frame:'dread', parts:['zero_point','quantum_source','transition_drive','monolith_plating','reinforced','omega','plasma_array','quantum_cpu','singularity'] },
      { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','reinforced','phase','plasma_array','quantum_cpu'] },
    ]},
  },
  raiders: {
    five: { sector:5, name:'Corsair Ambush', ships:[
      { frame:'cruiser', parts:['micro_fusion','tachyon_source','tachyon_drive','antimatter','positron','gauss','composite'] },
      { frame:'interceptor', parts:['fusion_source','micro_fusion','ion_thruster','antimatter','positron','phase'] },
    ]},
    ten: { sector:10, name:'Void Reavers', ships:[
      { frame:'dread', parts:['zero_point','quantum_source','transition_drive','rift_cannon','sentient_ai','omega','gauss_array'] },
      { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','rift_cannon','positron','gauss','sentient_hull'] },
    ]},
  },
  timekeepers: {
    five: { sector:5, name:'Chrono Skirmish', ships:[
      { frame:'cruiser', parts:['tachyon_source','tachyon_drive','disruptor','gluon','phase','composite'] },
      { frame:'interceptor', parts:['fusion_source','tachyon_drive','disruptor','positron'] },
    ]},
    ten: { sector:10, name:'Epoch Armada', ships:[
      { frame:'dread', parts:['zero_point','quantum_source','transition_drive','disruptor','neutrino','omega','monolith_plating'] },
      { frame:'cruiser', parts:['tachyon_source','warp_drive','disruptor','gluon','phase','auto_repair'] },
    ]},
  },
  collective: {
    five: { sector:5, name:'Swarm Renewal', ships:[
      { frame:'cruiser', parts:['tachyon_source','fusion_drive','plasma_array','positron','gauss','auto_repair'] },
      { frame:'interceptor', parts:['fusion_source','fusion_drive','plasma','positron','auto_repair'] },
    ]},
    ten: { sector:10, name:'Enduring Mass', ships:[
      { frame:'dread', parts:['zero_point','quantum_source','transition_drive','cluster_missiles','neutrino','omega','auto_repair','adamantine'] },
      { frame:'cruiser', parts:['tachyon_source','warp_drive','nova_battery','gluon','phase','auto_repair'] },
    ]},
  },
};

export function getBossFleetFor(fid: FactionId|undefined|null, sector:number){
  const id = (fid||'warmongers') as FactionId;
  const def = BOSS_FLEETS[id];
  return sector>=10 ? def.ten : def.five;
}

