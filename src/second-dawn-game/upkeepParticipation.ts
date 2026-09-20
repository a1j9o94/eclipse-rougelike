import type {PlayerView} from '../../shared/eclipse/types';
export function needsUpkeep(view:PlayerView,seatId=view.viewerSeatId):boolean{
 const seat=view.seats.find(candidate=>candidate.id===seatId);
 return view.phase==='upkeep'&&!!seat&&!seat.eliminated&&(view.upkeepDone!==undefined?!view.upkeepDone.includes(seatId):view.activeSeatId===seatId);
}
export function upkeepReadyCount(view:PlayerView):string{
 const living=view.seats.filter(seat=>!seat.eliminated);
 return `${living.filter(seat=>view.upkeepDone?.includes(seat.id)).length} / ${living.length} ready`;
}
