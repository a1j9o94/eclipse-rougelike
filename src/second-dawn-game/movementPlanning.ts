import {guildMovementTolls} from '../../shared/eclipse/scifiActions';
import {remainingAction} from './actionCapacity';
import { deriveBlueprintStats, type BlueprintShipType } from '../../shared/eclipse/blueprints';
import { publicBlueprint } from '../../shared/eclipse/legal';
import { connectionBetween, movableShipCount, validateMovementPath, validateMovementGroup, type MovementShip, type MovementSector, type MovementAbilities } from '../../shared/eclipse/geometry';
import { mapSector, movementAbilities, capacity as actionCapacity } from '../../shared/eclipse/rulesState';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
import {shipClassName} from './shipLabels';
export interface MovementShipOption { id:string; type:BlueprintShipType; label:string; range:number; reason:string|null }
export interface MovementDestination { sectorId:string; command:Extract<GameCommand,{type:'move'}>; activations:number }
export interface MovementPlan { ships:MovementShipOption[]; capacity:number; leaveCapacity:number; destinations:MovementDestination[]; message:string|null }
/** A reversible public route draft. It intentionally contains no hidden state. */
export interface MovementRouteDraft { sourceSectorId:string; shipIds:string[]; destinationSectorId:string; escortsByLeader?:Record<string,string[]> }
export interface MovementRoutePreview {
 draft:MovementRouteDraft; status:'valid'|'rejected'; message:string|null; command:Extract<GameCommand,{type:'move'}>|null; paths:Extract<GameCommand,{type:'move'}>['moves']; activations:number;
}
export interface QueuedMovementPlan { routes:MovementRoutePreview[]; command:Extract<GameCommand,{type:'move'}>; remainingCapacity:number; message:string|null; projectedView:PlayerView; paidShipIds:string[] }
function shortestPath(player:string,shipId:string,target:string,sectors:MovementSector[],ships:MovementShip[],abilities:MovementAbilities,maxActivations:number,neighbors:ReadonlyMap<string,readonly string[]>,escortIds:readonly string[]=[],tollContext?:{view:PlayerView;paidShipIds:readonly string[];money:number}):string[]|null {
 const ship=ships.find(s=>s.id===shipId)!;const queue:string[][]=[[]];const seen=new Set([ship.sectorId]);
 // One BFS visit per sector. Other ships stay fixed during this ship's route,
 // so reaching the same sector by a longer path cannot improve its legality.
 for(let index=0;index<queue.length;index++){const path=queue[index];if(path.length>=ship.movement*maxActivations)continue;
  const currentId=path.at(-1)??ship.sectorId;
  const present=ships.map(s=>s.id===shipId||escortIds.includes(s.id)?{...s,sectorId:currentId}:s);
  for(const sectorId of neighbors.get(currentId)??[]){if(seen.has(sectorId))continue;const next=[...path,sectorId];
   if(tollContext&&guildMovementTolls(tollContext.view,player,[shipId,...escortIds],ship.sectorId,next,tollContext.paidShipIds).length>tollContext.money)continue;
   const request={player,path:[sectorId],sectors,ships:present,abilities};if(!(escortIds.length?validateMovementGroup({...request,shipIds:[shipId,...escortIds]}):validateMovementPath({...request,shipId})).ok)continue;
   if(sectorId===target)return next;seen.add(sectorId);queue.push(next);
  }
 }
 return null;
}
function orders(ids:readonly string[]):string[][] {return ids.length<2?[Array.from(ids)]:ids.flatMap(id=>orders(ids.filter(other=>other!==id)).map(rest=>[id,...rest]));}
/** Public information only. Each planned move relocates its ship before validating the next, matching the authoritative command. */
export function movementPlan(view:PlayerView,sourceSectorId:string|null,selectedShipIds:readonly string[],capacityOverride?:number,escortsByLeader:Readonly<Record<string,readonly string[]>>={},paidShipIds:readonly string[]=view.actionProgress?.guildTollShipIds??[]):MovementPlan {
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;const progress=view.actionProgress;
 const canAct=view.phase==='action'&&view.activeSeatId===seat.id&&!view.pendingDecision&&!view.waitingFor&&!seat.eliminated;
 const availableCapacity=!canAct?0:progress?remainingAction(view,'move'):seat.influenceOnTrack>0?actionCapacity(seat,'move'):0;
 const capacity=capacityOverride===undefined?availableCapacity:Math.max(0,Math.min(capacityOverride,availableCapacity));
 const abilities=movementAbilities(seat);const sectors=view.sectors.map(mapSector);
 const neighbors=new Map(sectors.map(from=>[from.id,sectors.filter(to=>connectionBetween(from,to,abilities.wormholeGenerator)!=='none').map(to=>to.id)]));
 const fleet:MovementShip[]=view.ships.map(ship=>({id:ship.id,owner:ship.owner,sectorId:ship.sectorId,kind:ship.type,doesNotPin:view.seats.find(s=>s.id===ship.owner)?.faction==='spacing-guild',movement:ship.owner===seat.id&&ship.type!=='ancient'&&ship.type!=='guardian'&&ship.type!=='gcds'?deriveBlueprintStats(seat.faction,publicBlueprint(seat.blueprints.find(b=>b.shipType===ship.type)!)).movement:0}));
 const leaveCapacity=sourceSectorId?movableShipCount(seat.id,sourceSectorId,fleet,abilities):0;
 const counters:Partial<Record<BlueprintShipType,number>>={};
 const convoyIds=selectedShipIds.flatMap(id=>escortsByLeader[id]??[]);
 const ships:MovementShipOption[]=fleet.filter(s=>s.owner===seat.id&&s.sectorId===sourceSectorId).map(ship=>{const type=ship.kind as BlueprintShipType;const index=counters[type]=(counters[type]??0)+1;const label=shipClassName(type,seat.faction,view.ships.find(candidate=>candidate.id===ship.id)?.orbitalShip);return {id:ship.id,type,label:`${label} ${index}${view.ships.find(s=>s.id===ship.id)?.factoryPopulation?' · Materials factory':''}`,range:ship.movement,reason:type==='starbase'?`${label}s cannot move.`:ship.movement===0?'No drive: install a drive before moving.':leaveCapacity===0?'Pinned: opposing ships prevent this fleet from leaving.':null};});
 let message:string|null=null;
 if(!capacity)message=canAct?'Finish the current action or free an influence disc before moving.':'Wait for your action turn to move.';
 else if(!sourceSectorId)message='Select a sector containing your ships on the galaxy.';
 else if(!ships.length)message='No friendly ships here. Select a sector containing your fleet.';
 else if(!selectedShipIds.length)message='Select ships, then choose a highlighted destination on the galaxy.';
 else if(selectedShipIds.length>capacity)message=`Only ${capacity} move activations remain.`;
 else if(new Set([...selectedShipIds,...convoyIds]).size!==selectedShipIds.length+convoyIds.length)message='A ship can appear in only one convoy.';
 else if(selectedShipIds.length+convoyIds.length>leaveCapacity)message=`Some ships must remain to pin the enemy; only ${leaveCapacity} can leave.`;
 else if(new Set(selectedShipIds).size!==selectedShipIds.length||selectedShipIds.some(id=>!ships.some(ship=>ship.id===id&&!ship.reason)))message='Select only mobile ships in this sector.';
 if(message)return {ships,capacity,leaveCapacity,destinations:[],message};
 const destinations:MovementDestination[]=[];
 for(const target of sectors){if(target.id===sourceSectorId)continue;
  for(const order of orders(selectedShipIds)){let current=fleet;const moves:Extract<GameCommand,{type:'move'}>['moves']=[];
   let completed=0;
   for(const shipId of order){
    const escortIds=escortsByLeader[shipId]??[];
    const ship=current.find(s=>s.id===shipId)!;
    const escortType=ship.kind==='cruiser'?'interceptor':ship.kind==='dreadnought'?'cruiser':null;
    if(escortIds.length&&(seat.faction!=='formics'||seat.passed||escortIds.length>2||escortIds.some(id=>!current.some(s=>s.id===id&&s.owner===seat.id&&s.sectorId===ship.sectorId&&s.kind===escortType&&s.movement>0))))break;
    const range=Math.min(ship.movement,...escortIds.map(id=>current.find(s=>s.id===id)!.movement));
    // Reserve at least one activation for each other selected ship.
    const available=capacity-moves.length-(order.length-completed-1);
    let spent=0;const paid=[...paidShipIds];const origins=new Map(view.ships.map(s=>[s.id,s.sectorId]));for(const move of moves){const quoted=guildMovementTolls(view,seat.id,[move.shipId,...(move.escorts??[])],origins.get(move.shipId)??'',move.path,paid);spent+=quoted.length;paid.push(...quoted.map(t=>t.shipId));for(const id of [move.shipId,...(move.escorts??[])])origins.set(id,move.path.at(-1)??'');}
    const path=shortestPath(seat.id,shipId,target.id,sectors,current.map(s=>s.id===shipId?{...s,movement:range}:s),abilities,available,neighbors,escortIds,{view,paidShipIds:paid,money:seat.resources.money-spent});if(!path)break;
    let valid=true;
    for(let offset=0;offset<path.length;offset+=range){
     const segment=path.slice(offset,offset+range);
     const request={player:seat.id,path:segment,sectors,ships:current,abilities};if(!(escortIds.length?validateMovementGroup({...request,shipIds:[shipId,...escortIds]}):validateMovementPath({...request,shipId})).ok){valid=false;break;}
     moves.push({shipId,path:segment,...(escortIds.length?{escorts:[...escortIds]}:{})});current=current.map(s=>s.id===shipId||escortIds.includes(s.id)?{...s,sectorId:segment[segment.length-1]}:s);
    }
    if(!valid)break;completed++;
   }
   if(completed===order.length){let fee=0;const paid:string[]=[...paidShipIds];const origins=new Map(view.ships.map(ship=>[ship.id,ship.sectorId]));for(const move of moves){const tolls=guildMovementTolls(view,seat.id,[move.shipId,...(move.escorts??[])],origins.get(move.shipId)??'',move.path,paid);fee+=tolls.reduce((sum,toll)=>sum+toll.amount,0);paid.push(...tolls.map(toll=>toll.shipId));for(const id of [move.shipId,...(move.escorts??[])])origins.set(id,move.path.at(-1)??'');}if(fee>seat.resources.money)continue;destinations.push({sectorId:target.id,command:{type:'move',moves},activations:moves.length});break;}
  }
 }
 return {ships,capacity,leaveCapacity,destinations,message:destinations.length?null:'No shared destination is reachable with the remaining move activations and current wormhole connections. Enemy fleets may stop travel through a sector.'};
}
function projectMoves(view:PlayerView,command:Extract<GameCommand,{type:'move'}>):PlayerView {
 const sectorsByShip=new Map(command.moves.flatMap(move=>[move.shipId,...(move.escorts??[])].map(id=>[id,move.path.at(-1)])).filter((entry):entry is [string,string]=>!!entry[1]));
 return {...view,ships:view.ships.map(ship=>sectorsByShip.has(ship.id)?{...ship,sectorId:sectorsByShip.get(ship.id)!}:ship)};
}
/**
 * Checks each queued route after applying earlier valid routes to a public-only
 * view. Rejected rows remain in the returned list so a reconnect or revision
 * never silently discards the player's intent.
 */
