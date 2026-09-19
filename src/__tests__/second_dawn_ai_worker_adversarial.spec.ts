import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api,internal} from '../../convex/_generated/api';
import type {GameState} from '../../shared/eclipse/types';
import {finishDispatchedAi} from './aiWorkerTestSupport';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();vi.setSystemTime(1000);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function timeoutRoom(){
 const t=convexTest(schema,modules);const host=await t.action(api.eclipseGuests.createGuestSession,{});const guest=await t.action(api.eclipseGuests.createGuestSession,{});
 const room=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'hydran',settings:{humanSeatCount:2,aiCount:0,timerMs:30_000,warpPortals:true}});
 await t.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:room.roomToken,faction:'eridani'});
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:room.roomToken,ready:true});await t.mutation(api.eclipseRooms.setRoomReady,{...guest,roomToken:room.roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});
 const timer=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 vi.setSystemTime(timer!.deadlineAt+1);await t.mutation(internal.eclipseRooms.runRoomTimeout,{roomToken:room.roomToken,token:timer!.token});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
 const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 return {t,host,guest,room,matchId,timer:timer!,job:job!};
}
it('recovers failed takeover through the general AI paused retry endpoint without losing its timer',async()=>{
 const {t,host,matchId,timer,job}=await timeoutRoom();
 await t.mutation(internal.eclipseMatches.failAiWork,{matchId,expectedRevision:0,leaseToken:job.leaseToken!,error:'Interrupted search'});
 await t.mutation(api.eclipseMatches.retryAi,{...host,matchId});
 const after=await t.run(ctx=>ctx.db.get(timer._id));expect(after?.status).toBe('timed-out');expect(after?.token).toBe(timer.token);expect(after?.deadlineAt).toBe(timer.deadlineAt);
 vi.advanceTimersByTime(1200);await t.finishInProgressScheduledFunctions();await finishDispatchedAi(t);
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.revision).toBe(1);
});
it('reschedules takeover after another human commits an off-turn reputation discard',async()=>{
 const {t,guest,matchId,timer,job}=await timeoutRoom();
 await t.run(async ctx=>{const match=await ctx.db.get(matchId);const state=JSON.parse(match!.snapshotJson) as GameState;state.privateSeats.find(seat=>seat.seatId==='seat-2')!.reputation=[2];await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 const result=await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'off-turn',expectedRevision:0,command:{type:'discard-reputation',values:[2]}});
 expect(result.ok).toBe(true);
 const next=await t.run(ctx=>ctx.db.get(job._id));expect(next).toMatchObject({status:'scheduled',expectedRevision:1,timeoutToken:timer.token,remainingBudgetMs:0});
 await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:0,leaseToken:job.leaseToken!,command:{type:'pass'},elapsedMs:1});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});await finishDispatchedAi(t);
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(2);
 expect((await t.run(ctx=>ctx.db.get(timer._id)))?.status).not.toBe('failed');
});
it.each(['ai:seat-2:1','timeout:seat-1:1'])('rejects public preseeding of reserved worker id %s',async commandId=>{
 const t=convexTest(schema,modules);const guest=await t.action(api.eclipseGuests.createGuestSession,{});const {matchId}=await t.mutation(api.eclipseMatches.createMatch,guest);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId,expectedRevision:0,command:{type:'pass'}})).toMatchObject({ok:false,error:{code:'INVALID_COMMAND',field:'commandId'}});
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(0);
});
it('detects a previously poisoned worker id without inserting a duplicate journal row',async()=>{
 const t=convexTest(schema,modules);const guest=await t.action(api.eclipseGuests.createGuestSession,{});const {matchId}=await t.mutation(api.eclipseMatches.createMatch,guest);
 await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'old-human-command',expectedRevision:0,command:{type:'pass'}});
 await t.run(async ctx=>{const row=await ctx.db.query('eclipseJournalV1').withIndex('by_match_command',q=>q.eq('matchId',matchId).eq('commandId','old-human-command')).unique();await ctx.db.patch(row!._id,{commandId:'ai:seat-2:1'});});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});await finishDispatchedAi(t);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.aiStatus?.status).toBe('failed');
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(1);
 expect(await t.run(ctx=>ctx.db.query('eclipseJournalV1').withIndex('by_match_command',q=>q.eq('matchId',matchId).eq('commandId','ai:seat-2:1')).collect())).toHaveLength(1);
});

it('preserves duplicate receipts for legacy accepted human commands with a now-reserved ID',async()=>{
 const t=convexTest(schema,modules);const guest=await t.action(api.eclipseGuests.createGuestSession,{});const {matchId}=await t.mutation(api.eclipseMatches.createMatch,guest);
 await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'legacy-id',expectedRevision:0,command:{type:'pass'}});
 await t.run(async ctx=>{const row=await ctx.db.query('eclipseJournalV1').withIndex('by_match_command',q=>q.eq('matchId',matchId).eq('commandId','legacy-id')).unique();await ctx.db.patch(row!._id,{commandId:'ai:legacy',requestJson:JSON.stringify({commandId:'ai:legacy',expectedRevision:0,command:{type:'pass'}})});});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'ai:legacy',expectedRevision:0,command:{type:'pass'}})).toMatchObject({ok:true,duplicate:true});
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(1);
});
