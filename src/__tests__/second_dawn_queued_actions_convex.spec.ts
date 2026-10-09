import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api,internal} from '../../convex/_generated/api';
import type {GameState} from '../../shared/eclipse/types';
import {shouldAutoPass} from '../../shared/eclipse/autoPass';
import {legalCommands} from '../../shared/eclipse/legal';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function fixture(){
 const t=convexTest(schema,modules),guest=await t.action(api.eclipseGuests.createGuestSession,{}),other=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...guest,aiCount:1});
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.activeSeatId='seat-2';state.seats[1].controller='human';const owner=(await ctx.db.query('eclipseOwnershipV1').collect())[0];await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});await ctx.db.insert('eclipseOwnershipV1',{matchId,guestId:(await ctx.db.query('eclipseGuestsV1').collect()).find(g=>g._id!== owner.guestId)!._id,seatId:'seat-2'});});
 return {t,guest,other,matchId};
}
async function multiplayer(){
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{}),visitor=await t.action(api.eclipseGuests.createGuestSession,{});
 const {roomToken}=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'terran-directorate',settings:{humanSeatCount:2,aiCount:0,timerMs:30000,warpPortals:true}});
 await t.mutation(api.eclipseRooms.joinRoom,{...visitor,roomToken,faction:'hydran'});
 for(const guest of [host,visitor])await t.mutation(api.eclipseRooms.setRoomReady,{...guest,roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken});
 return {t,host,visitor,roomToken,matchId};
}
it('privately saves, replaces, cancels and idempotently confirms an off-turn action without spending resources',async()=>{
 const {t,guest,other,matchId}=await fixture(),args={...guest,matchId,expectedRevision:0,commandId:'queue-pass',command:{type:'pass' as const}};
 const before=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});
 const snapshotBefore=(await t.run(ctx=>ctx.db.get(matchId)))!.snapshotJson;
 expect(await t.mutation(api.eclipseMatches.queueCommand,args)).toEqual({ok:true,duplicate:false});
 expect(await t.mutation(api.eclipseMatches.queueCommand,args)).toEqual({ok:true,duplicate:true});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,command:null})).toMatchObject({ok:false,error:{code:'COMMAND_ID_REUSED'}});
 const queued=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});expect(queued?.queuedAction).toMatchObject({command:{type:'pass'},status:'pending'});expect(queued?.revision).toBe(0);expect(queued?.seats).toEqual(before?.seats);
 expect((await t.run(ctx=>ctx.db.get(matchId)))!.snapshotJson).toBe(snapshotBefore);
 expect((await t.query(api.eclipseMatches.getMatchView,{...other,matchId}))?.queuedAction).toBeNull();
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,commandId:'cancel',command:null})).toEqual({ok:true,duplicate:false});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.queuedAction).toBeNull();
 expect(await t.mutation(api.eclipseMatches.queueCommand,args)).toEqual({ok:true,duplicate:true});expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.queuedAction).toBeNull();
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,commandId:'replace'})).toEqual({ok:true,duplicate:false});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,commandId:'replace-again'})).toEqual({ok:true,duplicate:false});
});
it('executes once atomically on a genuine turn handoff and journals using the current revision',async()=>{
 const {t,guest,other,matchId}=await fixture();
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:0,commandId:'next-pass',command:{type:'pass'}})).toMatchObject({ok:true});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...other,matchId,expectedRevision:0,commandId:'other-pass',command:{type:'pass'}})).toMatchObject({ok:true,receipt:{revision:1}});
 const view=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});expect(view?.queuedAction).toBeNull();expect(view?.lastExecutedQueuedCommand).toEqual({revision:2,type:'pass'});expect(view?.revision).toBe(2);expect(view?.seats[0].passed).toBe(true);
 const journal=await t.run(ctx=>ctx.db.query('eclipseJournalV1').withIndex('by_match_revision',q=>q.eq('matchId',matchId)).collect());expect(journal).toHaveLength(2);expect(JSON.parse(journal[1].requestJson)).toMatchObject({expectedRevision:1,command:{type:'pass'}});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(2);
});
it('executes a queued exploration but leaves the drawn-sector choice for its owner',async()=>{
 const {t,guest,other,matchId}=await fixture(),before=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 const projected={...before,activeSeatId:'seat-1',waitingFor:null,pendingDecision:null,actionProgress:null};
 const explore=legalCommands(projected,{perFamilyLimit:1}).find(c=>c.command.type==='explore')!.command;
 const snapshotBefore=(await t.run(ctx=>ctx.db.get(matchId)))!.snapshotJson;
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:0,commandId:'next-explore',command:explore})).toMatchObject({ok:true});expect((await t.run(ctx=>ctx.db.get(matchId)))!.snapshotJson).toBe(snapshotBefore);
 await t.mutation(api.eclipseMatches.submitCommand,{...other,matchId,expectedRevision:0,commandId:'other-pass-before-explore',command:{type:'pass'}});
 const view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;expect(view.lastExecutedQueuedCommand).toEqual({revision:2,type:'explore'});expect(view.queuedAction).toBeNull();expect(view.pendingDecision?.kind).toBe('exploration');expect(view.actionProgress?.action).toBe('explore');expect(view.revision).toBe(2);
 expect((await t.query(api.eclipseMatches.getMatchView,{...other,matchId}))?.pendingDecision).toBeNull();
});
it('revalidates a changed target without spending resources or substituting a different action',async()=>{
 const {t,guest,other,matchId}=await fixture(),view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!,sector=view.sectors.find(s=>s.owner==='seat-1')!;
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:0,commandId:'next-build',command:{type:'build',builds:[{sectorId:sector.id,component:'interceptor'}]}})).toMatchObject({ok:true});
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.sectors.find(s=>s.id===sector.id)!.owner='seat-2';await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...other,matchId,expectedRevision:0,commandId:'other-pass',command:{type:'pass'}})).toMatchObject({ok:true});
 const changed=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});expect(changed?.queuedAction).toMatchObject({status:'failed',command:{type:'build'}});expect(changed?.queuedAction?.error).toBeTruthy();expect(changed?.revision).toBe(1);expect(changed?.seats[0].resources).toEqual(view.seats[0].resources);expect(changed?.seats[0].influenceOnTrack).toBe(view.seats[0].influenceOnTrack);expect(changed?.activeSeatId).toBe('seat-1');
});
it('rejects unauthorized, stale, illegal and decision-specific queues',async()=>{
 const {t,guest,matchId}=await fixture(),stranger=await t.action(api.eclipseGuests.createGuestSession,{}),args={...guest,matchId,expectedRevision:0,commandId:'invalid',command:{type:'pass' as const}};
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,...stranger})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,expectedRevision:5})).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,command:{type:'end-action'}})).toMatchObject({ok:false,error:{code:'ILLEGAL_ACTION'}});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...args,command:{type:'build',builds:[{sectorId:'missing',component:'interceptor'}]}})).toMatchObject({ok:false});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.queuedAction).toBeNull();
});
it('does not auto-answer an outstanding decision or reuse another unfinished action',async()=>{
 const {t,guest,matchId}=await fixture();
 await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:0,commandId:'wait-pass',command:{type:'pass'}});
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.activeSeatId='seat-1';state.pendingDecision={id:'reputation-choice',kind:'reputation',owner:'seat-1',drawn:[2],capacity:4};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});
 let view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;expect(view.queuedAction?.status).toBe('pending');expect(view.pendingDecision?.id).toBe('reputation-choice');expect(view.revision).toBe(0);
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.pendingDecision=null;state.engine!.action={owner:'seat-1',action:'build',remaining:1};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;expect(view.queuedAction?.status).toBe('pending');expect(view.actionProgress?.action).toBe('build');expect(view.revision).toBe(0);
});
it('requires an owned pending decision to be answered before confirming a next action',async()=>{
 const {t,guest,matchId}=await fixture();
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.pendingDecision={id:'owned-choice',kind:'reputation',owner:'seat-1',drawn:[2],capacity:4};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:0,commandId:'during-choice',command:{type:'pass'}})).toMatchObject({ok:false,error:{code:'DECISION_PENDING'}});
});
it('pauses automatic passing for the queued reaction while preserving the next-round preference',async()=>{
 const {t,guest,other,matchId}=await fixture();
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.seats[0].passed=true;state.seats[0].autoPassUnlessAttacked=true;state.seats[1].resources.materials=10;state.firstPasser='seat-1';await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 const view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!,sector=view.sectors.find(s=>s.owner==='seat-1')!;
 const request={...guest,matchId,expectedRevision:0,commandId:'reaction-build',command:{type:'build' as const,builds:[{sectorId:sector.id,component:'interceptor' as const}]}};
 expect(await t.mutation(api.eclipseMatches.queueCommand,request)).toMatchObject({ok:true});expect(await t.mutation(api.eclipseMatches.queueCommand,request)).toMatchObject({ok:true,duplicate:true});
 let state=await t.run(async ctx=>JSON.parse((await ctx.db.get(matchId))!.snapshotJson) as GameState);expect(state.seats[0].autoPassUnlessAttacked).toBe(true);expect(state.seats[0].autoPassPausedRound).toBe(state.round);expect(shouldAutoPass({...state,round:state.round+1},state.seats[0])).toBe(true);
 let otherView=(await t.query(api.eclipseMatches.getMatchView,{...other,matchId}))!;const build=legalCommands(otherView,{perFamilyLimit:1}).find(c=>c.command.type==='build')!.command;
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...other,matchId,expectedRevision:otherView.revision,commandId:'other-build',command:build})).toMatchObject({ok:true});
 otherView=(await t.query(api.eclipseMatches.getMatchView,{...other,matchId}))!;
 if(otherView.activeSeatId==='seat-2')expect(await t.mutation(api.eclipseMatches.submitCommand,{...other,matchId,expectedRevision:otherView.revision,commandId:'other-finish',command:{type:'end-action'}})).toMatchObject({ok:true});
 const after=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;expect(after.queuedAction).toBeNull();expect(after.lastExecutedQueuedCommand?.type).toBe('build');expect(after.ships.filter(s=>s.owner==='seat-1')).toHaveLength(view.ships.filter(s=>s.owner==='seat-1').length+1);
 state=await t.run(async ctx=>JSON.parse((await ctx.db.get(matchId))!.snapshotJson) as GameState);expect(state.seats[0].autoPassUnlessAttacked).toBe(true);
});
it('expires a queued action across round boundaries and clears it on resignation',async()=>{
 const {t,guest,matchId}=await fixture();await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:0,commandId:'expire-pass',command:{type:'pass'}});
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.round++;state.activeSeatId='seat-1';await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state),round:state.round});});
 await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.queuedAction).toMatchObject({status:'failed'});expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(0);
 expect(await t.mutation(api.eclipseMatches.resignMatch,{...guest,matchId,expectedRevision:0,commandId:'expire-pass'})).toMatchObject({ok:false,error:{code:'COMMAND_ID_REUSED'}});
 expect(await t.mutation(api.eclipseMatches.resignMatch,{...guest,matchId,expectedRevision:0,commandId:'resign-queued'})).toMatchObject({ok:true});expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.queuedAction).toBeNull();
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...guest,matchId,expectedRevision:1,commandId:'after-resign',command:{type:'pass'}})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
});
it('executes a confirmed action when timeout AI hands control back to its human owner',async()=>{
 const {t,host,visitor,roomToken,matchId}=await multiplayer();
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...visitor,matchId,expectedRevision:0,commandId:'after-timeout-pass',command:{type:'pass'}})).toMatchObject({ok:true});
 const timer=await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 await t.run(ctx=>ctx.db.patch(timer!._id,{deadlineAt:0}));
 await t.mutation(internal.eclipseRooms.runRoomTimeout,{roomToken,token:timer!.token});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
 const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:0,leaseToken:job!.leaseToken!,command:{type:'pass'},elapsedMs:1});
 const view=(await t.query(api.eclipseMatches.getMatchView,{...visitor,matchId}))!;expect(view.queuedAction).toBeNull();expect(view.lastExecutedQueuedCommand).toEqual({revision:2,type:'pass'});expect(view.seats[0].controller).toBe('human');expect(view.seats[1].controller).toBe('human');
 const history=await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId});expect(history?.entries.some(entry=>entry.summary.startsWith('AI takeover'))).toBe(true);
});
it('clears queued intent when a shared rollback is applied and does not replay an old confirmation',async()=>{
 const {t,host,visitor,matchId}=await multiplayer();
 await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,expectedRevision:0,commandId:'before-undo-pass',command:{type:'pass'}});
 const request={...host,matchId,expectedRevision:1,commandId:'undo-queued-pass',command:{type:'pass' as const}};
 await t.mutation(api.eclipseMatches.queueCommand,request);
 const undo=await t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,expectedRevision:1,targetRevision:1});
 expect(await t.mutation(api.eclipseMatches.queueCommand,{...request,commandId:'during-undo',command:null})).toMatchObject({ok:false,error:{code:'ILLEGAL_ACTION'}});
 await t.mutation(api.eclipseRollback.respondRollback,{...visitor,matchId,rollbackId:undo.pending!.id,approve:true});
 const view=(await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))!;expect(view.queuedAction).toBeNull();expect(view.lastExecutedQueuedCommand).toBeUndefined();expect(view.activeSeatId).toBe('seat-1');
 expect(await t.mutation(api.eclipseMatches.queueCommand,request)).toMatchObject({ok:true,duplicate:true});expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.queuedAction).toBeNull();
});
