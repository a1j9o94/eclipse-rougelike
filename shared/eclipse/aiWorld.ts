import {BASE_COMPONENTS,getFaction} from './catalog';
import {createDiscoverySupply} from './discoveries';
import {createTechnologyBag,createReputationSupply} from './supplies';
import {SHIP_PARTS} from './parts';
import {randomSeed,shuffle} from './random';
import type {GameState,PlayerView} from './types';

/** A hypothetical world, NEVER a reconstruction of the authoritative hidden snapshot.
 * Only used at an ordinary action boundary. Unknown discarded/boxed tiles and spent
 * discoveries are sampled from the remaining observable inventory, not read from storage.
 */
export function sampleAiWorld(view:PlayerView,seed:number):GameState {
 if(view.phase!=='action'||view.pendingDecision||view.actionProgress||view.waitingFor)throw new Error('Search worlds require an ordinary action boundary.');
 let random=randomSeed(seed>>>0);
 function mix<T>(items:readonly T[]):T[]{const result=shuffle(random,items);random=result.state;return result.items;}
 function remove<T>(items:T[],used:readonly T[]):void{for(const item of used){const i=items.indexOf(item);if(i>=0)items.splice(i,1);}}
 const warpPortals=view.warpPortals??true;
 const riftCannons=view.riftCannons??false;
 const visible=new Set(view.sectors.map(s=>Number(s.tileId)));
 const allowed=(id:number)=>!visible.has(id)&&(warpPortals||!BASE_COMPONENTS.sectorIds.optionalWarpPortals.some(portal=>portal===id));
 const ring=(name:'inner'|'middle'|'outer')=>mix(BASE_COMPONENTS.sectorIds[name].filter(allowed)).slice(0,view.supplyCounts?.[name]).map(String);
 const technology=createTechnologyBag(random,warpPortals,riftCannons).tiles.map(t=>t.technology as string);
 remove(technology,view.technologyMarket);
 for(const seat of view.seats){const acquired=Object.values(seat.technologies).flat();remove(acquired,getFaction(seat.faction).startingTechnologies);remove(technology,acquired);}
 const discoveries:string[]=createDiscoverySupply(warpPortals,riftCannons);remove(discoveries,view.private.discoveriesKept);
 const visibleParts=view.seats.flatMap(s=>[...(s.storedParts??[]),...s.blueprints.flatMap(b=>[...b.parts,...(b.outsideParts??[])])]).filter((id):id is string=>id!==null&&SHIP_PARTS.some(p=>p.id===id&&p.access.kind==='ancient'));
 remove(discoveries,visibleParts);
 const discoveryPool=mix(discoveries);
 const reputation=createReputationSupply();
 remove(reputation,view.private.reputation);const repPool=mix(reputation);
 const privateSeats=view.seats.map(seat=>seat.id===view.viewerSeatId?structuredClone(view.private):{
  seatId:seat.id,reputation:repPool.splice(0,view.hiddenTileCounts.find(c=>c.seatId===seat.id)?.reputation??0),
  discoveriesKept:discoveryPool.splice(0,view.hiddenTileCounts.find(c=>c.seatId===seat.id)?.discoveriesKept??0),
 });
 const sectorDiscoveries=view.sectors.filter(s=>s.discovery).flatMap(s=>{const discoveryId=discoveryPool.shift();return discoveryId?[{sectorId:s.id,discoveryId}]:[];});
 const supplies={inner:ring('inner'),middle:ring('middle'),outer:ring('outer'),technology:mix(technology).slice(0,view.supplyCounts?.technology),discovery:discoveryPool.slice(0,view.supplyCounts?.discovery),reputation:repPool.slice(0,view.supplyCounts?.reputation)};
 return {...(view.minorSpecies?{minorSpecies:structuredClone(view.minorSpecies)}:{}),...(view.factionProfile?{factionProfile:view.factionProfile}:{}),rulesVersion:view.rulesVersion,catalogVersion:view.catalogVersion,revision:view.revision,round:view.round,phase:view.phase,activeSeatId:view.activeSeatId,startSeatId:view.startSeatId,firstPasser:view.firstPasser??null,seats:structuredClone(view.seats),sectors:structuredClone(view.sectors),ships:structuredClone(view.ships),technologyMarket:[...view.technologyMarket],pendingDecision:null,privateSeats,random,supplies,
  engine:{warpPortals,riftCannons,action:null,decisions:[],sectorDiscoveries,discardedSectors:{inner:[],middle:[],outer:[]},discardedDiscoveries:[],boxedSectors:[],battle:null,battleSectors:[],upkeepDone:[],scores:null,nextId:1_000_000+view.revision*10_000},
 };
}
