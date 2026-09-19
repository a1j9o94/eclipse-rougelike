import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api,internal} from '../../convex/_generated/api';
import type {GameState} from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();vi.setSystemTime(1000);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function room(){
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{}),guest=await t.action(api.eclipseGuests.createGuestSession,{});
 const created=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'hydran',settings:{humanSeatCount:2,aiCount:0,timerMs:30_000,warpPortals:true}});
 await t.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:created.roomToken,faction:'eridani'});
 for(const player of[host,guest])await t.mutation(api.eclipseRooms.setRoomReady,{...player,roomToken:created.roomToken,ready:true});
 const{matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:created.roomToken});
 const timer=()=>t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 return{t,host,guest,matchId,timer};
}
it('refreshes the same human owner’s timer after a completed action skips every other seat',async()=>{
 const{t,host,guest,matchId,timer}=await room(),before=(await timer())!;
 await t.run(async ctx=>{const match=await ctx.db.get(matchId),state=JSON.parse(match!.snapshotJson) as GameState;state.seats[1].passed=true;state.seats[1].autoPassUnlessAttacked=true;state.firstPasser='seat-2';state.engine!.action={owner:'seat-1',action:'build',remaining:1};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 vi.setSystemTime(9000);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'finish-and-wrap',expectedRevision:0,command:{type:'end-action'}})).toMatchObject({ok:true});
 const after=(await timer())!;
 expect(after).toMatchObject({targetSeatId:'seat-1',status:'active',deadlineAt:39_000});expect(after.token).not.toBe(before.token);
 vi.setSystemTime(10_000);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'off-turn-preference',expectedRevision:1,command:{type:'set-auto-pass',enabled:false}})).toMatchObject({ok:true});
 expect(await timer()).toMatchObject({token:after.token,deadlineAt:after.deadlineAt});
 await t.mutation(internal.eclipseRooms.runRoomTimeout,{roomToken:(await t.run(ctx=>ctx.db.get(matchId)))!.roomToken!,token:before.token});
 expect(await timer()).toMatchObject({token:after.token,status:'active'});
});
it('recovery timer sync recognizes a new same-owner turn, and later same-turn revisions retain its deadline',async()=>{
 const{t,matchId,timer}=await room(),before=(await timer())!;
 await t.run(async ctx=>{const match=await ctx.db.get(matchId),state=JSON.parse(match!.snapshotJson) as GameState;state.actionTurnSerial=(state.actionTurnSerial??0)+2;state.revision++;await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state),revision:state.revision});});
 vi.setSystemTime(9000);await t.mutation(internal.eclipseRooms.syncRoomTimer,{matchId});
 const after=(await timer())!;expect(after.deadlineAt).toBe(39_000);expect(after.token).not.toBe(before.token);
 vi.setSystemTime(12_000);await t.mutation(internal.eclipseRooms.syncRoomTimer,{matchId});
 expect(await timer()).toMatchObject({token:after.token,deadlineAt:after.deadlineAt});
});
it('renews the AI search budget for a new same-actor turn but preserves it for off-turn preferences',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const{matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1,aiDifficulty:'expert'});
 await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'first-pass',expectedRevision:0,command:{type:'pass'}});
 const getJob=()=>t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 await t.run(async ctx=>{const match=await ctx.db.get(matchId),state=JSON.parse(match!.snapshotJson) as GameState;state.seats[0].autoPassUnlessAttacked=true;state.engine!.action={owner:'seat-2',action:'build',remaining:1};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});const job=await ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();await ctx.db.patch(job!._id,{remainingBudgetMs:123});});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});const lease=(await getJob())!;
 await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:1,leaseToken:lease.leaseToken!,command:{type:'end-action'},elapsedMs:100});
 expect(await getJob()).toMatchObject({status:'scheduled',budgetActor:'seat-2',remainingBudgetMs:30_000,expectedRevision:2});
 const refreshed=(await getJob())!;await t.run(ctx=>ctx.db.patch(refreshed._id,{remainingBudgetMs:321}));
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'preference-only',expectedRevision:2,command:{type:'set-auto-pass',enabled:false}})).toMatchObject({ok:true});
 expect(await getJob()).toMatchObject({status:'scheduled',remainingBudgetMs:321,expectedRevision:3});
});
it('ends timeout takeover when skipped seats return a fresh turn to the same human',async()=>{
 const{t,matchId,timer}=await room();
 await t.run(async ctx=>{const match=await ctx.db.get(matchId),state=JSON.parse(match!.snapshotJson) as GameState;state.seats[1].passed=true;state.seats[1].autoPassUnlessAttacked=true;state.firstPasser='seat-2';state.engine!.action={owner:'seat-1',action:'build',remaining:1};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 const before=(await timer())!;vi.setSystemTime(before.deadlineAt+1);
 const roomToken=(await t.run(ctx=>ctx.db.get(matchId)))!.roomToken!;
 await t.mutation(internal.eclipseRooms.runRoomTimeout,{roomToken,token:before.token});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
 const job=(await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique()))!;
 await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:0,leaseToken:job.leaseToken!,command:{type:'end-action'},elapsedMs:25});
 const after=(await timer())!;expect(after).toMatchObject({targetSeatId:'seat-1',status:'active',deadlineAt:Date.now()+30_000});expect(after.token).not.toBe(before.token);
 expect(await t.run(ctx=>ctx.db.get(job._id))).toMatchObject({status:'waiting'});
 expect((await t.run(ctx=>ctx.db.get(job._id)))?.timeoutToken).toBeUndefined();
});
it('renews an AI budget when a human resolves the last required decision of that AI action',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const{matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1,aiDifficulty:'expert'});
 await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'first-pass',expectedRevision:0,command:{type:'pass'}});
 await t.run(async ctx=>{const match=await ctx.db.get(matchId),state=JSON.parse(match!.snapshotJson) as GameState;state.seats[0].autoPassUnlessAttacked=true;state.engine!.action={owner:'seat-2',action:'influence',remaining:0};state.pendingDecision={id:'human-choice',owner:'seat-1',kind:'discovery',tileId:'money',options:['keep','use']};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});const job=await ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();await ctx.db.patch(job!._id,{status:'waiting',remainingBudgetMs:17});});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'finish-ai-choice',expectedRevision:1,command:{type:'resolve',decisionId:'human-choice',choice:{kind:'discovery',option:'keep'}}})).toMatchObject({ok:true});
 expect(await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique())).toMatchObject({status:'scheduled',budgetActor:'seat-2',remainingBudgetMs:30_000});
});
