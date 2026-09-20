import './hostStartingSeed';
import {finishDispatchedAi} from './aiWorkerTestSupport';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api,internal} from '../../convex/_generated/api';
import type {GameState} from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();vi.setSystemTime(1000);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function fixture(aiCount=1){
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{}),guest=await t.action(api.eclipseGuests.createGuestSession,{});
 const room=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'terran-directorate',settings:{humanSeatCount:2,aiCount,timerMs:30000,warpPortals:true}});
 await t.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:room.roomToken,faction:'hydran'});
 for(const credential of [host,guest])await t.mutation(api.eclipseRooms.setRoomReady,{...credential,roomToken:room.roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});
 await t.run(async ctx=>{const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;state.phase='upkeep';state.activeSeatId='seat-1';state.pendingDecision=null;state.engine!.action=null;state.engine!.decisions=[];state.engine!.upkeepDone=[];for(const seat of state.seats){seat.resources.money=20;seat.passed=true;}await ctx.db.patch(matchId,{phase:'upkeep',snapshotJson:JSON.stringify(state)});});
 await t.mutation(internal.eclipseRooms.syncRoomTimer,{matchId});
 return {t,host,guest,roomToken:room.roomToken,matchId};
}
it('lets another human finish first, preserving everyone’s original upkeep deadline and strict revisions',async()=>{
 const {t,host,guest,matchId}=await fixture(0);
 const before=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});
 expect(before?.multiplayer?.timer).toMatchObject({targetSeatId:'seat-2',upkeepSeatIds:['seat-1','seat-2']});
 vi.setSystemTime(5000);
 const request={...guest,matchId,commandId:'guest-upkeep',expectedRevision:0,command:{type:'finish-upkeep' as const}};
 expect(await t.mutation(api.eclipseMatches.submitCommand,request)).toMatchObject({ok:true});
 expect(await t.mutation(api.eclipseMatches.submitCommand,request)).toMatchObject({ok:true,duplicate:true});
 const own=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});expect(own?.multiplayer?.timer?.deadlineAt).toBe(before?.multiplayer?.timer?.deadlineAt);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'stale-host',expectedRevision:0,command:{type:'finish-upkeep'}})).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'host-upkeep',expectedRevision:1,command:{type:'finish-upkeep'}})).toMatchObject({ok:true});
 expect(await t.query(api.eclipseMatches.getMatchView,{...host,matchId})).toMatchObject({round:2,phase:'action'});
});
it('runs AI upkeep while humans remain unfinished',async()=>{
 const {t,host,matchId}=await fixture();
 await t.mutation(api.eclipseMatches.retryAi,{...host,matchId});
 for(let step=0;step<12;step++){const view=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});if(view?.upkeepDone?.includes('seat-3'))break;await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:view!.revision});await finishDispatchedAi(t);}
 const view=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});expect(view).toMatchObject({phase:'upkeep',upkeepDone:['seat-3']});expect(view!.revision).toBeGreaterThan(0);
});
it('expires all unfinished humans together and completes each without giving the next a fresh clock',async()=>{
 const {t,host,guest,roomToken,matchId}=await fixture(0);
 const original=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 vi.setSystemTime(original!.deadlineAt+1);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'late-upkeep',expectedRevision:0,command:{type:'finish-upkeep'}})).toMatchObject({ok:false,error:{code:'TURN_TIMEOUT'}});
 await t.mutation(internal.eclipseRooms.runRoomTimeout,{roomToken,token:original!.token});await finishDispatchedAi(t);
 const next=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 expect(next).toMatchObject({token:original!.token,deadlineAt:original!.deadlineAt,targetSeatId:'seat-2',upkeepSeatIds:['seat-2']});
 await t.mutation(internal.eclipseRooms.runRoomTimeout,{roomToken,token:original!.token});await finishDispatchedAi(t);
 expect(await t.query(api.eclipseMatches.getMatchView,{...host,matchId})).toMatchObject({round:2,phase:'action',revision:2});
});
it('resolves only the authenticated player’s upkeep choice without consuming another player’s pending choice',async()=>{
 const {t,host,guest,matchId}=await fixture(0);
 await t.run(async ctx=>{const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;state.pendingDecision={id:'host-return',owner:'seat-1',kind:'population-return',count:1,resources:['money']};state.engine!.decisions=[{id:'guest-return',owner:'seat-2',kind:'population-return',count:1,resources:['science']}];await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 await t.mutation(internal.eclipseRooms.syncRoomTimer,{matchId});
 const view=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});expect(view?.pendingDecision?.id).toBe('guest-return');
 const forged={...guest,matchId,commandId:'steal-return',expectedRevision:0,command:{type:'resolve' as const,decisionId:'host-return',choice:{kind:'population-return' as const,resources:['money' as const]}}};
 expect(await t.mutation(api.eclipseMatches.submitCommand,forged)).toMatchObject({ok:false});
 const command={type:'resolve' as const,decisionId:'guest-return',choice:{kind:'population-return' as const,resources:['science' as const]}};
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'own-return',expectedRevision:0,command})).toMatchObject({ok:true});
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.pendingDecision?.id).toBe('host-return');
});
it('migrates an already-running legacy upkeep timer without resetting its original deadline',async()=>{
 const {t,host,matchId}=await fixture(0);
 const original=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 await t.run(ctx=>ctx.db.patch(original!._id,{upkeepRound:undefined,upkeepSeatIds:undefined}));
 vi.setSystemTime(9000);await t.mutation(internal.eclipseRooms.syncRoomTimer,{matchId});
 const view=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});expect(view?.multiplayer?.timer).toMatchObject({deadlineAt:original!.deadlineAt,upkeepRound:1,upkeepSeatIds:['seat-1','seat-2']});
});
it('keeps a paid human’s late population-return obligation on the common clock',async()=>{
 const {t,host,matchId}=await fixture(0);
 const original=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});
 await t.run(async ctx=>{const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;state.engine!.upkeepDone=['seat-1'];state.pendingDecision={id:'paid-return',owner:'seat-1',kind:'population-return',count:1,resources:['money']};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 vi.setSystemTime(12000);await t.mutation(internal.eclipseRooms.syncRoomTimer,{matchId});
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.multiplayer?.timer).toMatchObject({deadlineAt:original?.multiplayer?.timer?.deadlineAt,upkeepSeatIds:['seat-1','seat-2'],targetSeatId:'seat-1'});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'paid-return',expectedRevision:0,command:{type:'resolve',decisionId:'paid-return',choice:{kind:'population-return',resources:['money']}}})).toMatchObject({ok:true});
 const after=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});expect(after?.multiplayer?.timer?.upkeepSeatIds).toEqual(['seat-2']);
});
it('starts a fresh shared deadline when the last pass enters upkeep from action',async()=>{
 const {t,guest,matchId}=await fixture(0);
 await t.run(async ctx=>{
  const row=await ctx.db.get(matchId),state=JSON.parse(row!.snapshotJson) as GameState;state.phase='action';state.activeSeatId='seat-2';state.seats[1].passed=false;state.firstPasser='seat-1';
  await ctx.db.patch(matchId,{phase:'action',snapshotJson:JSON.stringify(state)});
  const timer=await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();await ctx.db.patch(timer!._id,{upkeepRound:undefined,upkeepSeatIds:undefined,targetSeatId:'seat-2'});
 });
 vi.setSystemTime(9000);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'last-pass',expectedRevision:0,command:{type:'pass'}})).toMatchObject({ok:true});
 const view=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});expect(view?.phase).toBe('upkeep');expect(view?.multiplayer?.timer).toMatchObject({deadlineAt:39000,upkeepSeatIds:['seat-1','seat-2']});
});
it('recovers a failed upkeep timeout without extending other human deadlines',async()=>{
 const {t,host,matchId,roomToken}=await fixture(0);
 const timer=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 vi.setSystemTime(timer!.deadlineAt+1);await t.run(ctx=>ctx.db.patch(timer!._id,{status:'failed',error:'Interrupted upkeep worker'}));
 await t.mutation(api.eclipseRooms.retryRoomTimer,{...host,roomToken});await finishDispatchedAi(t);
 const after=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 expect(after).toMatchObject({deadlineAt:timer!.deadlineAt,targetSeatId:'seat-2',upkeepSeatIds:['seat-2'],status:'timed-out',error:null});
});
it('restores shared timer membership and remaining time after an undo is rejected',async()=>{
 const {t,host,guest,matchId}=await fixture(0);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'preference',expectedRevision:0,command:{type:'set-auto-pass',enabled:true}})).toMatchObject({ok:true});
 const before=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});
 vi.setSystemTime(5000);
 const vote=await t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:1,expectedRevision:1});
 vi.setSystemTime(12000);await t.mutation(api.eclipseRollback.respondRollback,{...guest,matchId,rollbackId:vote.pending!.id,approve:false});
 const after=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});
 expect(after?.multiplayer?.timer).toMatchObject({upkeepRound:1,upkeepSeatIds:['seat-1','seat-2'],targetSeatId:'seat-2',status:'active',deadlineAt:before!.multiplayer!.timer!.deadlineAt+7000});
});
