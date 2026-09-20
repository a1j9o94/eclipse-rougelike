import { shipPartResearched } from '../../shared/eclipse/parts';
import type { ShipBlueprint } from '../../shared/eclipse/blueprints';
import type { AncientShipPartId } from '../../shared/eclipse/discoveries';
import { SHIP_PARTS, type ShipPart, type ShipPartId } from '../../shared/eclipse/parts';
import type { TechnologyId } from '../../shared/eclipse/technologies';
export const FITTING_GROUPS=['Weapons','Drives','Reactors','Defense','Computers','Special'] as const;
export type FittingGroup=typeof FITTING_GROUPS[number];
export interface FittingPart { id:ShipPartId; available:boolean; availableCopies:number; reason:string|null }
export interface FittingInventory { groups:{name:FittingGroup;parts:FittingPart[]}[]; parts:FittingPart[]; storedAncients:{id:AncientShipPartId;count:number}[] }
export interface FittingInventoryInput { blueprint:ShipBlueprint; draft:ShipBlueprint; technologies:readonly TechnologyId[]; storedParts:readonly AncientShipPartId[]; installedAncientParts?:readonly AncientShipPartId[] }
export function fittingGroup(part:ShipPart):FittingGroup {
 if(part.weapons.length)return 'Weapons';if(part.movement)return 'Drives';if(part.energyProduction)return 'Reactors';if(part.shield||part.hull)return 'Defense';if(part.computer)return 'Computers';return 'Special';
}
function count(parts:readonly (ShipPartId|null)[],id:ShipPartId):number{return parts.filter(part=>part===id).length;}
function allParts(blueprint:ShipBlueprint):readonly (ShipPartId|null)[]{return [...blueprint.parts,...blueprint.outsideParts];}
/** Public UI inventory only; validateBlueprint and planBlueprintUpgrade remain authoritative. */
export function fittingInventory({blueprint,draft,technologies,storedParts,installedAncientParts=[]}:FittingInventoryInput):FittingInventory {
 const storedAncients=[...new Set(storedParts)].map(id=>({id,count:storedParts.filter(part=>part===id).length}));
 const parts=SHIP_PARTS.map(part=>{
  if(part.placement!=='grid')return {id:part.id,available:false,availableCopies:0,reason:'This component installs outside the blueprint grid.'};
  if(part.access.kind==='default')return {id:part.id,available:true,availableCopies:Infinity,reason:null};
  if(part.access.kind==='technology')return shipPartResearched(part, technologies)?{id:part.id,available:true,availableCopies:Infinity,reason:null}:{id:part.id,available:false,availableCopies:0,reason:`Research ${part.name} before installing it.`};
  const original=count(allParts(blueprint),part.id), drafted=count(allParts(draft),part.id), stored=storedParts.filter(id=>id===part.id).length;
  const availableCopies=Math.max(0,stored-Math.max(0,drafted-original));
  if(original>0)return {id:part.id,available:false,availableCopies:0,reason:`${part.name} is installed on this blueprint and cannot be relocated.`};
  if(installedAncientParts.includes(part.id as AncientShipPartId))return {id:part.id,available:false,availableCopies:0,reason:`${part.name} is installed on another blueprint and cannot be relocated.`};
  return availableCopies>0?{id:part.id,available:true,availableCopies,reason:null}:{id:part.id,available:false,availableCopies:0,reason:stored?`${part.name} is already reserved by this draft.`:`Acquire ${part.name} from an Ancient discovery before installing it.`};
 });
 return {parts,storedAncients,groups:FITTING_GROUPS.map(name=>({name,parts:parts.filter(part=>fittingGroup(SHIP_PARTS.find(candidate=>candidate.id===part.id)!)===name)})).filter(group=>group.parts.length>0)};
}
