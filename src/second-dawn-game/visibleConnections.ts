import {adjacentPosition,connectionBetween,type HexEdge} from '../../shared/eclipse/geometry';
import {mapSector,movementAbilities} from '../../shared/eclipse/rulesState';
import type {SpectatorView,PlayerView,Sector} from '../../shared/eclipse/types';
export interface DisplayedWormhole {edge:HexEdge;kind:'printed'|'wormhole'|'generator'}
/** Normal view shows connections; highlighted/placement tiles also reveal printed openings. */
export function displayedWormholes(view:PlayerView|SpectatorView,sector:Sector,showPrinted=false):DisplayedWormhole[]{
 const mapped={...mapSector(sector),warpPortal:false};
 const printed=new Set(mapped.wormholes.map(edge=>(edge+sector.rotation)%6));
 const seat=view.seats.find(player=>player.id===('viewerSeatId' in view?view.viewerSeatId:undefined));
 const generator=seat?movementAbilities(seat).wormholeGenerator:false;
 return ([0,1,2,3,4,5]as const).flatMap<DisplayedWormhole>(edge=>{
  const position=adjacentPosition(sector.position,edge);
  const neighbor=view.sectors.find(other=>other.position.q===position.q&&other.position.r===position.r);
  const connection=neighbor?connectionBetween(mapped,{...mapSector(neighbor),warpPortal:false},generator):null;
  if(connection==='wormhole'||connection==='generator')return [{edge,kind:connection}];
  return showPrinted&&printed.has(edge)?[{edge,kind:'printed'}]:[];
 });
}
