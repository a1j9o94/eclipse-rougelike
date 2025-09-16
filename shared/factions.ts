import { ALL_PARTS, type Part } from './parts';
import { buildFactionConfig, type GameConfig } from './game';
export type FrameId = 'interceptor' | 'cruiser' | 'dread';
export type FactionId = 'scientists' | 'warmongers' | 'industrialists' | 'raiders' | 'timekeepers' | 'collective';

export type SharedFactionConfig = {
  id: FactionId;
  name: string;
  description: string;
  startingFrame: FrameId;
  capacity: number;
  research: { Military: number; Grid: number; Nano: number };
  resources: { credits: number; materials: number; science: number };
  rareChance: number;
  economy: { rerollBase?: number; creditMultiplier?: number; materialMultiplier?: number };
  blueprintIds: Partial<Record<FrameId, string[]>>;
  unlock?: (ctx: UnlockContext) => boolean;
  bosses: { five: BossFleetSpec; ten: BossFleetSpec };
};

export type UnlockContext = { research: { Military:number; Grid:number; Nano:number }; fleet: { frame:{ id: string } }[]; victory: boolean };
export type BossShipSpec = { frame: 'interceptor'|'cruiser'|'dread'; parts: string[] };
export type BossFleetSpec = { sector: 5|10; name: string; ships: BossShipSpec[] };

