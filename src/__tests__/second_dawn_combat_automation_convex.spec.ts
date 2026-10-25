import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api,internal} from '../../convex/_generated/api';
import {advanceCombat} from '../../shared/eclipse/battleEngine';
import type {GameState} from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function fixture(room=false){
 const t=convexTest(schema,modules),guest=await t.action(api.eclipseGuests.createGuestSession,{}),other=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=room?await (async()=>{
  const {roomToken}=await t.mutation(api.eclipseRooms.createRoom,{...guest,faction:'terran-directorate',settings:{humanSeatCount:2,aiCount:0,timerMs:30000,warpPortals:true}});
  await t.mutation(api.eclipseRooms.joinRoom,{...other,roomToken,faction:'hydran'});
  for(const person of [guest,other])await t.mutation(api.eclipseRooms.setRoomReady,{...person,roomToken,ready:true});
  return t.mutation(api.eclipseRooms.startRoom,{...guest,roomToken});
 })():await t.mutation(api.eclipseMatches.createMatch,{...guest,aiCount:1});
 await t.run(async ctx=>{
  const match=(await ctx.db.get(matchId))!,state=JSON.parse(match.snapshotJson) as GameState;
  state.phase='combat';state.activeSeatId=null;state.pendingDecision=null;state.seats.forEach(seat=>{seat.controller='human';seat.passed=true;});
  const sector=state.sectors.find(s=>s.owner==='seat-1')!;
  state.ships=[{id:'mine',owner:'seat-1',type:'interceptor',sectorId:sector.id,damage:0,arrival:1},{id:'ancient',owner:'ancient',type:'ancient',sectorId:sector.id,damage:0,arrival:2}];
  state.engine!.battle=null;state.engine!.battleSectors=[];state.engine!.combatInitialized=false;advanceCombat(state,[]);
  await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state),phase:'combat'});
  const owner=(await ctx.db.query('eclipseOwnershipV1').collect())[0];
  const otherGuest=(await ctx.db.query('eclipseGuestsV1').collect()).find(g=>g._id!==owner.guestId)!;
  if(!room)await ctx.db.insert('eclipseOwnershipV1',{matchId,guestId:otherGuest._id,seatId:'seat-2'});
 });
 const view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 expect(view.pendingDecision?.kind).toBe('combat-turn');
 const args={...guest,matchId,battleId:view.battle!.id!,expectedRevision:view.revision,expectedControlVersion:0,requestId:'enable',enabled:true};
 const job={matchId,seatId:'seat-1',battleId:args.battleId,expectedRevision:0,controlVersion:1};
 return {t,guest,other,matchId,args,job};
}
it('defaults to manual, authenticates controls and exposes intent only to its owner',async()=>{
 const {t,guest,other,matchId,args}=await fixture();
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toBeNull();
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,credential:'invalid'})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,...other})).toMatchObject({ok:false,error:{code:'ILLEGAL_ACTION'}});
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,expectedRevision:99})).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,args)).toEqual({ok:true,duplicate:false});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toEqual({battleId:args.battleId,status:'running',reason:null,controlVersion:1});
 expect((await t.query(api.eclipseMatches.getMatchView,{...other,matchId}))?.combatAutomation).toBeNull();
});
it('commits one decision through the rules processor and deduplicates scheduled jobs and retries',async()=>{
 const {t,guest,matchId,args,job}=await fixture();
 await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,args)).toEqual({ok:true,duplicate:true});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 const after=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;expect(after.revision).toBe(1);
 const journal=await t.run(ctx=>ctx.db.query('eclipseJournalV1').collect());expect(journal).toHaveLength(1);
 expect(JSON.parse(journal[0].requestJson)).toMatchObject({expectedRevision:0,command:{type:'resolve',choice:{kind:'combat-turn',retreatTo:null}}});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(1);
});
it('pause invalidates future work, leaves accepted commands intact, and old enable retries cannot resume',async()=>{
 const {t,guest,matchId,args,job}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,enabled:false,expectedControlVersion:1,requestId:'pause'});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(0);
 await t.mutation(api.eclipseMatches.setCombatAutomation,args);expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:'paused',reason:'manual',controlVersion:2});
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,expectedControlVersion:1,requestId:'stale-tab'})).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,expectedControlVersion:2,requestId:'resume'});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,{...job,controlVersion:3});
 // The pause came from the pre-volley screen. Its stale game revision must not
 // prevent stopping future work after the scheduled volley wins that race.
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,enabled:false,expectedControlVersion:3,requestId:'pause-after-commit'})).toEqual({ok:true,duplicate:false});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:'paused',reason:'manual',controlVersion:4});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(1);
});
it('keeps manual fire authoritative when it wins a race against a scheduled worker',async()=>{
 const {t,guest,matchId,args,job}=await fixture();
 const before=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...guest,matchId,commandId:'manual-fire',expectedRevision:0,command:{type:'resolve',decisionId:before.pendingDecision!.id,choice:{kind:'combat-turn',retreatTo:null}}})).toMatchObject({ok:true,duplicate:false});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 vi.setSystemTime(Date.now()+30000);
 await t.mutation(internal.eclipseMatches.expireCombatAutomation,job);
 const after=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 expect(after.revision).toBe(1);
 expect(after.combatAutomation).toMatchObject({status:'running',controlVersion:1});
 const journal=await t.run(ctx=>ctx.db.query('eclipseJournalV1').collect());
 expect(journal).toHaveLength(1);expect(journal[0].commandId).toBe('manual-fire');
});
it('ignores workers and watchdogs from a previous enable generation after resuming',async()=>{
 const {t,guest,matchId,args,job}=await fixture();
 await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,enabled:false,expectedControlVersion:1,requestId:'pause'});
 await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,expectedControlVersion:2,requestId:'resume'});
 vi.setSystemTime(Date.now()+30000);
 await t.mutation(internal.eclipseMatches.expireCombatAutomation,job);
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 const after=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 expect(after.revision).toBe(0);expect(after.combatAutomation).toMatchObject({status:'running',controlVersion:3});
 expect(await t.run(ctx=>ctx.db.query('eclipseJournalV1').collect())).toHaveLength(0);
});
it('pauses on losses and does not resume after later unrelated updates',async()=>{
 const {t,guest,matchId,args,job}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.ships=state.ships.filter(s=>s.id!=='mine');await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:'paused',reason:'ship-loss'});
 await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(0);
});
it.each(['forced-retreat','special-decision','complete'] as const)('pauses or finishes for %s without answering the decision',async reason=>{
 const {t,guest,matchId,args,job}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;
  if(reason==='forced-retreat'&&state.pendingDecision?.kind==='combat-turn')state.pendingDecision.forcedRetreat=true;
  if(reason==='special-decision')state.pendingDecision={id:'special',owner:'seat-1',kind:'super-joker',battleId:args.battleId,dice:[],remaining:1};
  if(reason==='complete')state.engine!.battle!.id='next-battle';
  await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});
 });
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:reason==='complete'?'finished':'paused',reason});
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(0);
});
it('invalidates automation on resignation and rejects further controls',async()=>{
 const {t,guest,matchId,args,job}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 expect(await t.mutation(api.eclipseMatches.resignMatch,{...guest,matchId,commandId:'resign',expectedRevision:0})).toMatchObject({ok:true});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toBeNull();
 expect(await t.mutation(api.eclipseMatches.setCombatAutomation,{...args,expectedRevision:1,requestId:'late'})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
});

it('honors an expired multiplayer timer before a queued automatic volley',async()=>{
 const {t,guest,matchId,args,job}=await fixture(true);await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.run(async ctx=>{const timer=(await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique())!;await ctx.db.patch(timer._id,{deadlineAt:0});});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:'paused',reason:'timeout'});
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(0);
});
it('pauses during shared undo and clears intent on restoration, including delayed retries',async()=>{
 const {t,guest,other,matchId,args,job}=await fixture(true);await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 const undo=await t.mutation(api.eclipseRollback.requestRollback,{...guest,matchId,expectedRevision:1,targetRevision:1});
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:'paused',reason:'undo'});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,{...job,expectedRevision:1});
 await t.mutation(api.eclipseRollback.respondRollback,{...other,matchId,rollbackId:undo.pending!.id,approve:true});
 const restored=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 expect(restored.combatAutomation).toBeNull();expect(restored.pendingDecision?.kind).toBe('combat-turn');
 await t.mutation(api.eclipseMatches.setCombatAutomation,args);await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(restored.revision);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toBeNull();
});
it('pauses a broken allocation without committing or exposing server diagnostics',async()=>{
 const {t,guest,matchId,args,job}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.run(async ctx=>{const row=(await ctx.db.get(matchId))!,state=JSON.parse(row.snapshotJson) as GameState;state.pendingDecision={id:'broken',owner:'seat-1',kind:'combat-allocation',battleId:args.battleId,dice:[{id:'die',face:6,damage:1,targets:['missing'],hitTargets:['missing']}]};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toEqual({battleId:args.battleId,status:'paused',reason:'error',controlVersion:1});
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(0);
});
it('continues from scheduled server work without a connected client',async()=>{
 const {t,guest,matchId,args}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 await t.finishAllScheduledFunctions(vi.runAllTimers);
 const view=(await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))!;
 expect(view.revision).toBeGreaterThan(0);expect(view.combatAutomation?.status).not.toBe('running');
 expect(['ship-loss','complete','forced-retreat','special-decision']).toContain(view.combatAutomation?.reason);
 const history=await t.run(ctx=>ctx.db.query('eclipseJournalV1').collect());expect(new Set(history.map(row=>row.commandId)).size).toBe(history.length);
});

it('recovers a lost scheduled worker as a paused error without spending a choice',async()=>{
 const {t,guest,matchId,args,job}=await fixture();await t.mutation(api.eclipseMatches.setCombatAutomation,args);
 vi.setSystemTime(Date.now()+30000);
 await t.mutation(internal.eclipseMatches.expireCombatAutomation,job);
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.combatAutomation).toMatchObject({status:'paused',reason:'error'});
 await t.mutation(internal.eclipseMatches.runCombatAutomation,job);
 expect((await t.run(ctx=>ctx.db.get(matchId)))?.revision).toBe(0);
});