export function queuedMovementPlan(view:PlayerView,routes:readonly MovementRouteDraft[]):QueuedMovementPlan {
 let projected=view;const paid:string[]=[...(view.actionProgress?.guildTollShipIds??[])];let remaining=movementPlan(view,null,[]).capacity;
 const previews:MovementRoutePreview[]=[];const moves:Extract<GameCommand,{type:'move'}>['moves']=[];
 for(const draft of routes){
  const plan=movementPlan(projected,draft.sourceSectorId,draft.shipIds,remaining,draft.escortsByLeader,paid);
  const destination=plan.destinations.find(item=>item.sectorId===draft.destinationSectorId);
  if(!destination){previews.push({draft,status:'rejected',message:plan.message??'That route is no longer legal.',command:null,paths:[],activations:0});continue;}
  previews.push({draft,status:'valid',message:null,command:destination.command,paths:destination.command.moves,activations:destination.activations});
  moves.push(...destination.command.moves);remaining-=destination.activations;let fee=0;const origins=new Map(projected.ships.map(ship=>[ship.id,ship.sectorId]));for(const move of destination.command.moves){const quoted=guildMovementTolls(projected,view.viewerSeatId,[move.shipId,...(move.escorts??[])],origins.get(move.shipId)??'',move.path,paid);fee+=quoted.reduce((sum,toll)=>sum+toll.amount,0);paid.push(...quoted.map(toll=>toll.shipId));for(const id of [move.shipId,...(move.escorts??[])])origins.set(id,move.path.at(-1)??'');}projected=projectMoves({...projected,seats:projected.seats.map(seat=>seat.id===view.viewerSeatId?{...seat,resources:{...seat.resources,money:seat.resources.money-fee}}:seat),...(projected.actionProgress?{actionProgress:{...projected.actionProgress,guildTollShipIds:[...paid]}}:{})},destination.command);
 }
 const rejected=previews.filter(route=>route.status==='rejected');
 return {routes:previews,command:{type:'move',moves},remainingCapacity:remaining,message:rejected.length?`${rejected.length} queued ${rejected.length===1?'route needs':'routes need'} revision.`:null,projectedView:projected,paidShipIds:paid};
}