export const SHARED_FACTIONS: Record<FactionId, SharedFactionConfig> = {
  scientists: {
    id: 'scientists',
    name: 'Consortium of Scholars',
    description: 'All tech tracks start at Tier 2. Better shop quality early.',
    startingFrame: 'interceptor',
    capacity: 3,
    research: { Military: 2, Grid: 2, Nano: 2 },
    resources: { credits: 20, materials: 5, science: 0 },
    rareChance: 0.2,
    economy: {},
    blueprintIds: { interceptor: ['tachyon_source','ion_thruster','positron','entropy_beam'] },
    unlock: ({ research }) => research.Military >= 3 && research.Grid >= 3 && research.Nano >= 3,
    bosses: {
      five: { sector:5, name:'Scholars Tactics', ships:[
        { frame:'cruiser', parts:['tachyon_source','micro_fusion','tachyon_drive','quantum_cpu','sentient_hull','phase','entropy_beam'] },
        { frame:'interceptor', parts:['fusion_source','micro_fusion','ion_thruster','gluon','absorption','antimatter'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','phase','hexfire_projector','plasma'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','target_painter_beam','plasma'] },
      ]},
      ten: { sector:10, name:'Quantum Phalanx', ships:[
        { frame:'dread', parts:['zero_point','quantum_source','transition_drive','sentient_ai','neutrino','omega','magnet_hull','magnet_shield','rift_cannon'] },
        { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','neutrino','omega','entropy_beam','improved'] },
        { frame:'interceptor', parts:['tachyon_source','micro_fusion','ion_thruster','gluon','phase','fleetfire_array'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','gluon','absorption','hexfire_projector','antimatter'] },
      ]},
    },
  },
  warmongers: {
    id: 'warmongers',
    name: 'Crimson Vanguard',
    description: 'Begin with a Cruiser-class hull blueprint, one Cruiser deployed, and +2 dock capacity.',
    startingFrame: 'cruiser',
    capacity: 14,
    research: { Military: 2, Grid: 1, Nano: 1 },
    resources: { credits: 20, materials: 5, science: 0 },
    rareChance: 0.1,
    economy: {},
    blueprintIds: {
      cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'],
      interceptor: ['tachyon_source','tachyon_drive','plasma','positron','gauss'],
    },
    unlock: ({ fleet, victory }) => victory && fleet.some(s => s.frame.id === 'cruiser'),
    bosses: {
      five: { sector:5, name:'Vanguard Spear', ships:[
        { frame:'cruiser', parts:['tachyon_source','micro_fusion','tachyon_drive','plasma_array','positron','gauss','composite'] },
        { frame:'interceptor', parts:['fusion_source','micro_fusion','ion_thruster','plasma','positron','gauss'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','rebound_blaster','plasma'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','phase','antimatter'] },
      ]},
      ten: { sector:10, name:'Crimson Armada', ships:[
        { frame:'dread', parts:['zero_point','quantum_source','transition_drive','omega','adamantine','magnet_hull','magnet_shield','rift_cannon'] },
        { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','antimatter_array','gluon','phase','improved'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','gluon','phase','antimatter'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','plasma_battery'] },
      ]},
    },
  },
  industrialists: {
    id: 'industrialists',
    name: 'Helios Cartel',
    description: 'Extra credits and materials; initial rerolls free; actions cost less.',
    startingFrame: 'interceptor',
    capacity: 3,
    research: { Military: 1, Grid: 1, Nano: 1 },
    resources: { credits: 40, materials: 10, science: 0 },
    rareChance: 0.1,
    economy: { rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 },
    blueprintIds: { interceptor: ['discount_source','ion_thruster','bargain_plasma','positron'] },
    bosses: {
      five: { sector:5, name:'Helios Bulwark', ships:[
        { frame:'cruiser', parts:['tachyon_source','discount_source','tachyon_drive','gauss','improved','quantum_cpu','bargain_plasma'] },
        { frame:'interceptor', parts:['fusion_source','ion_thruster','composite','positron','volatile_cannon','absorption'] },
        { frame:'interceptor', parts:['tachyon_source','overtuned_drive','positron','unstable_shield','bargain_plasma'] },
        { frame:'interceptor', parts:['discount_source','ion_thruster','positron','gauss','volatile_array'] },
      ]},
      ten: { sector:10, name:'Cartel Citadel', ships:[
        { frame:'dread', parts:['zero_point','quantum_source','transition_drive','volatile_array','volatile_array','omega','monolith_plating','quantum_cpu'] },
        { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','plasma_battery','quantum_cpu','phase','improved'] },
        { frame:'interceptor', parts:['tachyon_source','overtuned_drive','gluon','unstable_shield','rebound_blaster'] },
        { frame:'interceptor', parts:['fusion_source','ion_thruster','positron','gauss','bargain_plasma'] },
      ]},
    },
  },
  raiders: {
    id: 'raiders',
    name: 'Void Corsairs',
    description: 'Interceptors start with Tier 2 cannon and +1 initiative.',
    startingFrame: 'interceptor',
    capacity: 3,
    research: { Military: 1, Grid: 1, Nano: 1 },
    resources: { credits: 20, materials: 5, science: 0 },
    rareChance: 0.1,
    economy: {},
    blueprintIds: { interceptor: ['tachyon_source','tachyon_drive','antimatter','positron'] },
    unlock: ({ fleet, victory }) => victory && fleet.length > 0 && fleet.every(s => s.frame.id === 'interceptor'),
    bosses: {
      five: { sector:5, name:'Corsair Ambush', ships:[
        { frame:'cruiser', parts:['micro_fusion','tachyon_source','tachyon_drive','antimatter','positron','gauss','composite'] },
        { frame:'interceptor', parts:['fusion_source','micro_fusion','ion_thruster','antimatter','positron','phase'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','rebound_blaster','plasma'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','gluon','absorption','hexfire_projector','plasma'] },
      ]},
      ten: { sector:10, name:'Void Reavers', ships:[
        { frame:'dread', parts:['zero_point','quantum_source','transition_drive','rift_cannon','sentient_ai','omega','plasma_array'] },
        { frame:'cruiser', parts:['tachyon_source','quantum_source','warp_drive','rift_cannon','positron','gauss','sentient_hull'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','gluon','absorption','singularity'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','antimatter'] },
      ]},
    },
  },
  timekeepers: {
    id: 'timekeepers',
    name: 'Temporal Vanguard',
    description: 'Start with Disruptor Beam, Plasma Cannon, and advanced drives.',
    startingFrame: 'interceptor',
    capacity: 3,
    research: { Military: 1, Grid: 2, Nano: 1 },
    resources: { credits: 20, materials: 5, science: 0 },
    rareChance: 0.1,
    economy: {},
    blueprintIds: { interceptor: ['tachyon_source','tachyon_drive','disruptor','plasma'] },
    unlock: ({ research }) => research.Grid >= 3,
    bosses: {
      five: { sector:5, name:'Chrono Skirmish', ships:[
        { frame:'cruiser', parts:['tachyon_source','tachyon_drive','disruptor','gluon','phase','composite'] },
        { frame:'interceptor', parts:['tachyon_source','tachyon_drive','disruptor','plasma'] },
        { frame:'interceptor', parts:['fusion_source','ion_thruster','positron','gauss','recursive_array_mk1'] },
        { frame:'interceptor', parts:['fusion_source','ion_thruster','positron','gauss','entropy_beam'] },
      ]},
      ten: { sector:10, name:'Epoch Armada', ships:[
        { frame:'dread', parts:['zero_point','quantum_source','transition_drive','disruptor','neutrino','omega','monolith_plating','magnet_hull','magnet_shield'] },
        { frame:'cruiser', parts:['tachyon_source','warp_drive','disruptor_cannon','gluon','phase','recursive_array_mk2'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','gluon','phase','disruptor'] },
        { frame:'interceptor', parts:['fusion_source','ion_thruster','positron','gauss','target_painter_beam'] },
      ]},
    },
  },
  collective: {
    id: 'collective',
    name: 'Regenerative Swarm',
    description: 'Begin with Auto-Repair Hull and regenerative ships.',
    startingFrame: 'interceptor',
    capacity: 3,
    research: { Military: 1, Grid: 1, Nano: 2 },
    resources: { credits: 20, materials: 5, science: 0 },
    rareChance: 0.1,
    economy: {},
    blueprintIds: { interceptor: ['fusion_source','fusion_drive','plasma','auto_repair'] },
    unlock: ({ research }) => research.Nano >= 3,
    bosses: {
      five: { sector:5, name:'Swarm Renewal', ships:[
        { frame:'cruiser', parts:['tachyon_source','fusion_drive','plasma_array','positron','gauss','auto_repair'] },
        { frame:'interceptor', parts:['tachyon_source','fusion_drive','plasma','positron','auto_repair'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','guardian_shield','plasma'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','phase','unity_hull','plasma'] },
      ]},
      ten: { sector:10, name:'Enduring Mass', ships:[
        { frame:'dread', parts:['zero_point','quantum_source','transition_drive','plasma_cluster','neutrino','omega','auto_repair','adamantine','magnet_hull','magnet_shield'] },
        { frame:'cruiser', parts:['tachyon_source','warp_drive','plasma_battery','gluon','phase','auto_repair'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','guardian_shield','target_painter_beam'] },
        { frame:'interceptor', parts:['tachyon_source','ion_thruster','positron','gauss','volatile_cannon','auto_repair'] },
      ]},
    },
  },
};

export function getBossFleetFor(fid: FactionId|undefined|null, sector:number){
  const id = (fid||'warmongers') as FactionId;
  const def = SHARED_FACTIONS[id].bosses;
  return sector>=10 ? def.ten : def.five;
}

// Client-friendly FACTIONS list with real parts mapped and ready GameConfig
export const FACTIONS: readonly { id:FactionId; name:string; description:string; config:GameConfig; unlock?: (ctx:{ research:{Military:number;Grid:number;Nano:number}; fleet:{frame:{id:string}}[]; victory:boolean })=>boolean }[] =
  (Object.values(SHARED_FACTIONS).map((sf) => {
    const partsFor = (ids: string[] | undefined): Part[] => (ids || []).map((id) => (ALL_PARTS as Part[]).find((p) => p.id === id)!).filter(Boolean) as Part[];
    const blueprints = {
      interceptor: partsFor(sf.blueprintIds.interceptor),
      cruiser: partsFor(sf.blueprintIds.cruiser),
      dread: partsFor(sf.blueprintIds.dread),
    };
    const cfg = buildFactionConfig({
      startingFrame: sf.startingFrame,
      capacity: sf.capacity,
      research: sf.research,
      resources: sf.resources,
      rareChance: sf.rareChance,
      economy: sf.economy,
      blueprints,
    });
    return { id: sf.id, name: sf.name, description: sf.description, config: cfg, unlock: sf.unlock };
  }));

export function getFaction(id: FactionId) {
  const f = FACTIONS.find((x) => x.id === id) as (typeof FACTIONS)[number] | undefined;
  if (!f) throw new Error(`Unknown faction: ${id}`);
  return f;
}

export type SharedFaction = keyof typeof SHARED_FACTIONS;
