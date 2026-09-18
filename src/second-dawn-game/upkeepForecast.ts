import type {PlayerView} from '../../shared/eclipse/types';
import {incomeForPopulationAway,upkeepForEmptyInfluenceSlots} from '../../shared/eclipse/tracks';
export interface UpkeepForecast {
 money:number;
 income:number;
 upkeep:number;
 balance:number;
 nextUpkeep:number|null;
 nextBalance:number|null;
 influenceDiscs:number;
 passed:boolean;
 eliminated:boolean;
}

export type AffordableActionStatus='affordable'|'unfunded'|'no-discs'|'passed'|'eliminated';
export interface AffordableActionCapacity {
 status:AffordableActionStatus;
 actions:number;
 shortfall:number;
 nextUpkeep:number|null;
 nextBalance:number|null;
}

/**
 * Explains how many additional ordinary action discs the current round-end
 * economy can cover. It never decides whether an action is legal.
 */
export function affordableActionCapacity(forecast:UpkeepForecast):AffordableActionCapacity {
 if(forecast.eliminated)return {status:'eliminated',actions:0,shortfall:Math.max(0,-forecast.balance),nextUpkeep:null,nextBalance:null};
 if(forecast.passed)return {status:'passed',actions:0,shortfall:Math.max(0,-forecast.balance),nextUpkeep:null,nextBalance:null};
 if(forecast.balance<0)return {status:'unfunded',actions:0,shortfall:-forecast.balance,nextUpkeep:forecast.nextUpkeep,nextBalance:forecast.nextBalance};
 if(forecast.influenceDiscs===0)return {status:'no-discs',actions:0,shortfall:0,nextUpkeep:null,nextBalance:null};
 let actions=0,nextUpkeep=forecast.nextUpkeep,nextBalance=forecast.nextBalance;
 for(let discs=forecast.influenceDiscs;discs>0&&nextBalance!==null&&nextBalance>=0;discs--){
  actions++;
  const emptySlots=Math.min(13,14-(discs-1));
  nextUpkeep=discs===1?null:upkeepForEmptyInfluenceSlots(emptySlots);
  nextBalance=nextUpkeep===null?null:forecast.money+forecast.income-nextUpkeep;
 }
 return {status:'affordable',actions,shortfall:0,nextUpkeep:forecast.nextUpkeep,nextBalance:forecast.nextBalance};
}

export function upkeepForecast(view:PlayerView):UpkeepForecast {
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const money=seat.resources.money,income=incomeForPopulationAway(seat.populationTracks.money);
 const upkeep=upkeepForEmptyInfluenceSlots(Math.max(0,13-seat.influenceOnTrack));
 const nextUpkeep=seat.influenceOnTrack>0?upkeepForEmptyInfluenceSlots(Math.min(13,Math.max(0,14-seat.influenceOnTrack))):null;
 return {money,income,upkeep,balance:money+income-upkeep,nextUpkeep,nextBalance:nextUpkeep===null?null:money+income-nextUpkeep,influenceDiscs:seat.influenceOnTrack,passed:seat.passed,eliminated:seat.eliminated};
}

/** Builds the same explanatory forecast for a locally projected draft. */
export function upkeepForecastAfter({money,income,influenceDiscs,passed,eliminated}:{money:number;income:number;influenceDiscs:number;passed:boolean;eliminated:boolean}):UpkeepForecast {
 const discs=Math.max(0,influenceDiscs);
 const upkeep=upkeepForEmptyInfluenceSlots(Math.min(13,Math.max(0,13-discs)));
 const nextUpkeep=discs>0?upkeepForEmptyInfluenceSlots(Math.min(13,14-discs)):null;
 return {money,income,upkeep,balance:money+income-upkeep,nextUpkeep,nextBalance:nextUpkeep===null?null:money+income-nextUpkeep,influenceDiscs:discs,passed,eliminated};
}
