import { blueprintClassName } from '../../shared/eclipse/blueprints';
import type { FactionId } from '../../shared/eclipse/catalog';
import { planBlueprintUpgrade } from '../../shared/eclipse/upgradePlan';
import { shipPartResearched } from '../../shared/eclipse/parts';
import type { BlueprintShipType, ShipBlueprint } from '../../shared/eclipse/blueprints';
import type { AncientShipPartId } from '../../shared/eclipse/discoveries';
import { SHIP_PARTS, type ShipPart, type ShipPartId } from '../../shared/eclipse/parts';
import type { TechnologyId } from '../../shared/eclipse/technologies';
export const FITTING_GROUPS=['Weapons','Drives','Reactors','Defense','Computers','Special'] as const;
export type FittingGroup=typeof FITTING_GROUPS[number];
export interface FittingPart { id:ShipPartId; available:boolean; availableCopies:number; reason:string|null }
export interface FittingInventory { groups:{name:FittingGroup;parts:FittingPart[]}[]; parts:FittingPart[]; storedAncients:{id:AncientShipPartId;count:number}[] }
export interface FittingInventoryInput { blueprint:ShipBlueprint; draft:ShipBlueprint; technologies:readonly TechnologyId[]; storedParts:readonly AncientShipPartId[]; installedAncientParts?:readonly AncientShipPartId[]; reservedAncientParts?:readonly AncientShipPartId[] }
export function fittingGroup(part:ShipPart):FittingGroup {
 if(part.weapons.length)return 'Weapons';if(part.movement)return 'Drives';if(part.energyProduction)return 'Reactors';if(part.shield||part.hull)return 'Defense';if(part.computer)return 'Computers';return 'Special';
}
function count(parts:readonly (ShipPartId|null)[],id:ShipPartId):number{return parts.filter(part=>part===id).length;}
function allParts(blueprint:ShipBlueprint):readonly (ShipPartId|null)[]{return [...blueprint.parts,...blueprint.outsideParts];}
/** Public UI inventory only; validateBlueprint and planBlueprintUpgrade remain authoritative. */
export function fittingInventory({blueprint,draft,technologies,storedParts,installedAncientParts=[],reservedAncientParts=[]}:FittingInventoryInput):FittingInventory {
 const storedAncients=[...new Set(storedParts)].map(id=>({id,count:storedParts.filter(part=>part===id).length}));
 const parts=SHIP_PARTS.map(part=>{
  if(part.placement!=='grid')return {id:part.id,available:false,availableCopies:0,reason:'This component installs outside the blueprint grid.'};
  if(part.access.kind==='default')return {id:part.id,available:true,availableCopies:Infinity,reason:null};
  if(part.access.kind==='technology')return shipPartResearched(part, technologies)?{id:part.id,available:true,availableCopies:Infinity,reason:null}:{id:part.id,available:false,availableCopies:0,reason:`Research ${part.name} before installing it.`};
  const original=count(allParts(blueprint),part.id), drafted=count(allParts(draft),part.id), stored=storedParts.filter(id=>id===part.id).length;
  const availableCopies=Math.max(0,stored-reservedAncientParts.filter(id=>id===part.id).length-Math.max(0,drafted-original));
  if(original>0)return {id:part.id,available:false,availableCopies:0,reason:`${part.name} is installed on this blueprint and cannot be relocated.`};
  if(availableCopies===0&&installedAncientParts.includes(part.id as AncientShipPartId))return {id:part.id,available:false,availableCopies:0,reason:`${part.name} is installed on another blueprint and cannot be relocated.`};
  return availableCopies>0?{id:part.id,available:true,availableCopies,reason:null}:{id:part.id,available:false,availableCopies:0,reason:stored?`${part.name} is already reserved by this upgrade order.`:`Acquire ${part.name} from an Ancient discovery before installing it.`};
 });
 return {parts,storedAncients,groups:FITTING_GROUPS.map(name=>({name,parts:parts.filter(part=>fittingGroup(SHIP_PARTS.find(candidate=>candidate.id===part.id)!)===name)})).filter(group=>group.parts.length>0)};
}

export type FittingDrafts = Partial<Record<BlueprintShipType, ShipBlueprint>>;
export interface FittingOrder {
 blueprints: ShipBlueprint[];
 installations: number;
 issues: string[];
}
function ancientParts(blueprint:ShipBlueprint):AncientShipPartId[] {
 return allParts(blueprint).filter((id):id is AncientShipPartId=>id!==null&&SHIP_PARTS.find(part=>part.id===id)?.access.kind==='ancient');
}
/** Only newly installed copies reserve storage. Removed Ancient parts are never returned. */
export function reservedAncientParts(blueprints:readonly ShipBlueprint[],drafts:FittingDrafts,except?:BlueprintShipType):AncientShipPartId[] {
 return blueprints.flatMap(previous=>{
  const draft=drafts[previous.shipType];
  if(!draft||previous.shipType===except)return [];
  const original=ancientParts(previous);
  return ancientParts(draft).filter(id=>!original.includes(id));
 });
}
/** Mirrors the existing ordered blueprint-array command without mutating any draft. */
export function fittingOrder(faction:FactionId, originals:readonly ShipBlueprint[], drafts:FittingDrafts, technologies:readonly TechnologyId[], storedParts:readonly AncientShipPartId[], capacity:number):FittingOrder {
 const blueprints=originals.flatMap(previous=>{
  const draft=drafts[previous.shipType];
  return draft&&JSON.stringify(previous)!==JSON.stringify(draft)?[draft]:[];
 });
 const stored=[...storedParts];
 const issues:string[]=[];
 let installations=0;
 for(const draft of blueprints){
  const previous=originals.find(candidate=>candidate.shipType===draft.shipType)!;
  installations+=draft.parts.filter((part,index)=>part!==null&&part!==previous.parts[index]).length+draft.outsideParts.filter(part=>!previous.outsideParts.includes(part)).length;
  const original=ancientParts(previous);
  const plan=planBlueprintUpgrade(faction,previous,draft,technologies,[...stored,...original]);
  if(!plan.ok)issues.push(`${blueprintClassName(faction,draft.shipType)}: ${plan.message}`);
  for(const id of ancientParts(draft).filter(part=>!original.includes(part))){
   const index=stored.indexOf(id);
   if(index>=0)stored.splice(index,1);
  }
 }
 if(installations>capacity)issues.push(`This action allows ${capacity} installed ${capacity===1?'part':'parts'} across all ship classes.`);
 return {blueprints,installations,issues};
}
