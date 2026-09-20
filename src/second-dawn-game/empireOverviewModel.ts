import {getFaction} from '../../shared/eclipse/catalog';
import {deriveBlueprintStats,type BlueprintShipType} from '../../shared/eclipse/blueprints';
import {publicBlueprint} from '../../shared/eclipse/legal';
import {capacity,hasTech} from '../../shared/eclipse/rulesState';
import {sectorDefinition} from '../../shared/eclipse/sectors';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from '../../shared/eclipse/tracks';
import type {Action,PlayerView,Resource} from '../../shared/eclipse/types';
import type {PlanetResource} from './SectorPlanets';
import {runningScore} from './runningScore';

export interface EmpirePlanet {
 sectorId:string;tileId:string;squareId:string;resource:PlanetResource;advanced:boolean;
 /** Technology eligibility, independent of turn, ships, colony ships and cube supply. */
 readyResources:Resource[];
}
export interface EmpireFleet {
 type:BlueprintShipType;count:number;movement:number;initiative:number;hitPoints:number;
 locations:{sectorId:string;tileId:string;count:number;damaged:number}[];
}
export interface EmpireOverviewModel {
 own:boolean;score:number;sectorCount:number;colonyShips:number;colonyShipCapacity:number;
 influence:number;upkeep:number;tradeRatio:number;
 resources:{resource:Resource;stock:number;income:number;cubes:number}[];
 planets:EmpirePlanet[];fleets:EmpireFleet[];capacities:{action:Action;amount:number}[];
}
const resources:Resource[]=['money','science','materials'];
const advancedTech={money:'advanced-economy',science:'advanced-labs',materials:'advanced-mining'};
const shipTypes:BlueprintShipType[]=['interceptor','cruiser','dreadnought','starbase'];
const actions:Action[]=['explore','influence','research','upgrade','build','move'];
/** Derived public empire facts only. Never copy private rewards into the presentation model. */
export function empireOverviewModel(view:PlayerView,seatId:string):EmpireOverviewModel {
 const seat=view.seats.find(seat=>seat.id===seatId);
 if(!seat)throw new RangeError(`Seat is absent from this view: ${seatId}`);
 const faction=getFaction(seat.faction),sectors=view.sectors.filter(sector=>sector.owner===seatId);
 const planets:EmpirePlanet[]=sectors.flatMap(sector=>{
  const printed=sectorDefinition(Number(sector.tileId))?.population??[];
  const spaces:{squareId:string;resource:PlanetResource;advanced:boolean}[]=printed.map((planet,index)=>({...planet,squareId:`p${index}`}));
  if(sector.orbital)spaces.push({squareId:'orbital',resource:'orbital',advanced:false});
  return spaces.filter(space=>!sector.population.some(cube=>cube.squareId===space.squareId)).map(space=>{
   const possible=space.resource==='gray'?resources:space.resource==='orbital'?resources.filter(resource=>resource!=='materials'):[space.resource];
   return {...space,sectorId:sector.id,tileId:sector.tileId,readyResources:possible.filter(resource=>!space.advanced||hasTech(seat,'metasynthesis')||hasTech(seat,advancedTech[resource]))};
  });
 });
 const fleets=shipTypes.flatMap(type=>{
  const blueprint=seat.blueprints.find(blueprint=>blueprint.shipType===type);if(!blueprint)return [];
  const stats=deriveBlueprintStats(seat.faction,publicBlueprint(blueprint));
  const ships=view.ships.filter(ship=>ship.owner===seatId&&ship.type===type);
  return [{type,count:ships.length,movement:stats.movement,initiative:stats.initiative,hitPoints:stats.hull+1,
   locations:[...new Set(ships.map(ship=>ship.sectorId))].map(sectorId=>({sectorId,tileId:view.sectors.find(sector=>sector.id===sectorId)?.tileId??sectorId,count:ships.filter(ship=>ship.sectorId===sectorId).length,damaged:ships.filter(ship=>ship.sectorId===sectorId&&ship.damage>0).length}))}];
 });
 return {own:seatId===view.viewerSeatId,score:runningScore(view,seatId).breakdown.total,sectorCount:sectors.length,
  colonyShips:seat.colonyShipsAvailable,colonyShipCapacity:faction.colonyShips+(seat.technologies.grid.includes('advanced-colony-ships')||seat.developments?.some(d=>d.technologyId==='advanced-colony-ships')?1:0),influence:seat.influenceOnTrack,upkeep:upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack)),tradeRatio:faction.tradeRatio,
  resources:resources.map(resource=>({resource,stock:seat.resources[resource],income:incomeForPopulationAway(seat.populationTracks[resource]),cubes:Math.max(0,11-seat.populationTracks[resource])})),
  planets,fleets,capacities:actions.map(action=>({action,amount:seat.passed&&!['upgrade','build','move'].includes(action)?0:capacity(seat,action)}))};
}
