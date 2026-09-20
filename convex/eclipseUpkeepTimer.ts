import type {Doc} from './_generated/dataModel';
import type {MutationCtx} from './_generated/server';
import {internal} from './_generated/api';
import type {GameState,Seat} from '../shared/eclipse/types';
import {upkeepDecisionForSeat,upkeepSeatUnfinished} from '../shared/eclipse/upkeep';
import {timerTargetForState,type MultiplayerTimerTarget} from '../shared/eclipse/multiplayer';

/** A paid seat can still owe a population return caused by another elimination. */
export function upkeepParticipants(state:GameState):Seat[]{
 return state.phase==='upkeep'?state.seats.filter(seat=>!seat.eliminated&&(upkeepSeatUnfinished(state,seat.id)||upkeepDecisionForSeat(state,seat.id))):[];
}
export function workerActor(state:GameState,timeoutActor?:string):string|null {
 if(state.phase!=='upkeep')return state.pendingDecision?.owner??state.activeSeatId;
 const remaining=upkeepParticipants(state);
 return remaining.find(seat=>seat.id===timeoutActor)?.id??remaining.find(seat=>seat.controller==='ai')?.id??remaining[0]?.id??null;
}
export function roomTimerTarget(state:GameState,timer:Doc<'eclipseRoomTimersV1'>):MultiplayerTimerTarget|null {
 if(state.phase!=='upkeep')return timerTargetForState(state);
 const humans=upkeepParticipants(state).filter(seat=>seat.controller==='human');
 const seat=humans.find(seat=>seat.id===timer.targetSeatId)??humans[0];
 return seat?{seatId:seat.id,decisionId:upkeepDecisionForSeat(state,seat.id)?.id??null}:null;
}
/** One original deadline for all human upkeep choices; processing order never extends it. */
export async function synchronizeUpkeepTimer(ctx:MutationCtx,room:Doc<'eclipseRoomsV1'>,match:Doc<'eclipseMatchesV1'>,state:GameState,current:Doc<'eclipseRoomTimersV1'>|null,newToken:()=>string):Promise<boolean>{
 if(state.phase!=='upkeep')return false;
 const humans=upkeepParticipants(state).filter(seat=>seat.controller==='human');
 if(room.humanSeatCount===1){if(current)await ctx.db.delete(current._id);return true;}
 if(!humans.length){if(current)await ctx.db.patch(current._id,{status:'finished',upkeepSeatIds:[],error:null,updatedAt:Date.now()});return true;}
 // A stored upkeep snapshot with its former singleton clock can migrate in
 // place. On a fresh combat → upkeep commit, match.phase is the prior phase,
 // so its earlier action clock is never inherited.
 const legacyUpkeep=!!current&&current.upkeepRound===undefined&&match.phase==='upkeep'&&current.status!=='finished'&&(current.actionTurnSerial??0)===(state.actionTurnSerial??0)&&humans.some(seat=>seat.id===current.targetSeatId);
 const sameRound=current?.upkeepRound===state.round||legacyUpkeep;
 const target=humans.find(seat=>sameRound&&seat.id===current?.targetSeatId)??humans[0];
 const sameTarget=sameRound&&current?.targetSeatId===target.id;
 const token=sameRound?current.token:newToken(),deadlineAt=sameRound?current.deadlineAt:Date.now()+room.timerMs;
 const status=sameTarget&&current.status!=='finished'?current.status:deadlineAt<=Date.now()?'timed-out' as const:'active' as const;
 const patch={token,deadlineAt,targetSeatId:target.id,decisionId:upkeepDecisionForSeat(state,target.id)?.id??null,upkeepRound:state.round,upkeepSeatIds:humans.map(seat=>seat.id),actionTurnSerial:state.actionTurnSerial??0,status,error:sameTarget?current!.error:null,timeoutSteps:sameTarget?current!.timeoutSteps:0,updatedAt:Date.now()};
 if(current)await ctx.db.patch(current._id,patch);else await ctx.db.insert('eclipseRoomTimersV1',{roomId:room._id,matchId:match._id,...patch});
 if(!sameRound||!sameTarget)await ctx.scheduler.runAfter(Math.max(0,deadlineAt-Date.now()),internal.eclipseRooms.runRoomTimeout,{roomToken:room.roomToken,token});
 return true;
}
