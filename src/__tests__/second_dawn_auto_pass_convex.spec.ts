import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api,internal} from '../../convex/_generated/api';
import type {GameState} from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('persists an owned preference across devices and enforces identity, revision, and duplicate rules',async()=>{
 const t=convexTest(schema,modules),guest=await t.action(api.eclipseGuests.createGuestSession,{}),stranger=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...guest,aiCount:1});
 const registered=await t.action(api.eclipsePlayers.registerPlayer,{...guest,username:'Auto Pilot'});
 const recovered=await t.action(api.eclipsePlayers.loginPlayer,{username:'Auto Pilot',secret:registered.recoveryCode});
 const request={matchId,expectedRevision:0,commandId:'preference',command:{type:'set-auto-pass' as const,enabled:true}};
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...stranger,...request})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
 const accepted=await t.mutation(api.eclipseMatches.submitCommand,{credential:recovered.credential,...request});expect(accepted).toMatchObject({ok:true,duplicate:false});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,...request})).toMatchObject({ok:true,duplicate:true});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,...request,commandId:'stale'})).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 for(const credential of [guest.credential,recovered.credential]){
  const view=await t.query(api.eclipseMatches.getMatchView,{credential,matchId});
  expect(view?.seats[0].autoPassUnlessAttacked).toBe(true);expect(view?.seats[1].autoPassUnlessAttacked).toBeUndefined();expect(view?.activeSeatId).toBe('seat-1');
 }
 expect(await t.run(ctx=>ctx.db.query('eclipseJournalV1').withIndex('by_match_revision',q=>q.eq('matchId',matchId)).collect())).toHaveLength(1);
});
it('hands an enabled passed turn to AI and preserves its scheduled job against a stale worker',async()=>{
 const t=convexTest(schema,modules),guest=await t.action(api.eclipseGuests.createGuestSession,{}),{matchId}=await t.mutation(api.eclipseMatches.createMatch,{...guest,aiCount:1});
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.seats[0].passed=true;state.firstPasser='seat-1';await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,expectedRevision:0,commandId:'enable',command:{type:'set-auto-pass',enabled:true}})).toMatchObject({ok:true});
 const job=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique());
 expect(job).toMatchObject({status:'scheduled',expectedRevision:1});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.activeSeatId).toBe('seat-2');
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
 expect(await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique())).toEqual(job);
});
