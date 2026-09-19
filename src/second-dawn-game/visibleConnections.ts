import {adjacentPosition,connectionBetween,type HexEdge} from '../../shared/eclipse/geometry';
import {mapSector,movementAbilities} from '../../shared/eclipse/rulesState';
import type {PlayerView,Sector} from '../../shared/eclipse/types';
export interface DisplayedWormhole {edge:HexEdge;kind:'printed'|'wormhole'|'generator'}
/** Normal view shows connected edges. Placement retains the physical printed openings. */
export function displayedWormholes(view:PlayerView,sector:Sector,showPrinted=false):DisplayedWormhole[]{
 const mapped={...mapSector(sector),warpPortal:false};
 if(showPrinted)return mapped.wormholes.map(edge=>({edge:((edge+sector.rotation)%6)as HexEdge,kind:'printed'}));
 const seat=view.seats.find(player=>player.id===view.viewerSeatId);
 const generator=seat?movementAbilities(seat).wormholeGenerator:false;
 return ([0,1,2,3,4,5]as const).flatMap(edge=>{
  const position=adjacentPosition(sector.position,edge);
  const neighbor=view.sectors.find(other=>other.position.q===position.q&&other.position.r===position.r);
  if(!neighbor)return [];
  const connection=connectionBetween(mapped,{...mapSector(neighbor),warpPortal:false},generator);
  return connection==='wormhole'||connection==='generator'?[{edge,kind:connection}]:[];
 });
}
