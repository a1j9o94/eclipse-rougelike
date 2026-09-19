import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import type {GameState} from '../../shared/eclipse/types';
import { api, internal } from '../../convex/_generated/api';
const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
async function setup() {
 const t=convexTest(schema,modules);
 const guest=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...guest,aiCount:1,aiDifficulty:'expert'});
 await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'pass',expectedRevision:0,command:{type:'pass'}});
 return {t,guest,matchId};
}
describe('durable bounded strategic AI worker',()=>{
 it('pins difficulty and claims one lease without doing search in a mutation',async()=>{
  const {t,guest,matchId}=await setup();
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});
  const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  expect(job).toMatchObject({status:'thinking',remainingBudgetMs:30_000});
  expect(job?.leaseToken).toBeTruthy();
  expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.aiDifficulty).toBe('expert');
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});
  const jobs=await t.run(ctx=>ctx.db.system.query('_scheduled_functions').collect());
  expect(jobs.filter(j=>j.name==='eclipseMatches:thinkAi')).toHaveLength(1);
 });
 it('rejects stale leases and never exposes hidden state to the search worker',async()=>{
  const {t,matchId}=await setup();
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});
  const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  const work=await t.query(internal.eclipseMatches.getAiWork,{matchId,expectedRevision:1,leaseToken:job!.leaseToken!});
  expect(work?.view).not.toHaveProperty('rng');
  expect(work?.view).not.toHaveProperty('decks');
  expect(await t.query(internal.eclipseMatches.getAiWork,{matchId,expectedRevision:1,leaseToken:'obsolete'})).toBeNull();
  await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:1,leaseToken:'obsolete',command:{type:'pass'},elapsedMs:300});
  expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(1);
 });
 it('charges chained commands to one action budget and duplicate commits do nothing',async()=>{
  const {t,matchId}=await setup();
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});
  const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  const work=await t.query(internal.eclipseMatches.getAiWork,{matchId,expectedRevision:1,leaseToken:job!.leaseToken!});
  const {legalCommands}=await import('../../shared/eclipse/legal');
  const command=legalCommands(work!.view).find(c=>c.command.type==='explore')?.command;
  expect(command).toBeTruthy();
  const args={matchId,expectedRevision:1,leaseToken:job!.leaseToken!,command:command!,elapsedMs:1500};
  await t.mutation(internal.eclipseMatches.commitAiWork,args);
  await t.mutation(internal.eclipseMatches.commitAiWork,args);
  const after=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  expect(after).toMatchObject({expectedRevision:2,remainingBudgetMs:28_500});
 });
 it('expires interrupted work visibly and preserves the spent budget on retry',async()=>{
  const {t,guest,matchId}=await setup();
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});
  const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  // An active worker cannot be restarted repeatedly by the retry endpoint.
  await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});
  expect((await t.run(ctx=>ctx.db.get(job!._id)))?.leaseToken).toBe(job!.leaseToken);
  vi.setSystemTime(job!.leaseExpiresAt!+1);
  await t.mutation(internal.eclipseMatches.expireAiLease,{matchId,expectedRevision:1,leaseToken:job!.leaseToken!});
  expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.aiStatus).toMatchObject({status:'failed',attempts:1});
  await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});
  const retry=await t.run(ctx=>ctx.db.get(job!._id));
  expect(retry).toMatchObject({status:'scheduled',remainingBudgetMs:0});
  await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:1,leaseToken:job!.leaseToken!,command:{type:'pass'},elapsedMs:1});
  expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(1);
 });
 it('persists room difficulty into the authoritative match without changing the solo waiting policy',async()=>{
  const t=convexTest(schema,modules);const guest=await t.action(api.eclipseGuests.createGuestSession,{});
  const room=await t.mutation(api.eclipseRooms.createRoom,{...guest,settings:{humanSeatCount:1,aiCount:1,timerMs:30_000,warpPortals:true,aiDifficulty:'hard'},faction:'hydran'});
  await t.mutation(api.eclipseRooms.setRoomReady,{...guest,roomToken:room.roomToken,ready:true});
  const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...guest,roomToken:room.roomToken});
  const match=await t.run(ctx=>ctx.db.get(matchId));
  expect(match).toMatchObject({aiDifficulty:'hard',aiVersion:'strategic-v1'});
  expect(await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique())).toBeNull();
 });

 it('retains the originating action budget while another seat owns a pending choice',async()=>{
  const {t,guest,matchId}=await setup();
  await t.run(async ctx=>{
   const match=await ctx.db.get(matchId);const state=JSON.parse(match!.snapshotJson) as GameState;
   state.engine!.action={owner:'seat-2',action:'influence',remaining:1};
   state.pendingDecision={id:'temporary-choice',kind:'free-technology',owner:'seat-1',technologyIds:[]};
   await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});
   const job=await ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();
   await ctx.db.patch(job!._id,{remainingBudgetMs:123,budgetActor:'seat-2',budgetRound:state.round});
  });
  await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});
  let job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  expect(job).toMatchObject({status:'waiting',remainingBudgetMs:123,budgetActor:'seat-2'});
  await t.run(async ctx=>{const match=await ctx.db.get(matchId);const state=JSON.parse(match!.snapshotJson) as GameState;state.pendingDecision=null;await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
  await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});
  job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  expect(job).toMatchObject({status:'scheduled',remainingBudgetMs:123,budgetActor:'seat-2'});
 });

 it('exposes only bounded telemetry for one requested match to internal diagnostics',async()=>{
  const {t,matchId}=await setup();
  const diagnostics=await t.query(internal.eclipseMatches.getAiDiagnostics,{matchId});
  expect(diagnostics).toMatchObject({difficulty:'expert',version:'strategic-v1',status:'scheduled',revision:1});
  expect(Object.keys(diagnostics!).sort()).toEqual(['attempts','difficulty','error','lastComputeMs','lastPlanComputeMs','lastPlanNodes','lastPlanDepth','lastPlanCutoff','lastSearchCutoff','lastSearchDepth','lastSearchNodes','remainingBudgetMs','revision','status','version'].sort());
 });

 it('retains the last searched plan telemetry after a zero-node follow-up decision',async()=>{
  const {t,matchId}=await setup();
  const {legalCommands}=await import('../../shared/eclipse/legal');
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:1});
  let job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  let work=await t.query(internal.eclipseMatches.getAiWork,{matchId,expectedRevision:1,leaseToken:job!.leaseToken!});
  const explore=legalCommands(work!.view).find(c=>c.command.type==='explore')!.command;
  await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:1,leaseToken:job!.leaseToken!,command:explore,elapsedMs:1234,searchNodes:12,searchDepth:2,searchCutoff:true});
  await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:2});
  job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
  work=await t.query(internal.eclipseMatches.getAiWork,{matchId,expectedRevision:2,leaseToken:job!.leaseToken!});
  await t.mutation(internal.eclipseMatches.commitAiWork,{matchId,expectedRevision:2,leaseToken:job!.leaseToken!,command:legalCommands(work!.view)[0].command,elapsedMs:4,searchNodes:0,searchDepth:0,searchCutoff:false});
  expect(await t.query(internal.eclipseMatches.getAiDiagnostics,{matchId})).toMatchObject({revision:3,lastComputeMs:4,lastSearchNodes:0,lastSearchDepth:0,lastSearchCutoff:false,lastPlanComputeMs:1234,lastPlanNodes:12,lastPlanDepth:2,lastPlanCutoff:true});
 });

});
