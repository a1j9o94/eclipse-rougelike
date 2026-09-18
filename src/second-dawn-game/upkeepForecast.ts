import type {PlayerView} from '../../shared/eclipse/types';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from '../../shared/eclipse/tracks';
export function upkeepForecast(view:PlayerView){
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const money=seat.resources.money,income=incomeForPopulationAway(seat.populationTracks.money);
 const upkeep=upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack));
 const nextUpkeep=seat.influenceOnTrack>0?upkeepForEmptyInfluenceSlots(Math.min(13,Math.max(0,14-seat.influenceOnTrack))):null;
 return {money,income,upkeep,balance:money+income-upkeep,nextUpkeep,nextBalance:nextUpkeep===null?null:money+income-nextUpkeep};
}
