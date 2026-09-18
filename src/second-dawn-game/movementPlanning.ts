import { deriveBlueprintStats, type BlueprintShipType } from '../../shared/eclipse/blueprints';
import { publicBlueprint } from '../../shared/eclipse/legal';
import { connectionBetween, movableShipCount, validateMovementPath, type MovementShip, type MovementSector, type MovementAbilities } from '../../shared/eclipse/geometry';
import { mapSector, movementAbilities, capacity as actionCapacity } from '../../shared/eclipse/rulesState';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
export interface MovementShipOption { id:string; type:BlueprintShipType; label:string; range:number; reason:string|null }
export interface MovementDestination { sectorId:string; command:Extract<GameCommand,{type:'move'}>; activations:number }
export interface MovementPlan { ships:MovementShipOption[]; capacity:number; leaveCapacity:number; destinations:MovementDestination[]; message:string|null }
function shortestPath(player:string,shipId:string,target:string,sectors:MovementSector[],ships:MovementShip[],abilities:MovementAbilities,maxActivations:number,neighbors:ReadonlyMap<string,readonly string[]>):string[]|null {
 const ship=ships.find(s=>s.id===shipId)!;const queue:string[][]=[[]];const seen=new Set([ship.sectorId]);
 // One BFS visit per sector. Other ships stay fixed during this ship's route,
 // so reaching the same sector by a longer path cannot improve its legality.
 for(let index=0;index<queue.length;index++){const path=queue[index];if(path.length>=ship.movement*maxActivations)continue;
  const currentId=path.at(-1)??ship.sectorId;
  const present=ships.map(s=>s.id===shipId?{...s,sectorId:currentId}:s);
  for(const sectorId of neighbors.get(currentId)??[]){if(seen.has(sectorId))continue;const next=[...path,sectorId];
   if(!validateMovementPath({player,shipId,path:[sectorId],sectors,ships:present,abilities}).ok)continue;
   if(sectorId===target)return next;seen.add(sectorId);queue.push(next);
  }
 }
 return null;
}
function orders(ids:readonly string[]):string[][] {return ids.length<2?[Array.from(ids)]:ids.flatMap(id=>orders(ids.filter(other=>other!==id)).map(rest=>[id,...rest]));}
/** Public information only. Each planned move relocates its ship before validating the next, matching the authoritative command. */
export function movementPlan(view:PlayerView,sourceSectorId:string|null,selectedShipIds:readonly string[]):MovementPlan {
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;const progress=view.actionProgress;
 const canAct=view.phase==='action'&&view.activeSeatId===seat.id&&!view.pendingDecision&&!view.waitingFor&&!seat.eliminated;
 const capacity=!canAct?0:progress?(progress.owner===seat.id&&progress.action==='move'?progress.remaining:0):seat.influenceOnTrack>0?actionCapacity(seat,'move'):0;
 const abilities=movementAbilities(seat);const sectors=view.sectors.map(mapSector);
 const neighbors=new Map(sectors.map(from=>[from.id,sectors.filter(to=>connectionBetween(from,to,abilities.wormholeGenerator)!=='none').map(to=>to.id)]));
 const fleet:MovementShip[]=view.ships.map(ship=>({id:ship.id,owner:ship.owner,sectorId:ship.sectorId,kind:ship.type,movement:ship.owner===seat.id&&ship.type!=='ancient'&&ship.type!=='guardian'&&ship.type!=='gcds'?deriveBlueprintStats(seat.faction,publicBlueprint(seat.blueprints.find(b=>b.shipType===ship.type)!)).movement:0}));
 const leaveCapacity=sourceSectorId?movableShipCount(seat.id,sourceSectorId,fleet,abilities):0;
 const counters:Partial<Record<BlueprintShipType,number>>={};
 const ships:MovementShipOption[]=fleet.filter(s=>s.owner===seat.id&&s.sectorId===sourceSectorId).map(ship=>{const type=ship.kind as BlueprintShipType;const index=counters[type]=(counters[type]??0)+1;return {id:ship.id,type,label:`${type[0].toUpperCase()+type.slice(1)} ${index}`,range:ship.movement,reason:type==='starbase'?'Starbases cannot move.':ship.movement===0?'No drive: install a drive before moving.':leaveCapacity===0?'Pinned: opposing ships prevent this fleet from leaving.':null};});
 let message:string|null=null;
 if(!capacity)message=canAct?'Finish the current action or free an influence disc before moving.':'Wait for your action turn to move.';
 else if(!sourceSectorId)message='Select a sector containing your ships on the galaxy.';
 else if(!ships.length)message='No friendly ships here. Select a sector containing your fleet.';
 else if(!selectedShipIds.length)message='Select ships, then choose a highlighted destination on the galaxy.';
 else if(selectedShipIds.length>capacity)message=`Only ${capacity} move activations remain.`;
 else if(selectedShipIds.length>leaveCapacity)message=`Some ships must remain to pin the enemy; only ${leaveCapacity} can leave.`;
 else if(new Set(selectedShipIds).size!==selectedShipIds.length||selectedShipIds.some(id=>!ships.some(ship=>ship.id===id&&!ship.reason)))message='Select only mobile ships in this sector.';
 if(message)return {ships,capacity,leaveCapacity,destinations:[],message};
 const destinations:MovementDestination[]=[];
 for(const target of sectors){if(target.id===sourceSectorId)continue;
  for(const order of orders(selectedShipIds)){let current=fleet;const moves:Extract<GameCommand,{type:'move'}>['moves']=[];
   let completed=0;
   for(const shipId of order){
    const ship=current.find(s=>s.id===shipId)!;
    // Reserve at least one activation for each other selected ship.
    const available=capacity-moves.length-(order.length-completed-1);
    const path=shortestPath(seat.id,shipId,target.id,sectors,current,abilities,available,neighbors);if(!path)break;
    let valid=true;
    for(let offset=0;offset<path.length;offset+=ship.movement){
     const segment=path.slice(offset,offset+ship.movement);
     if(!validateMovementPath({player:seat.id,shipId,path:segment,sectors,ships:current,abilities}).ok){valid=false;break;}
     moves.push({shipId,path:segment});current=current.map(s=>s.id===shipId?{...s,sectorId:segment[segment.length-1]}:s);
    }
    if(!valid)break;completed++;
   }
   if(completed===order.length){destinations.push({sectorId:target.id,command:{type:'move',moves},activations:moves.length});break;}
  }
 }
 return {ships,capacity,leaveCapacity,destinations,message:destinations.length?null:'No shared destination is reachable with the remaining move activations and current wormhole connections. Enemy fleets may stop travel through a sector.'};
}
