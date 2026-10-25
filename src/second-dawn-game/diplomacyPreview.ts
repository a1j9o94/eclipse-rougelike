import { getFaction } from '../../shared/eclipse/catalog';
import { reputationCapacity } from '../../shared/eclipse/battleEngine';
import { connectionBetween } from '../../shared/eclipse/geometry';
import { hasEmptyAmbassadorSpace } from '../../shared/eclipse/minorSpecies';
import { mapSector } from '../../shared/eclipse/rulesState';
import type { PlayerView, Seat } from '../../shared/eclipse/types';

/** Explanations use only public state and the viewer's own rack count. */
export function diplomacyOfferIssue(view:PlayerView,seat:Seat,other:Seat):string|null {
 if(view.seats.length<4)return 'Ambassador exchanges require at least four players.';
 if(view.pendingDecision)return 'Finish the current decision before offering ambassadors.';
 if(view.phase!=='action'||view.activeSeatId!==seat.id)return 'Wait for your action turn.';
 if(seat.eliminated||other.eliminated)return 'An eliminated civilization cannot exchange ambassadors.';
 if(seat.ambassadors.includes(other.id))return 'Ambassadors already exchanged.';
 if(seat.traitor||other.traitor)return `${getFaction(seat.traitor?seat.faction:other.faction).name} holds the Traitor tile.`;
 for(const participant of [seat,other]){
  const label=participant.id===seat.id?'You':getFaction(participant.faction).name;
  if(!hasEmptyAmbassadorSpace(participant))return `${label} have no free ambassador space.`;
  if(participant.ambassadors.length>=getFaction(participant.faction).capabilities.ambassadorSupply)return `${label} have no ambassador tile available.`;
  const retained=participant.id===view.viewerSeatId&&view.private.seatId===participant.id?view.private.reputation.length:view.hiddenTileCounts.find(item=>item.seatId===participant.id)?.reputation??0;
  if(retained>reputationCapacity({...participant,ambassadors:[...participant.ambassadors,participant.id===seat.id?other.id:seat.id]}))return `${label} must return a reputation tile to free a rack space.`;
  if(!Object.values(participant.populationTracks).some(value=>value<11))return `${label} have no population cube available.`;
 }
 if(!view.sectors.some(a=>a.owner===seat.id&&view.sectors.some(b=>b.owner===other.id&&connectionBetween(mapSector(a),mapSector(b))!=='none')))return 'Your controlled sectors need a complete wormhole or warp connection.';
 if(view.ships.some(ship=>(ship.owner===seat.id||ship.owner===other.id)&&view.sectors.some(sector=>sector.id===ship.sectorId&&(sector.owner===(ship.owner===seat.id?other.id:seat.id)||view.ships.some(enemy=>enemy.sectorId===sector.id&&enemy.owner===(ship.owner===seat.id?other.id:seat.id))))))return 'Move your fleets out of shared or partner-controlled sectors before offering ambassadors.';
 return null;
}
